package pe.contabilidad.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import pe.contabilidad.entity.AsientoContable;
import pe.contabilidad.entity.AsientoDetalle;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AsientoContableRepository extends JpaRepository<AsientoContable, Long>, JpaSpecificationExecutor<AsientoContable> {

    @Query("select a from AsientoContable a left join fetch a.lineas l left join fetch l.cuenta where a.id = :id")
    Optional<AsientoContable> buscarConLineas(Long id);

    /** Libro diario: asientos registrados en orden cronológico, con sus líneas y cuentas. */
    @Query("""
            select distinct a from AsientoContable a join fetch a.lineas l join fetch l.cuenta
            where a.version.id = :versionId and a.estado = pe.contabilidad.entity.EstadoAsiento.REGISTRADO
              and a.fecha between :desde and :hasta
            order by a.fecha, a.anio, a.numero""")
    List<AsientoContable> libroDiario(Long versionId, LocalDate desde, LocalDate hasta);

    /** Movimientos de una cuenta y sus subcuentas (por prefijo de código) en un período. */
    @Query("""
            select d from AsientoDetalle d join fetch d.asiento a join fetch d.cuenta c
            where a.version.id = :versionId and a.estado = pe.contabilidad.entity.EstadoAsiento.REGISTRADO
              and c.codigo like concat(:codigo, '%') and a.fecha between :desde and :hasta
            order by a.fecha, a.anio, a.numero, d.linea""")
    List<AsientoDetalle> movimientosMayor(Long versionId, String codigo, LocalDate desde, LocalDate hasta);

    /** Saldo (debe − haber) acumulado de una cuenta y sus subcuentas antes de una fecha. */
    @Query("""
            select coalesce(sum(d.debe - d.haber), 0) from AsientoDetalle d join d.asiento a join d.cuenta c
            where a.version.id = :versionId and a.estado = pe.contabilidad.entity.EstadoAsiento.REGISTRADO
              and c.codigo like concat(:codigo, '%') and a.fecha < :antes""")
    BigDecimal saldoAnterior(Long versionId, String codigo, LocalDate antes);

    /** Sumas del debe y del haber por cuenta de movimiento en un período (desde puede ser nulo). */
    @Query("""
            select c.codigo, sum(d.debe), sum(d.haber) from AsientoDetalle d join d.asiento a join d.cuenta c
            where a.version.id = :versionId and a.estado = pe.contabilidad.entity.EstadoAsiento.REGISTRADO
              and (cast(:desde as date) is null or a.fecha >= :desde) and a.fecha <= :hasta
            group by c.codigo order by c.codigo""")
    List<Object[]> sumasPorCuenta(Long versionId, LocalDate desde, LocalDate hasta);

    @Query(value = """
            INSERT INTO correlativo_asiento (anio, ultimo) VALUES (:anio, 1)
            ON CONFLICT (anio) DO UPDATE SET ultimo = correlativo_asiento.ultimo + 1
            RETURNING ultimo""", nativeQuery = true)
    int siguienteNumero(short anio);

    long countByVersionIdAndEstado(Long versionId, pe.contabilidad.entity.EstadoAsiento estado);

    @Query("select count(d) > 0 from AsientoDetalle d where d.cuenta.id = :cuentaId")
    boolean cuentaTieneMovimientos(Long cuentaId);
}
