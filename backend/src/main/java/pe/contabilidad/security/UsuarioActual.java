package pe.contabilidad.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** Acceso al usuario autenticado de la solicitud en curso. */
@Component
public class UsuarioActual {

    public Optional<UsuarioAutenticado> obtener() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UsuarioAutenticado u) {
            return Optional.of(u);
        }
        return Optional.empty();
    }

    public String nombreUsuario() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth == null ? "sistema" : auth.getName();
    }

    public Long id() {
        return obtener().map(UsuarioAutenticado::getId).orElse(null);
    }
}
