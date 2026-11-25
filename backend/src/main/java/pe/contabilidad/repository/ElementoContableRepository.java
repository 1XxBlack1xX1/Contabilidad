package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.contabilidad.entity.ElementoContable;

import java.util.List;
import java.util.Optional;

public interface ElementoContableRepository extends JpaRepository<ElementoContable, Long> {

    List<ElementoContable> findByVersionIdOrderByNumeroAsc(Long versionId);

    Optional<ElementoContable> findByVersionIdAndNumero(Long versionId, short numero);
}
