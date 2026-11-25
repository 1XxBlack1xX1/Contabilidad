package pe.contabilidad.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.ImportacionConfirmarRequest;
import pe.contabilidad.dto.ImportacionVistaPreviaDto;
import pe.contabilidad.dto.ImportacionVistaPreviaDto.FilaVistaPrevia;
import pe.contabilidad.dto.ImportacionVistaPreviaDto.Incidencia;
import pe.contabilidad.dto.VersionPcgeDto;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.ElementoContable;
import pe.contabilidad.entity.FuenteNormativa;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.TipoFuente;
import pe.contabilidad.entity.TipoNivel;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.ConflictoException;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.repository.CuentaContableRepository;
import pe.contabilidad.repository.ElementoContableRepository;
import pe.contabilidad.repository.FuenteNormativaRepository;
import pe.contabilidad.repository.VersionPcgeRepository;
import pe.contabilidad.security.UsuarioActual;
import pe.contabilidad.service.LectorArchivoCatalogo.Fila;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;

/**
 * Importación de catálogos desde archivos estructurados, en dos pasos:
 * <ol>
 *   <li>Vista previa: valida estructura, códigos duplicados y jerarquía, sin modificar la base.</li>
 *   <li>Confirmación: vuelve a validar el mismo archivo (comprobado por su huella SHA-256) y lo
 *       carga como una versión nueva, marcada como no oficial y con su fuente documentada.</li>
 * </ol>
 * Una importación nunca modifica ni mezcla versiones existentes.
 */
@Service
public class ImportacionService {

    private static final Pattern CODIGO = Pattern.compile("^[0-9]{1,10}$");
    private static final int FILAS_MUESTRA = 40;
    private static final int INCIDENCIAS_MAXIMAS = 200;

    private final LectorArchivoCatalogo lector;
    private final VersionPcgeRepository versiones;
    private final FuenteNormativaRepository fuentes;
    private final ElementoContableRepository elementos;
    private final CuentaContableRepository cuentas;
    private final VersionPcgeService versionService;
    private final HistorialService historial;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public ImportacionService(LectorArchivoCatalogo lector, VersionPcgeRepository versiones, FuenteNormativaRepository fuentes,
                              ElementoContableRepository elementos, CuentaContableRepository cuentas,
                              VersionPcgeService versionService, HistorialService historial, UsuarioActual usuarioActual,
                              Clock reloj) {
        this.lector = lector;
        this.versiones = versiones;
        this.fuentes = fuentes;
        this.elementos = elementos;
        this.cuentas = cuentas;
        this.versionService = versionService;
        this.historial = historial;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    /** Resultado interno de la validación. */
    record Validacion(ImportacionVistaPreviaDto vistaPrevia, List<Fila> elementos, List<Fila> cuentas) {
    }

    public ImportacionVistaPreviaDto vistaPrevia(String nombreArchivo, byte[] contenido) {
        return validar(nombreArchivo, contenido).vistaPrevia();
    }

    @Transactional
    public VersionPcgeDto confirmar(String nombreArchivo, byte[] contenido, ImportacionConfirmarRequest req) {
        Validacion v = validar(nombreArchivo, contenido);
        ImportacionVistaPreviaDto vp = v.vistaPrevia();
        if (!vp.sha256().equals(req.sha256Revisado())) {
            throw new ReglaNegocioException("archivo", "El archivo no coincide con el revisado en la vista previa. Vuelva a validarlo.");
        }
        if (!vp.valido()) {
            throw new ReglaNegocioException("archivo", "El archivo tiene errores. Corríjalos antes de importar.");
        }
        if (versiones.existsByCodigo(req.codigo())) {
            throw new ConflictoException("Ya existe una versión con el código " + req.codigo() + ".");
        }

        VersionPcge version = new VersionPcge();
        version.setCodigo(req.codigo());
        version.setNombre(req.nombre().trim());
        version.setDescripcion(TextoUtil.limpiar(req.descripcion()));
        version.setOficial(false);
        version.setPredeterminada(false);
        version.setNotas(TextoUtil.limpiar(req.notas()));
        versiones.save(version);

        FuenteNormativa fuente = new FuenteNormativa();
        fuente.setVersion(version);
        fuente.setTipo(TipoFuente.ARCHIVO_IMPORTADO);
        fuente.setTitulo(req.fuenteTitulo().trim());
        fuente.setUrl(TextoUtil.limpiar(req.fuenteUrl()));
        fuente.setNombreArchivo(nombreArchivo);
        fuente.setSha256(vp.sha256());
        fuente.setFechaConsulta(LocalDate.now(reloj));
        fuente.setVerificada(false);
        fuente.setNotas("Importado por " + usuarioActual.nombreUsuario() + ". No verificado como fuente oficial.");
        fuentes.save(fuente);
        version.getFuentes().add(fuente);

        Map<Short, ElementoContable> mapaElementos = new HashMap<>();
        for (Fila f : v.elementos()) {
            ElementoContable e = new ElementoContable();
            e.setVersion(version);
            e.setNumero(Short.parseShort(f.codigo()));
            e.setDenominacion(TextoUtil.limpiar(f.denominacion()));
            e.setDescripcion(TextoUtil.limpiar(f.descripcion()));
            e.setSeccionFuente("Archivo importado, fila " + f.numero());
            mapaElementos.put(e.getNumero(), elementos.save(e));
        }

        Map<String, CuentaContable> porCodigo = new HashMap<>();
        String usuario = usuarioActual.nombreUsuario();
        List<Fila> ordenadas = v.cuentas().stream()
                .sorted(Comparator.comparingInt((Fila f) -> f.codigo().length()).thenComparing(Fila::codigo)).toList();
        for (Fila f : ordenadas) {
            CuentaContable c = new CuentaContable();
            c.setVersion(version);
            c.setElemento(mapaElementos.get(Short.parseShort(f.codigo().substring(0, 1))));
            c.setPadre(f.codigo().length() > 2 ? porCodigo.get(f.codigo().substring(0, f.codigo().length() - 1)) : null);
            c.setCodigo(f.codigo());
            c.setNivel((short) f.codigo().length());
            c.setDenominacion(TextoUtil.limpiar(f.denominacion()));
            c.setDescripcion(TextoUtil.limpiar(f.descripcion()));
            c.setOrigen(OrigenCuenta.IMPORTADA);
            c.setSeccionFuente("Archivo importado, fila " + f.numero());
            c.setCreadoPor(usuario);
            c.setActualizadoPor(usuario);
            porCodigo.put(f.codigo(), cuentas.save(c));
        }
        cuentas.flush();

        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("archivo", nombreArchivo);
        detalle.put("sha256", vp.sha256());
        detalle.put("elementos", vp.totalElementos());
        detalle.put("cuentas", vp.totalCuentas());
        detalle.put("cuentasPorNivel", vp.cuentasPorNivel());
        historial.registrar("VERSION_PCGE", version.getId(), null, version, AccionHistorial.IMPORTACION,
                "Catálogo importado desde " + nombreArchivo + " como versión " + version.getCodigo(), detalle, null);
        return versionService.obtener(version.getCodigo());
    }

    Validacion validar(String nombreArchivo, byte[] contenido) {
        if (contenido == null || contenido.length == 0) {
            throw new ReglaNegocioException("archivo", "Seleccione un archivo para importar.");
        }
        LectorArchivoCatalogo.Lectura lectura = lector.leer(nombreArchivo, contenido);
        List<Incidencia> errores = new ArrayList<>();
        List<Incidencia> advertencias = new ArrayList<>();
        if (!lectura.columnasIgnoradas().isEmpty()) {
            advertencias.add(new Incidencia(1, null, "Se ignorarán las columnas: " + String.join(", ", lectura.columnasIgnoradas())));
        }

        Map<String, Fila> vistos = new LinkedHashMap<>();
        for (Fila f : lectura.filas()) {
            String codigo = f.codigo();
            if (codigo.isEmpty()) {
                agregar(errores, new Incidencia(f.numero(), null, "Falta el código."));
                continue;
            }
            if (!CODIGO.matcher(codigo).matches()) {
                agregar(errores, new Incidencia(f.numero(), codigo, "El código debe contener solo dígitos (de 1 a 10)."));
                continue;
            }
            if (f.denominacion().isEmpty()) {
                agregar(errores, new Incidencia(f.numero(), codigo, "Falta la denominación."));
            } else if (f.denominacion().length() > 300) {
                agregar(errores, new Incidencia(f.numero(), codigo, "La denominación supera los 300 caracteres."));
            }
            if (f.codigoNumericoEnExcel() && codigo.length() > 1) {
                agregar(advertencias, new Incidencia(f.numero(), codigo,
                        "El código está guardado como número en Excel; si tenía ceros a la izquierda se habrán perdido."));
            }
            Fila previa = vistos.putIfAbsent(codigo, f);
            if (previa != null) {
                agregar(errores, new Incidencia(f.numero(), codigo, "Código duplicado (también en la fila " + previa.numero() + ")."));
            }
        }

        List<Fila> filasElementos = vistos.values().stream().filter(f -> f.codigo().length() == 1).toList();
        List<Fila> filasCuentas = vistos.values().stream().filter(f -> f.codigo().length() > 1).toList();
        if (filasElementos.isEmpty()) {
            agregar(errores, new Incidencia(null, null,
                    "El archivo no define elementos. Incluya filas con código de un dígito (p. ej. 1, ACTIVO DISPONIBLE Y EXIGIBLE)."));
        }
        for (Fila f : filasCuentas) {
            String elemento = f.codigo().substring(0, 1);
            if (!vistos.containsKey(elemento)) {
                agregar(errores, new Incidencia(f.numero(), f.codigo(), "No existe el elemento " + elemento + " en el archivo."));
            }
            if (f.codigo().length() > 2) {
                String padre = f.codigo().substring(0, f.codigo().length() - 1);
                if (!vistos.containsKey(padre)) {
                    agregar(errores, new Incidencia(f.numero(), f.codigo(), "No existe la cuenta superior " + padre + " en el archivo."));
                }
            }
        }

        Map<String, Long> porNivel = new TreeMap<>(Comparator.comparingInt(ImportacionService::ordenNivel));
        filasCuentas.forEach(f -> porNivel.merge(TipoNivel.desdeDigitos(f.codigo().length()).etiqueta(), 1L, Long::sum));
        List<FilaVistaPrevia> muestra = vistos.values().stream().limit(FILAS_MUESTRA)
                .map(f -> new FilaVistaPrevia(f.numero(), f.codigo(), f.denominacion(),
                        TipoNivel.desdeDigitos(f.codigo().length()).etiqueta(),
                        f.codigo().length() > 1 ? f.codigo().substring(0, f.codigo().length() - 1) : null))
                .toList();

        ImportacionVistaPreviaDto vp = new ImportacionVistaPreviaDto(nombreArchivo, sha256(contenido), lectura.filas().size(),
                filasElementos.size(), filasCuentas.size(), porNivel, errores, advertencias, muestra, errores.isEmpty());
        return new Validacion(vp, filasElementos, filasCuentas);
    }

    private static int ordenNivel(String etiqueta) {
        for (TipoNivel t : TipoNivel.values()) {
            if (t.etiqueta().equals(etiqueta)) {
                return t.ordinal();
            }
        }
        return 99;
    }

    private static void agregar(List<Incidencia> lista, Incidencia i) {
        if (lista.size() < INCIDENCIAS_MAXIMAS) {
            lista.add(i);
        }
    }

    static String sha256(byte[] contenido) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenido));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
