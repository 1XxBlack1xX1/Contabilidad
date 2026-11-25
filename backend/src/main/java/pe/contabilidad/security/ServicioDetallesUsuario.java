package pe.contabilidad.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.repository.UsuarioRepository;

@Service
public class ServicioDetallesUsuario implements UserDetailsService {

    private final UsuarioRepository usuarios;

    public ServicioDetallesUsuario(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usuarioOCorreo) {
        // Se puede ingresar con el nombre de usuario o con el correo electrónico.
        String valor = usuarioOCorreo.trim().toLowerCase();
        return (valor.contains("@") ? usuarios.findByEmailIgnoreCase(valor) : usuarios.findByNombreUsuario(valor))
                .map(UsuarioAutenticado::new)
                .orElseThrow(() -> new UsernameNotFoundException("Credenciales inválidas"));
    }
}
