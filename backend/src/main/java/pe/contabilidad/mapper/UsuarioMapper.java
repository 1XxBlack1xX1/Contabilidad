package pe.contabilidad.mapper;

import org.springframework.stereotype.Component;
import pe.contabilidad.dto.RolDto;
import pe.contabilidad.dto.UsuarioDto;
import pe.contabilidad.entity.Rol;
import pe.contabilidad.entity.Usuario;

@Component
public class UsuarioMapper {

    public UsuarioDto aDto(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombreUsuario(), u.getNombreCompleto(), u.getEmail(), u.isActivo(),
                u.getRoles().stream().map(Rol::getCodigo).sorted().toList(), u.getUltimoAcceso(), u.getCreadoEn());
    }

    public RolDto aDto(Rol r) {
        return new RolDto(r.getCodigo(), r.getNombre(), r.getDescripcion());
    }
}
