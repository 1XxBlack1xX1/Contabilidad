package pe.contabilidad.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import pe.contabilidad.entity.Rol;
import pe.contabilidad.entity.Usuario;

import java.io.Serial;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Principal de seguridad. Se guarda en la sesión, por eso no contiene la entidad JPA. */
public final class UsuarioAutenticado implements UserDetails {

    @Serial
    private static final long serialVersionUID = 1L;

    private final Long id;
    private final String usuario;
    private final String nombreCompleto;
    private final String email;
    private final transient String passwordHash;
    private final boolean activo;
    private final List<String> roles;
    private final List<String> permisos;

    public UsuarioAutenticado(Usuario u) {
        this.id = u.getId();
        this.usuario = u.getNombreUsuario();
        this.nombreCompleto = u.getNombreCompleto();
        this.email = u.getEmail();
        this.passwordHash = u.getPasswordHash();
        this.activo = u.isActivo();
        this.roles = u.getRoles().stream().map(Rol::getCodigo).sorted().toList();
        this.permisos = List.copyOf(Permisos.deRoles(roles));
    }

    public Long getId() {
        return id;
    }

    public String getNombreCompleto() {
        return nombreCompleto;
    }

    public String getEmail() {
        return email;
    }

    public List<String> getRoles() {
        return roles;
    }

    public List<String> getPermisos() {
        return permisos;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<GrantedAuthority> autoridades = new ArrayList<>();
        roles.forEach(r -> autoridades.add(new SimpleGrantedAuthority("ROLE_" + r)));
        permisos.forEach(p -> autoridades.add(new SimpleGrantedAuthority(p)));
        return autoridades;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return usuario;
    }

    @Override
    public boolean isEnabled() {
        return activo;
    }

    @Override
    public String toString() {
        return "UsuarioAutenticado[" + usuario + "]";
    }
}
