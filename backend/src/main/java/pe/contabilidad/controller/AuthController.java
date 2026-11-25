package pe.contabilidad.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.contabilidad.dto.ErrorRespuesta;
import pe.contabilidad.dto.LoginRequest;
import pe.contabilidad.dto.UsuarioSesionDto;
import pe.contabilidad.security.ControlIntentosLogin;
import pe.contabilidad.security.UsuarioActual;
import pe.contabilidad.security.UsuarioAutenticado;
import pe.contabilidad.service.UsuarioService;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager autenticacion;
    private final SecurityContextRepository repositorioContexto;
    private final ControlIntentosLogin intentos;
    private final UsuarioService usuarios;
    private final UsuarioActual usuarioActual;

    public AuthController(AuthenticationManager autenticacion, SecurityContextRepository repositorioContexto,
                          ControlIntentosLogin intentos, UsuarioService usuarios, UsuarioActual usuarioActual) {
        this.autenticacion = autenticacion;
        this.repositorioContexto = repositorioContexto;
        this.intentos = intentos;
        this.usuarios = usuarios;
        this.usuarioActual = usuarioActual;
    }

    @GetMapping("/csrf")
    @Operation(summary = "Emite el token CSRF (cookie XSRF-TOKEN) para la aplicación web")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("cabecera", token.getHeaderName());
    }

    @PostMapping("/login")
    @Operation(summary = "Inicia sesión")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        String usuario = req.usuario().trim().toLowerCase();
        if (intentos.estaBloqueado(usuario)) {
            return error(HttpStatus.TOO_MANY_REQUESTS, request, "Demasiados intentos fallidos. Espere "
                    + intentos.minutosBloqueo() + " minutos antes de volver a intentarlo.");
        }
        try {
            Authentication auth = autenticacion.authenticate(new UsernamePasswordAuthenticationToken(usuario, req.password()));
            // Previene la fijación de sesión: se descarta la sesión anterior y se crea una nueva.
            HttpSession anterior = request.getSession(false);
            if (anterior != null) {
                anterior.invalidate();
            }
            request.getSession(true);
            SecurityContext contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(auth);
            SecurityContextHolder.setContext(contexto);
            repositorioContexto.saveContext(contexto, request, response);
            intentos.registrarExito(usuario);
            UsuarioAutenticado u = (UsuarioAutenticado) auth.getPrincipal();
            usuarios.registrarAcceso(u.getId());
            log.info("Inicio de sesión: {}", usuario);
            return ResponseEntity.ok(sesion(u));
        } catch (AuthenticationException e) {
            intentos.registrarFallo(usuario);
            log.info("Inicio de sesión fallido: {}", usuario);
            // Mensaje genérico: no revela si el usuario existe o si está deshabilitado.
            return error(HttpStatus.UNAUTHORIZED, request, "Usuario o contraseña incorrectos.");
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Cierra la sesión")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        HttpSession sesion = request.getSession(false);
        if (sesion != null) {
            sesion.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sesion")
    @Operation(summary = "Datos del usuario con sesión iniciada")
    public UsuarioSesionDto actual() {
        return sesion(usuarioActual.obtener().orElseThrow());
    }

    private static UsuarioSesionDto sesion(UsuarioAutenticado u) {
        return new UsuarioSesionDto(u.getId(), u.getUsername(), u.getNombreCompleto(), u.getEmail(), u.getRoles(), u.getPermisos());
    }

    private static ResponseEntity<ErrorRespuesta> error(HttpStatus estado, HttpServletRequest req, String mensaje) {
        return ResponseEntity.status(estado)
                .body(new ErrorRespuesta(estado.value(), estado.getReasonPhrase(), mensaje, null, req.getRequestURI(), Instant.now()));
    }
}
