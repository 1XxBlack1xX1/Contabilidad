package pe.contabilidad;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import pe.contabilidad.entity.Rol;
import pe.contabilidad.entity.Usuario;
import pe.contabilidad.repository.RolRepository;
import pe.contabilidad.repository.UsuarioRepository;

import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Inicio de sesión con nombre de usuario o correo electrónico. */
@AutoConfigureMockMvc
class AutenticacionIT extends IntegracionBase {

    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired RolRepository roles;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void crearUsuario() {
        if (usuarios.existsByNombreUsuario("prueba.login")) {
            return;
        }
        Usuario u = new Usuario();
        u.setNombreUsuario("prueba.login");
        u.setNombreCompleto("Usuario de prueba");
        u.setEmail("prueba.login@upeu.edu.pe");
        u.setPasswordHash(encoder.encode("Clave-Segura-2026"));
        u.getRoles().add(roles.findByCodigo(Rol.CONTADOR).orElseThrow());
        usuarios.save(u);
    }

    private String cuerpo(String usuario, String clave) {
        return "{\"usuario\":\"" + usuario + "\",\"password\":\"" + clave + "\"}";
    }

    @Test
    void ingresaConNombreDeUsuario() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(cuerpo("prueba.login", "Clave-Segura-2026")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario", is("prueba.login")));
    }

    @Test
    void ingresaConCorreoSinDistinguirMayusculas() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(cuerpo("Prueba.Login@UPEU.edu.pe", "Clave-Segura-2026")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario", is("prueba.login")))
                .andExpect(jsonPath("$.roles[0]", is("CONTADOR")));
    }

    @Test
    void rechazaContrasenaIncorrectaConMensajeGenerico() throws Exception {
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(cuerpo("prueba.login@upeu.edu.pe", "incorrecta")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje", is("Usuario o contraseña incorrectos.")));
    }
}
