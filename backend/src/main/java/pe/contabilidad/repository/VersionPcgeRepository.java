package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import pe.contabilidad.entity.VersionPcge;

import java.util.List;
import java.util.Optional;

public interface VersionPcgeRepository extends JpaRepository<VersionPcge, Long> {

    Optional<VersionPcge> findByCodigo(String codigo);

    Optional<VersionPcge> findByPredeterminadaTrue();

    boolean existsByCodigo(String codigo);

    @EntityGraph(attributePaths = "fuentes")
    @Query("select v from VersionPcge v order by v.oficial desc, v.fechaAplicacionObligatoria asc nulls last, v.id asc")
    List<VersionPcge> listarConFuentes();

    @Modifying
    @Query("update VersionPcge v set v.predeterminada = false where v.predeterminada = true")
    void quitarPredeterminada();
}
