package pe.contabilidad.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.RolDto;
import pe.contabilidad.dto.UsuarioActualizarRequest;
import pe.contabilidad.dto.UsuarioCrearRequest;
import pe.contabilidad.dto.UsuarioDto;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.Rol;
import pe.contabilidad.entity.Usuario;
import pe.contabilidad.exception.ConflictoException;
import pe.contabilidad.exception.RecursoNoEncontradoException;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.mapper.UsuarioMapper;
import pe.contabilidad.repository.RolRepository;
import pe.contabilidad.repository.UsuarioRepository;
import pe.contabilidad.security.UsuarioActual;

import java.time.Instant;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final RolRepository roles;
    private final PasswordEncoder encoder;
    private final UsuarioMapper mapper;
    private final HistorialService historial;
    private final UsuarioActual usuarioActual;

    public UsuarioService(UsuarioRepository usuarios, RolRepository roles, PasswordEncoder encoder, UsuarioMapper mapper,
                          HistorialService historial, UsuarioActual usuarioActual) {
        this.usuarios = usuarios;
        this.roles = roles;
        this.encoder = encoder;
        this.mapper = mapper;
        this.historial = historial;
        this.usuarioActual = usuarioActual;
    }

    @Transactional(readOnly = true)
    public List<UsuarioDto> listar() {
        return usuarios.listarConRoles().stream().map(mapper::aDto).toList();
    }

    @Transactional(readOnly = true)
    public List<RolDto> roles() {
        return roles.findAll().stream().map(mapper::aDto).toList();
    }

    @Transactional
    public UsuarioDto crear(UsuarioCrearRequest req) {
        String nombre = req.usuario().trim().toLowerCase();
        if (usuarios.existsByNombreUsuario(nombre)) {
            throw new ConflictoException("El usuario '" + nombre + "' ya existe.");
        }
        if (usuarios.existeEmail(req.email().trim(), null)) {
            throw new ConflictoException("Ya existe un usuario con ese correo electrónico.");
        }
        Usuario u = new Usuario();
        u.setNombreUsuario(nombre);
        u.setNombreCompleto(req.nombreCompleto().trim());
        u.setEmail(req.email().trim());
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRoles(resolverRoles(req.roles()));
        usuarios.save(u);
        historial.registrar("USUARIO", u.getId(), null, null, AccionHistorial.CREACION,
                "Usuario " + nombre + " creado", Map.of("roles", req.roles()), null);
        return mapper.aDto(u);
    }

    @Transactional
    public UsuarioDto actualizar(Long id, UsuarioActualizarRequest req) {
        Usuario u = usuarios.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("El usuario no existe."));
        Set<Rol> nuevosRoles = resolverRoles(req.roles());
        boolean esAdminHoy = u.getRoles().stream().anyMatch(r -> Rol.ADMINISTRADOR.equals(r.getCodigo())) && u.isActivo();
        boolean seguiraAdmin = nuevosRoles.stream().anyMatch(r -> Rol.ADMINISTRADOR.equals(r.getCodigo())) && req.activo();
        if (Objects.equals(id, usuarioActual.id()) && !seguiraAdmin && esAdminHoy) {
            throw new ReglaNegocioException("No puede quitarse a sí mismo el rol de administrador ni desactivar su propia cuenta.");
        }
        if (esAdminHoy && !seguiraAdmin && usuarios.contarActivosConRol(Rol.ADMINISTRADOR) <= 1) {
            throw new ReglaNegocioException("Debe existir al menos un administrador activo.");
        }
        if (usuarios.existeEmail(req.email().trim(), id)) {
            throw new ConflictoException("Ya existe un usuario con ese correo electrónico.");
        }
        Map<String, Object> cambios = new LinkedHashMap<>();
        if (!u.getNombreCompleto().equals(req.nombreCompleto().trim())) cambios.put("nombreCompleto", req.nombreCompleto().trim());
        if (!u.getEmail().equals(req.email().trim())) cambios.put("email", "modificado");
        if (u.isActivo() != req.activo()) cambios.put("activo", req.activo());
        List<String> rolesAntes = u.getRoles().stream().map(Rol::getCodigo).sorted().toList();
        List<String> rolesDespues = nuevosRoles.stream().map(Rol::getCodigo).sorted().toList();
        if (!rolesAntes.equals(rolesDespues)) cambios.put("roles", rolesDespues);
        if (req.nuevaPassword() != null && !req.nuevaPassword().isBlank()) {
            u.setPasswordHash(encoder.encode(req.nuevaPassword()));
            cambios.put("password", "restablecida"); // nunca se registra el valor
        }
        u.setNombreCompleto(req.nombreCompleto().trim());
        u.setEmail(req.email().trim());
        u.setActivo(req.activo());
        u.setRoles(nuevosRoles);
        if (!cambios.isEmpty()) {
            historial.registrar("USUARIO", u.getId(), null, null, AccionHistorial.MODIFICACION,
                    "Usuario " + u.getNombreUsuario() + " modificado", cambios, null);
        }
        return mapper.aDto(u);
    }

    @Transactional
    public void registrarAcceso(Long id) {
        usuarios.findById(id).ifPresent(u -> u.setUltimoAcceso(Instant.now()));
    }

    private Set<Rol> resolverRoles(Set<String> codigos) {
        List<Rol> encontrados = roles.findByCodigoIn(codigos);
        if (encontrados.size() != codigos.size()) {
            throw new ReglaNegocioException("roles", "Uno o más roles no existen.");
        }
        return new HashSet<>(encontrados);
    }
}
