package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import pe.contabilidad.entity.Usuario;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByNombreUsuario(String nombreUsuario);

    boolean existsByNombreUsuario(String nombreUsuario);

    Optional<Usuario> findByEmailIgnoreCase(String email);

    @Query("select count(u) > 0 from Usuario u where lower(u.email) = lower(:email) and (:excluirId is null or u.id <> :excluirId)")
    boolean existeEmail(String email, Long excluirId);

    @Query("select distinct u from Usuario u left join fetch u.roles order by u.nombreCompleto")
    List<Usuario> listarConRoles();

    @Query("select count(distinct u) from Usuario u join u.roles r where r.codigo = :rol and u.activo = true")
    long contarActivosConRol(String rol);
}
