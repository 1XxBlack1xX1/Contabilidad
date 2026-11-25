package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.contabilidad.entity.Rol;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RolRepository extends JpaRepository<Rol, Long> {

    Optional<Rol> findByCodigo(String codigo);

    List<Rol> findByCodigoIn(Collection<String> codigos);
}
