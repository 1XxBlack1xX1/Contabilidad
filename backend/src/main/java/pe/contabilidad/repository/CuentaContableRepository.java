package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.OrigenCuenta;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CuentaContableRepository extends JpaRepository<CuentaContable, Long>, JpaSpecificationExecutor<CuentaContable> {

    Optional<CuentaContable> findByVersionIdAndCodigo(Long versionId, String codigo);

    boolean existsByVersionIdAndCodigo(Long versionId, String codigo);

    List<CuentaContable> findByVersionIdAndCodigoInOrderByCodigoAsc(Long versionId, Collection<String> codigos);

    List<CuentaContable> findByPadreIdOrderByCodigoAsc(Long padreId);

    long countByPadreId(Long padreId);

    /** Descendientes de una cuenta: en el PCGE el código de cada descendiente empieza con el código del ancestro. */
    @Query("select c from CuentaContable c where c.version.id = :versionId and c.codigo like concat(:codigo, '%') and c.codigo <> :codigo order by c.codigo")
    List<CuentaContable> buscarDescendientes(Long versionId, String codigo);

    /** Todas las cuentas de una versión en orden jerárquico (el orden lexicográfico del código recorre el árbol). */
    @Query("select c from CuentaContable c join fetch c.elemento where c.version.id = :versionId order by c.codigo")
    List<CuentaContable> listarPorVersion(Long versionId);

    long countByVersionId(Long versionId);

    long countByVersionIdAndActiva(Long versionId, boolean activa);

    long countByVersionIdAndOrigen(Long versionId, OrigenCuenta origen);

    @Query("select max(c.actualizadoEn) from CuentaContable c where c.version.id = :versionId")
    Optional<Instant> ultimaActualizacion(Long versionId);

    @Query("select c.nivel, count(c) from CuentaContable c where c.version.id = :versionId group by c.nivel order by c.nivel")
    List<Object[]> contarPorNivel(Long versionId);

    @Query("select c.elemento.id, count(c) from CuentaContable c where c.version.id = :versionId group by c.elemento.id")
    List<Object[]> contarPorElemento(Long versionId);
}
