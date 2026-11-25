package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/** Línea de un asiento: una cuenta con un importe al debe o al haber. */
@Entity
@Table(name = "asiento_detalle")
@Getter
@Setter
@NoArgsConstructor
public class AsientoDetalle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asiento_id", updatable = false)
    private AsientoContable asiento;

    @Column(nullable = false, updatable = false)
    private short linea;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cuenta_id", updatable = false)
    private CuentaContable cuenta;

    @Column(length = 300, updatable = false)
    private String glosa;

    @Column(nullable = false, precision = 18, scale = 2, updatable = false)
    private BigDecimal debe = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2, updatable = false)
    private BigDecimal haber = BigDecimal.ZERO;
}
