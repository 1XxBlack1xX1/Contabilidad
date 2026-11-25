package pe.contabilidad.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import pe.contabilidad.entity.HistorialCambio;

public interface HistorialCambioRepository extends JpaRepository<HistorialCambio, Long> {

    @EntityGraph(attributePaths = {"cuenta", "version"})
    Page<HistorialCambio> findByCuentaIdOrderByFechaDescIdDesc(Long cuentaId, Pageable pageable);

    @EntityGraph(attributePaths = {"cuenta", "version"})
    Page<HistorialCambio> findByVersionIdOrderByFechaDescIdDesc(Long versionId, Pageable pageable);

    @EntityGraph(attributePaths = {"cuenta", "version"})
    Page<HistorialCambio> findAllByOrderByFechaDescIdDesc(Pageable pageable);
}
