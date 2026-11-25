package pe.contabilidad.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.CambioEstadoRequest;
import pe.contabilidad.dto.CambioEstadoResultadoDto;
import pe.contabilidad.dto.CuentaActualizarRequest;
import pe.contabilidad.dto.CuentaCrearRequest;
import pe.contabilidad.dto.CuentaDetalleDto;
import pe.contabilidad.dto.CuentaNodoDto;
import pe.contabilidad.dto.CuentaResumenDto;
import pe.contabilidad.dto.ElementoArbolDto;
import pe.contabilidad.dto.ElementoDto;
import pe.contabilidad.dto.FiltroCuentas;
import pe.contabilidad.dto.PaginaDto;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.ElementoContable;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.ConflictoException;
import pe.contabilidad.exception.CuentaProtegidaException;
import pe.contabilidad.exception.RecursoNoEncontradoException;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.mapper.CuentaMapper;
import pe.contabilidad.repository.CuentaContableRepository;
import pe.contabilidad.repository.ElementoContableRepository;
import pe.contabilidad.security.UsuarioActual;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.IntStream;

/**
 * Reglas del catálogo de cuentas.
 * <ul>
 *   <li>Las cuentas oficiales e importadas no se modifican: solo se activan o desactivan.</li>
 *   <li>Las cuentas personalizadas se registran como hijas de una cuenta existente y activa,
 *       con un dígito más que su cuenta superior (p. ej. 1041 → 10411).</li>
 *   <li>Al desactivar una cuenta se desactivan también sus subcuentas; para activar una subcuenta,
 *       su cuenta superior debe estar activa.</li>
 *   <li>Todo cambio queda registrado en el historial.</li>
 * </ul>
 */
@Service
public class CuentaService {

    private static final Set<String> ORDENES_PERMITIDOS = Set.of("codigo", "denominacion", "nivel", "actualizadoEn");
    private static final int TAMANO_MAXIMO_PAGINA = 200;

    private final CuentaContableRepository cuentas;
    private final ElementoContableRepository elementos;
    private final VersionPcgeService versiones;
    private final HistorialService historial;
    private final CuentaMapper mapper;
    private final UsuarioActual usuarioActual;

    public CuentaService(CuentaContableRepository cuentas, ElementoContableRepository elementos, VersionPcgeService versiones,
                         HistorialService historial, CuentaMapper mapper, UsuarioActual usuarioActual) {
        this.cuentas = cuentas;
        this.elementos = elementos;
        this.versiones = versiones;
        this.historial = historial;
        this.mapper = mapper;
        this.usuarioActual = usuarioActual;
    }

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public PaginaDto<CuentaResumenDto> listar(FiltroCuentas filtro, int pagina, int tamano, String orden, boolean descendente) {
        VersionPcge version = versiones.resolver(filtro.version());
        String campo = ORDENES_PERMITIDOS.contains(orden) ? orden : "codigo";
        Sort sort = Sort.by(descendente ? Sort.Direction.DESC : Sort.Direction.ASC, campo);
        if (!"codigo".equals(campo)) {
            sort = sort.and(Sort.by("codigo"));
        }
        var page = cuentas.findAll(CuentaSpecifications.de(version.getId(), filtro),
                PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, TAMANO_MAXIMO_PAGINA), sort));
        return PaginaDto.de(page, mapper::aResumen);
    }

    /** Todas las cuentas que cumplen el filtro, en orden jerárquico (para exportaciones). */
    @Transactional(readOnly = true)
    public List<CuentaContable> listarTodas(VersionPcge version, FiltroCuentas filtro) {
        return cuentas.findAll(CuentaSpecifications.de(version.getId(), filtro), Sort.by("codigo"));
    }

    @Transactional(readOnly = true)
    public CuentaDetalleDto obtener(Long id) {
        return detalle(buscarPorId(id));
    }

    @Transactional(readOnly = true)
    public CuentaDetalleDto obtenerPorCodigo(String codigoVersion, String codigo) {
        VersionPcge version = versiones.resolver(codigoVersion);
        CuentaContable c = cuentas.findByVersionIdAndCodigo(version.getId(), codigo.trim())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "La cuenta " + codigo + " no existe en el " + version.getNombre() + "."));
        return detalle(c);
    }

    /**
     * Búsqueda rápida para el buscador global. Si el término es numérico busca por código
     * (prefijo); en otro caso, por palabras de la denominación sin distinguir tildes.
     * Prioriza coincidencias exactas y cuentas de menor nivel.
     */
    @Transactional(readOnly = true)
    public List<CuentaResumenDto> buscar(String codigoVersion, String termino, int limite) {
        return buscar(codigoVersion, termino, limite, false);
    }

    /** @param soloMovimiento solo cuentas activas sin subcuentas (las que admiten asientos) */
    @Transactional(readOnly = true)
    public List<CuentaResumenDto> buscar(String codigoVersion, String termino, int limite, boolean soloMovimiento) {
        String t = TextoUtil.limpiar(termino);
        if (t == null) {
            return List.of();
        }
        VersionPcge version = versiones.resolver(codigoVersion);
        int max = Math.clamp(limite, 1, 50);
        FiltroCuentas filtro = new FiltroCuentas(version.getCodigo(), t, null, null, FiltroCuentas.EstadoFiltro.TODAS, null, null);
        var spec = CuentaSpecifications.de(version.getId(), filtro);
        if (soloMovimiento) {
            spec = spec.and(CuentaSpecifications.deMovimiento());
        }
        List<CuentaContable> candidatas = cuentas.findAll(spec,
                PageRequest.of(0, 300, Sort.by("nivel", "codigo"))).getContent();
        String normalizado = TextoUtil.normalizar(t);
        Comparator<CuentaContable> relevancia = Comparator
                .comparingInt((CuentaContable c) -> TextoUtil.esCodigo(t)
                        ? (c.getCodigo().equals(t) ? 0 : 1)
                        : (TextoUtil.normalizar(c.getDenominacion()).equals(normalizado) ? 0
                        : TextoUtil.normalizar(c.getDenominacion()).startsWith(normalizado) ? 1 : 2))
                .thenComparingInt(CuentaContable::getNivel)
                .thenComparing(CuentaContable::getCodigo);
        return candidatas.stream().sorted(relevancia).limit(max).map(mapper::aResumen).toList();
    }

    /** Árbol completo de la versión: Elemento → Cuenta → Subcuenta → Divisionaria → Subdivisionaria. */
    @Transactional(readOnly = true)
    public List<ElementoArbolDto> arbol(String codigoVersion) {
        VersionPcge version = versiones.resolver(codigoVersion);
        List<CuentaContable> todas = cuentas.listarPorVersion(version.getId());

        Map<Long, List<CuentaContable>> hijosPorPadre = new HashMap<>();
        Map<Long, List<CuentaContable>> raicesPorElemento = new HashMap<>();
        for (CuentaContable c : todas) {
            Long padreId = c.getPadre() == null ? null : c.getPadre().getId();
            if (padreId == null) {
                raicesPorElemento.computeIfAbsent(c.getElemento().getId(), k -> new ArrayList<>()).add(c);
            } else {
                hijosPorPadre.computeIfAbsent(padreId, k -> new ArrayList<>()).add(c);
            }
        }
        Map<Long, Long> totales = new HashMap<>();
        todas.forEach(c -> totales.merge(c.getElemento().getId(), 1L, Long::sum));

        return elementos.findByVersionIdOrderByNumeroAsc(version.getId()).stream()
                .map(e -> new ElementoArbolDto(e.getId(), e.getNumero(), e.getDenominacion(),
                        totales.getOrDefault(e.getId(), 0L).intValue(),
                        raicesPorElemento.getOrDefault(e.getId(), List.of()).stream()
                                .map(c -> nodo(c, hijosPorPadre)).toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ElementoDto> elementos(String codigoVersion) {
        VersionPcge version = versiones.resolver(codigoVersion);
        Map<Long, Long> totales = new HashMap<>();
        cuentas.contarPorElemento(version.getId()).forEach(f -> totales.put((Long) f[0], (Long) f[1]));
        return elementos.findByVersionIdOrderByNumeroAsc(version.getId()).stream()
                .map(e -> mapper.aDto(e, totales.getOrDefault(e.getId(), 0L)))
                .toList();
    }

    // ------------------------------------------------------------------ modificaciones

    @Transactional
    public CuentaDetalleDto crear(CuentaCrearRequest req) {
        VersionPcge version = versiones.resolver(req.version());
        String codigo = req.codigo().trim();
        if (cuentas.existsByVersionIdAndCodigo(version.getId(), codigo)) {
            throw new ConflictoException("El código " + codigo + " ya existe en el " + version.getNombre() + ".");
        }
        ElementoContable elemento = elementos.findByVersionIdAndNumero(version.getId(), Short.parseShort(codigo.substring(0, 1)))
                .orElseThrow(() -> new ReglaNegocioException("codigo",
                        "El elemento " + codigo.charAt(0) + " no existe en el " + version.getNombre() + "."));

        CuentaContable padre = null;
        if (codigo.length() == 2) {
            // Solo se admiten cuentas de dos dígitos en elementos que el PCGE deja a criterio de la entidad (sin cuentas oficiales).
            boolean elementoSinCuentasBase = cuentas.findAll(CuentaSpecifications.de(version.getId(),
                    new FiltroCuentas(null, null, elemento.getNumero(), null, null, null, null))).stream()
                    .noneMatch(c -> c.getOrigen().esProtegida());
            if (!elementoSinCuentasBase) {
                throw new ReglaNegocioException("codigo", "Las cuentas de dos dígitos están reservadas por el PCGE. "
                        + "Registre la cuenta personalizada como subcuenta de una cuenta existente, con un dígito más "
                        + "que su cuenta superior (por ejemplo, 10411 bajo 1041).");
            }
        } else {
            String codigoPadre = codigo.substring(0, codigo.length() - 1);
            padre = cuentas.findByVersionIdAndCodigo(version.getId(), codigoPadre)
                    .orElseThrow(() -> new ReglaNegocioException("codigo", "No existe la cuenta superior " + codigoPadre
                            + ". El código de una cuenta personalizada debe tener un dígito más que su cuenta superior."));
            if (!padre.isActiva()) {
                throw new ReglaNegocioException("codigo", "La cuenta superior " + codigoPadre + " está inactiva. Actívela primero.");
            }
        }

        CuentaContable c = new CuentaContable();
        c.setVersion(version);
        c.setElemento(elemento);
        c.setPadre(padre);
        c.setCodigo(codigo);
        c.setNivel((short) codigo.length());
        c.setDenominacion(TextoUtil.limpiar(req.denominacion()));
        c.setDescripcion(TextoUtil.limpiar(req.descripcion()));
        c.setNaturaleza(req.naturaleza());
        c.setOrigen(OrigenCuenta.PERSONALIZADA);
        c.setActiva(true);
        c.setCreadoPor(usuarioActual.nombreUsuario());
        c.setActualizadoPor(usuarioActual.nombreUsuario());
        cuentas.saveAndFlush(c);

        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("codigo", c.getCodigo());
        detalle.put("denominacion", c.getDenominacion());
        detalle.put("cuentaSuperior", padre == null ? null : padre.getCodigo());
        detalle.put("naturaleza", c.getNaturaleza() == null ? null : c.getNaturaleza().name());
        historial.registrarCuenta(c, AccionHistorial.CREACION,
                "Cuenta personalizada " + c.getCodigo() + " – " + c.getDenominacion() + " registrada", detalle, null);
        return detalle(c);
    }

    @Transactional
    public CuentaDetalleDto actualizar(Long id, CuentaActualizarRequest req) {
        CuentaContable c = buscarPorId(id);
        if (c.getOrigen().esProtegida()) {
            throw new CuentaProtegidaException(c.getCodigo());
        }
        if (c.getVersionRegistro() != req.versionRegistro()) {
            throw new ConflictoException("Otra persona modificó esta cuenta mientras usted la editaba. Recargue la información.");
        }
        Map<String, Object> cambios = new LinkedHashMap<>();
        registrarCambio(cambios, "denominacion", c.getDenominacion(), TextoUtil.limpiar(req.denominacion()));
        registrarCambio(cambios, "descripcion", c.getDescripcion(), TextoUtil.limpiar(req.descripcion()));
        registrarCambio(cambios, "naturaleza", c.getNaturaleza() == null ? null : c.getNaturaleza().name(),
                req.naturaleza() == null ? null : req.naturaleza().name());
        if (cambios.isEmpty()) {
            return detalle(c);
        }
        c.setDenominacion(TextoUtil.limpiar(req.denominacion()));
        c.setDescripcion(TextoUtil.limpiar(req.descripcion()));
        c.setNaturaleza(req.naturaleza());
        c.setActualizadoPor(usuarioActual.nombreUsuario());
        cuentas.saveAndFlush(c);
        historial.registrarCuenta(c, AccionHistorial.MODIFICACION,
                "Cuenta " + c.getCodigo() + " modificada (" + String.join(", ", cambios.keySet()) + ")", cambios, null);
        return detalle(c);
    }

    @Transactional
    public CambioEstadoResultadoDto cambiarEstado(Long id, CambioEstadoRequest req) {
        CuentaContable c = buscarPorId(id);
        boolean activar = req.activa();
        String motivo = req.motivo().trim();
        if (c.isActiva() == activar) {
            throw new ReglaNegocioException("La cuenta " + c.getCodigo() + " ya está " + (activar ? "activa." : "inactiva."));
        }
        List<CuentaContable> afectadas = new ArrayList<>();
        if (activar) {
            if (c.getPadre() != null && !c.getPadre().isActiva()) {
                throw new ReglaNegocioException("No se puede activar " + c.getCodigo() + " porque su cuenta superior "
                        + c.getPadre().getCodigo() + " está inactiva.");
            }
            afectadas.add(c);
        } else {
            afectadas.add(c);
            cuentas.buscarDescendientes(c.getVersion().getId(), c.getCodigo()).stream()
                    .filter(CuentaContable::isActiva).forEach(afectadas::add);
        }
        String usuario = usuarioActual.nombreUsuario();
        for (CuentaContable a : afectadas) {
            a.setActiva(activar);
            a.setActualizadoPor(usuario);
        }
        cuentas.saveAllAndFlush(afectadas);

        AccionHistorial accion = activar ? AccionHistorial.ACTIVACION : AccionHistorial.DESACTIVACION;
        for (CuentaContable a : afectadas) {
            String resumen = a == c
                    ? "Cuenta " + a.getCodigo() + (activar ? " activada" : " desactivada")
                    : "Cuenta " + a.getCodigo() + " desactivada junto con su cuenta superior " + c.getCodigo();
            historial.registrarCuenta(a, accion, resumen, Map.of("activa", Map.of("antes", !activar, "despues", activar)), motivo);
        }
        return new CambioEstadoResultadoDto(detalle(c), afectadas.stream().map(CuentaContable::getCodigo).toList());
    }

    // ------------------------------------------------------------------ apoyo

    CuentaContable buscarPorId(Long id) {
        return cuentas.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("La cuenta solicitada no existe."));
    }

    private CuentaDetalleDto detalle(CuentaContable c) {
        // En el PCGE cada ancestro es un prefijo del código: 1041 → 10, 104.
        List<String> prefijos = IntStream.range(2, c.getCodigo().length()).mapToObj(i -> c.getCodigo().substring(0, i)).toList();
        List<CuentaContable> ruta = prefijos.isEmpty() ? List.of()
                : cuentas.findByVersionIdAndCodigoInOrderByCodigoAsc(c.getVersion().getId(), prefijos);
        return mapper.aDetalle(c, ruta, cuentas.findByPadreIdOrderByCodigoAsc(c.getId()));
    }

    private CuentaNodoDto nodo(CuentaContable c, Map<Long, List<CuentaContable>> hijosPorPadre) {
        return mapper.aNodo(c, hijosPorPadre.getOrDefault(c.getId(), List.of()).stream().map(h -> nodo(h, hijosPorPadre)).toList());
    }

    private static void registrarCambio(Map<String, Object> cambios, String campo, Object antes, Object despues) {
        if (!Objects.equals(antes, despues)) {
            Map<String, Object> par = new HashMap<>();
            par.put("antes", antes);
            par.put("despues", despues);
            cambios.put(campo, par);
        }
    }
}
