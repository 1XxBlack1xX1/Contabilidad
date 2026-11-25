package pe.contabilidad.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pe.contabilidad.dto.RolDto;
import pe.contabilidad.dto.UsuarioActualizarRequest;
import pe.contabilidad.dto.UsuarioCrearRequest;
import pe.contabilidad.dto.UsuarioDto;
import pe.contabilidad.service.UsuarioService;

import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@Tag(name = "Usuarios y permisos")
@PreAuthorize("hasAuthority('USUARIOS_GESTIONAR')")
public class UsuarioController {

    private final UsuarioService servicio;

    public UsuarioController(UsuarioService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    @Operation(summary = "Lista de usuarios")
    public List<UsuarioDto> listar() {
        return servicio.listar();
    }

    @GetMapping("/roles")
    @Operation(summary = "Roles disponibles y su alcance")
    public List<RolDto> roles() {
        return servicio.roles();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Crea un usuario")
    public UsuarioDto crear(@Valid @RequestBody UsuarioCrearRequest req) {
        return servicio.crear(req);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifica un usuario (datos, roles, estado o contraseña)")
    public UsuarioDto actualizar(@PathVariable Long id, @Valid @RequestBody UsuarioActualizarRequest req) {
        return servicio.actualizar(id, req);
    }
}
