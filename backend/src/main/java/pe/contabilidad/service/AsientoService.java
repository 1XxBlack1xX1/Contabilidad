package pe.contabilidad.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.ContabilidadDtos.AsientoCrearRequest;
import pe.contabilidad.dto.ContabilidadDtos.AsientoDto;
import pe.contabilidad.dto.ContabilidadDtos.AsientoResumenDto;
import pe.contabilidad.dto.ContabilidadDtos.LineaDto;
import pe.contabilidad.dto.ContabilidadDtos.LineaRequest;
import pe.contabilidad.dto.PaginaDto;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.AsientoContable;
import pe.contabilidad.entity.AsientoDetalle;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.EstadoAsiento;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.RecursoNoEncontradoException;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.repository.AsientoContableRepository;
import pe.contabilidad.repository.CuentaContableRepository;
import pe.contabilidad.security.UsuarioActual;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Registro de asientos por partida doble.
 * <ul>
 *   <li>Cada asiento tiene al menos dos líneas y la suma del debe es igual a la del haber.</li>
 *   <li>Solo se usan cuentas activas de último nivel (sin subcuentas) de la versión del catálogo elegida.</li>
 *   <li>La numeración es correlativa por año y no deja huecos.</li>
 *   <li>Un asiento registrado no se edita ni se elimina: se anula con motivo y se registra uno nuevo.</li>
 * </ul>
 * La base de datos vuelve a verificar el cuadre y la inmutabilidad al confirmar cada transacción.
 */
@Service
public class AsientoService {

    private static final int ESCALA = 2;

    private final AsientoContableRepository asientos;
    private final CuentaContableRepository cuentas;
    private final VersionPcgeService versiones;
    private final HistorialService historial;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public AsientoService(AsientoContableRepository asientos, CuentaContableRepository cuentas, VersionPcgeService versiones,
                          HistorialService historial, UsuarioActual usuarioActual, Clock reloj) {
        this.asientos = asientos;
        this.cuentas = cuentas;
        this.versiones = versiones;
        this.historial = historial;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public PaginaDto<AsientoResumenDto> listar(String codigoVersion, LocalDate desde, LocalDate hasta, EstadoAsiento estado,
                                              String termino, int pagina, int tamano) {
        VersionPcge version = versiones.resolver(codigoVersion);
        Specification<AsientoContable> spec = (r, q, cb) -> cb.equal(r.get("version").get("id"), version.getId());
        if (desde != null) spec = spec.and((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("fecha"), desde));
        if (hasta != null) spec = spec.and((r, q, cb) -> cb.lessThanOrEqualTo(r.get("fecha"), hasta));
        if (estado != null) spec = spec.and((r, q, cb) -> cb.equal(r.get("estado"), estado));
        String t = TextoUtil.limpiar(termino);
        if (t != null) {
            String patron = "%" + TextoUtil.escaparLike(TextoUtil.normalizar(t)) + "%";
            spec = spec.and((r, q, cb) -> cb.or(
                    cb.like(cb.function("f_normalizar", String.class, r.get("glosa")), patron, '\\'),
                    cb.like(cb.lower(cb.coalesce(r.get("documentoReferencia"), "")), patron, '\\'),
                    TextoUtil.esCodigo(t) ? cb.equal(r.get("numero"), Integer.parseInt(t.length() > 9 ? "0" : t)) : cb.disjunction()));
        }
        var page = asientos.findAll(spec, PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, 100),
                Sort.by(Sort.Order.desc("fecha"), Sort.Order.desc("anio"), Sort.Order.desc("numero"))));
        return PaginaDto.de(page, a -> new AsientoResumenDto(a.getId(), a.getNumeroCompleto(), a.getFecha(), a.getGlosa(),
                a.getDocumentoReferencia(), a.getTotalDebe(), a.getEstado(), a.getCreadoPor(), a.getCreadoEn()));
    }

    @Transactional(readOnly = true)
    public AsientoDto obtener(Long id) {
        return aDto(asientos.buscarConLineas(id).orElseThrow(() -> new RecursoNoEncontradoException("El asiento solicitado no existe.")));
    }

    // ------------------------------------------------------------------ registro y anulación

    @Transactional
    public AsientoDto crear(AsientoCrearRequest req) {
        VersionPcge version = versiones.resolver(req.version());
        LocalDate fecha = req.fecha();
        validarFecha(version, fecha);

        Map<Long, CuentaContable> porId = cuentas.findAllById(req.lineas().stream().map(LineaRequest::cuentaId).toList())
                .stream().collect(Collectors.toMap(CuentaContable::getId, Function.identity()));

        BigDecimal totalDebe = BigDecimal.ZERO;
        BigDecimal totalHaber = BigDecimal.ZERO;
        AsientoContable asiento = new AsientoContable();
        short n = 0;
        for (LineaRequest l : req.lineas()) {
            n++;
            String prefijo = "Línea " + n + ": ";
            CuentaContable cuenta = porId.get(l.cuentaId());
            if (cuenta == null || !cuenta.getVersion().getId().equals(version.getId())) {
                throw new ReglaNegocioException("lineas", prefijo + "la cuenta no pertenece al " + version.getNombre() + ".");
            }
            if (!cuenta.isActiva()) {
                throw new ReglaNegocioException("lineas", prefijo + "la cuenta " + cuenta.getCodigo() + " está inactiva.");
            }
            if (cuentas.countByPadreId(cuenta.getId()) > 0) {
                throw new ReglaNegocioException("lineas", prefijo + "la cuenta " + cuenta.getCodigo()
                        + " tiene subcuentas. Registre el movimiento en una cuenta de último nivel.");
            }
            BigDecimal debe = importe(l.debe());
            BigDecimal haber = importe(l.haber());
            if ((debe.signum() > 0) == (haber.signum() > 0)) {
                throw new ReglaNegocioException("lineas", prefijo + "indique un importe al debe o al haber (solo uno de los dos).");
            }
            AsientoDetalle d = new AsientoDetalle();
            d.setAsiento(asiento);
            d.setLinea(n);
            d.setCuenta(cuenta);
            d.setGlosa(TextoUtil.limpiar(l.glosa()));
            d.setDebe(debe);
            d.setHaber(haber);
            asiento.getLineas().add(d);
            totalDebe = totalDebe.add(debe);
            totalHaber = totalHaber.add(haber);
        }
        if (totalDebe.compareTo(totalHaber) != 0) {
            throw new ReglaNegocioException("lineas", "El asiento no cuadra: debe S/ " + totalDebe.toPlainString()
                    + " y haber S/ " + totalHaber.toPlainString() + " (diferencia S/ " + totalDebe.subtract(totalHaber).abs().toPlainString() + ").");
        }

        short anio = (short) fecha.getYear();
        asiento.setVersion(version);
        asiento.setAnio(anio);
        asiento.setNumero(asientos.siguienteNumero(anio));
        asiento.setFecha(fecha);
        asiento.setGlosa(TextoUtil.limpiar(req.glosa()));
        asiento.setDocumentoReferencia(TextoUtil.limpiar(req.documentoReferencia()));
        asiento.setTotalDebe(totalDebe);
        asiento.setTotalHaber(totalHaber);
        asiento.setCreadoPor(usuarioActual.nombreUsuario());
        asientos.saveAndFlush(asiento);

        Map<String, Object> detalle = new LinkedHashMap<>();
        detalle.put("fecha", fecha.toString());
        detalle.put("total", totalDebe);
        detalle.put("lineas", asiento.getLineas().size());
        historial.registrar("ASIENTO", asiento.getId(), null, version, AccionHistorial.CREACION,
                "Asiento " + asiento.getNumeroCompleto() + " registrado: " + asiento.getGlosa(), detalle, null);
        return aDto(asiento);
    }

    @Transactional
    public AsientoDto anular(Long id, String motivo) {
        AsientoContable a = asientos.buscarConLineas(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("El asiento solicitado no existe."));
        if (a.getEstado() == EstadoAsiento.ANULADO) {
            throw new ReglaNegocioException("El asiento " + a.getNumeroCompleto() + " ya está anulado.");
        }
        a.setEstado(EstadoAsiento.ANULADO);
        a.setMotivoAnulacion(motivo.trim());
        a.setAnuladoPor(usuarioActual.nombreUsuario());
        a.setAnuladoEn(Instant.now());
        asientos.saveAndFlush(a);
        historial.registrar("ASIENTO", a.getId(), null, a.getVersion(), AccionHistorial.ANULACION,
                "Asiento " + a.getNumeroCompleto() + " anulado", Map.of("total", a.getTotalDebe()), motivo.trim());
        return aDto(a);
    }

    // ------------------------------------------------------------------ apoyo

    /** No se admiten fechas futuras ni fechas fuera de la vigencia de la versión del catálogo. */
    private void validarFecha(VersionPcge version, LocalDate fecha) {
        if (fecha.isAfter(LocalDate.now(reloj))) {
            throw new ReglaNegocioException("fecha", "La fecha del asiento no puede ser posterior a hoy.");
        }
        if (version.isOficial() && version.getFechaFinVigencia() != null && fecha.isAfter(version.getFechaFinVigencia())) {
            throw new ReglaNegocioException("fecha", "El " + version.getNombre() + " no está vigente en esa fecha. Use la versión vigente.");
        }
        if (version.isOficial() && Boolean.FALSE.equals(version.getPermiteAplicacionAnticipada())
                && version.getFechaAplicacionObligatoria() != null && fecha.isBefore(version.getFechaAplicacionObligatoria())) {
            throw new ReglaNegocioException("fecha", "El " + version.getNombre() + " aún no es aplicable en esa fecha.");
        }
    }

    private static BigDecimal importe(BigDecimal valor) {
        return (valor == null ? BigDecimal.ZERO : valor).setScale(ESCALA, RoundingMode.UNNECESSARY);
    }

    static AsientoDto aDto(AsientoContable a) {
        List<LineaDto> lineas = a.getLineas().stream()
                .map(l -> new LineaDto(l.getLinea(), l.getCuenta().getId(), l.getCuenta().getCodigo(), l.getCuenta().getDenominacion(),
                        l.getGlosa(), l.getDebe(), l.getHaber()))
                .toList();
        return new AsientoDto(a.getId(), a.getNumeroCompleto(), a.getFecha(), a.getGlosa(), a.getDocumentoReferencia(),
                a.getMoneda(), a.getEstado(), a.getTotalDebe(), a.getTotalHaber(), a.getVersion().getCodigo(),
                a.getVersion().getNombre(), lineas, a.getMotivoAnulacion(), a.getAnuladoPor(), a.getAnuladoEn(),
                a.getCreadoPor(), a.getCreadoEn());
    }
}
