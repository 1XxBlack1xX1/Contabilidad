package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.contabilidad.entity.FuenteNormativa;

public interface FuenteNormativaRepository extends JpaRepository<FuenteNormativa, Long> {
}
