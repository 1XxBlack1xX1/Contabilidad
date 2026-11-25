package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Asiento contable por partida doble. Una vez registrado no se modifica: solo puede anularse. */
@Entity
@Table(name = "asiento_contable")
@Getter
@Setter
@NoArgsConstructor
public class AsientoContable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id", updatable = false)
    private VersionPcge version;

    @Column(nullable = false, updatable = false)
    private short anio;

    @Column(nullable = false, updatable = false)
    private int numero;

    @Column(nullable = false, updatable = false)
    private LocalDate fecha;

    @Column(nullable = false, length = 300, updatable = false)
    private String glosa;

    @Column(length = 60, updatable = false)
    private String documentoReferencia;

    @Column(nullable = false, length = 3, updatable = false, columnDefinition = "bpchar(3)")
    private String moneda = "PEN";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EstadoAsiento estado = EstadoAsiento.REGISTRADO;

    @Column(nullable = false, precision = 18, scale = 2, updatable = false)
    private BigDecimal totalDebe;

    @Column(nullable = false, precision = 18, scale = 2, updatable = false)
    private BigDecimal totalHaber;

    @Column(length = 500)
    private String motivoAnulacion;

    @Column(length = 60)
    private String anuladoPor;

    private Instant anuladoEn;

    @Column(nullable = false, length = 60, updatable = false)
    private String creadoPor;

    @Column(nullable = false, updatable = false)
    private Instant creadoEn;

    @OneToMany(mappedBy = "asiento", cascade = CascadeType.PERSIST)
    @OrderBy("linea ASC")
    private List<AsientoDetalle> lineas = new ArrayList<>();

    /** Número visible del asiento: año y correlativo, p. ej. 2026-000015. */
    public String getNumeroCompleto() {
        return anio + "-" + String.format("%06d", numero);
    }

    @PrePersist
    void alCrear() {
        creadoEn = Instant.now();
    }
}
