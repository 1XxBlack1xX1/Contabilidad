package pe.contabilidad.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.HistorialDto;
import pe.contabilidad.dto.PaginaDto;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.HistorialCambio;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.mapper.HistorialMapper;
import pe.contabilidad.repository.HistorialCambioRepository;
import pe.contabilidad.repository.UsuarioRepository;
import pe.contabilidad.security.UsuarioActual;

import java.util.Map;

/** Registro y consulta de la auditoría de cambios. */
@Service
public class HistorialService {

    private final HistorialCambioRepository repositorio;
    private final UsuarioRepository usuarios;
    private final UsuarioActual usuarioActual;
    private final HistorialMapper mapper;

    public HistorialService(HistorialCambioRepository repositorio, UsuarioRepository usuarios, UsuarioActual usuarioActual,
                            HistorialMapper mapper) {
        this.repositorio = repositorio;
        this.usuarios = usuarios;
        this.usuarioActual = usuarioActual;
        this.mapper = mapper;
    }

    @Transactional
    public void registrarCuenta(CuentaContable cuenta, AccionHistorial accion, String resumen, Map<String, Object> detalle,
                                String motivo) {
        registrar("CUENTA_CONTABLE", cuenta.getId(), cuenta, cuenta.getVersion(), accion, resumen, detalle, motivo);
    }

    @Transactional
    public void registrar(String entidad, Long entidadId, CuentaContable cuenta, VersionPcge version, AccionHistorial accion,
                          String resumen, Map<String, Object> detalle, String motivo) {
        HistorialCambio h = new HistorialCambio();
        h.setEntidad(entidad);
        h.setEntidadId(entidadId);
        h.setCuenta(cuenta);
        h.setVersion(version);
        h.setAccion(accion);
        h.setResumen(resumen.length() > 300 ? resumen.substring(0, 297) + "..." : resumen);
        h.setDetalle(detalle);
        h.setMotivo(motivo);
        Long idUsuario = usuarioActual.id();
        if (idUsuario != null) {
            h.setUsuario(usuarios.getReferenceById(idUsuario));
        }
        h.setNombreUsuario(usuarioActual.nombreUsuario());
        repositorio.save(h);
    }

    @Transactional(readOnly = true)
    public PaginaDto<HistorialDto> deCuenta(Long cuentaId, int pagina, int tamano) {
        return PaginaDto.de(repositorio.findByCuentaIdOrderByFechaDescIdDesc(cuentaId, pagina(pagina, tamano)), mapper::aDto);
    }

    @Transactional(readOnly = true)
    public PaginaDto<HistorialDto> recientes(Long versionId, int pagina, int tamano) {
        var page = versionId == null
                ? repositorio.findAllByOrderByFechaDescIdDesc(pagina(pagina, tamano))
                : repositorio.findByVersionIdOrderByFechaDescIdDesc(versionId, pagina(pagina, tamano));
        return PaginaDto.de(page, mapper::aDto);
    }

    private static PageRequest pagina(int pagina, int tamano) {
        return PageRequest.of(Math.max(pagina, 0), Math.clamp(tamano, 1, 100));
    }
}
