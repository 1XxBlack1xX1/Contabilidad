package pe.contabilidad.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.entity.Rol;
import pe.contabilidad.entity.Usuario;
import pe.contabilidad.repository.RolRepository;
import pe.contabilidad.repository.UsuarioRepository;

/**
 * Crea el primer administrador cuando la base de datos no tiene usuarios.
 * Las credenciales provienen de variables de entorno; nunca están escritas en el código
 * ni se imprimen en los registros.
 */
@Component
public class InicializadorAdministrador implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InicializadorAdministrador.class);

    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder encoder;
    private final String usuario;
    private final String nombre;
    private final String email;
    private final String password;

    public InicializadorAdministrador(UsuarioRepository usuarios, RolRepository roles, PasswordEncoder encoder,
                                      @Value("${app.admin-inicial.usuario:}") String usuario,
                                      @Value("${app.admin-inicial.nombre:Administrador del sistema}") String nombre,
                                      @Value("${app.admin-inicial.email:}") String email,
                                      @Value("${app.admin-inicial.password:}") String password) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.encoder = encoder;
        this.usuario = usuario.trim().toLowerCase();
        this.nombre = nombre;
        this.email = email.trim();
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (usuarios.count() > 0) {
            return;
        }
        if (usuario.isEmpty() || email.isEmpty() || password.length() < 12) {
            log.warn("No existen usuarios. Defina APP_ADMIN_USUARIO, APP_ADMIN_EMAIL y APP_ADMIN_PASSWORD "
                    + "(mínimo 12 caracteres) para crear el administrador inicial.");
            return;
        }
        Usuario admin = new Usuario();
        admin.setNombreUsuario(usuario);
        admin.setNombreCompleto(nombre);
        admin.setEmail(email);
        admin.setPasswordHash(encoder.encode(password));
        admin.getRoles().add(roles.findByCodigo(Rol.ADMINISTRADOR).orElseThrow());
        usuarios.save(admin);
        log.info("Administrador inicial '{}' creado.", usuario);
    }
}
