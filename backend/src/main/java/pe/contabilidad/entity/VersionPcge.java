package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "version_pcge")
@Getter
@Setter
@NoArgsConstructor
public class VersionPcge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(nullable = false, length = 150)
    private String nombre;

    private String descripcion;

    @Column(nullable = false)
    private boolean oficial;

    private LocalDate fechaAprobacion;

    private LocalDate fechaAplicacionObligatoria;

    private LocalDate fechaFinVigencia;

    /** {@code null} cuando la fuente no lo documenta. */
    private Boolean permiteAplicacionAnticipada;

    @Column(nullable = false)
    private boolean predeterminada;

    private String notas;

    @OneToMany(mappedBy = "version")
    @OrderBy("tipo ASC, id ASC")
    private List<FuenteNormativa> fuentes = new ArrayList<>();

    @Column(nullable = false, updatable = false, insertable = false)
    private Instant creadoEn;

    @Column(nullable = false)
    private Instant actualizadoEn;

    /** Calcula el estado de vigencia para una fecha dada (no se almacena para que no quede desfasado). */
    public EstadoVigencia estadoVigencia(LocalDate fecha) {
        if (!oficial) {
            return EstadoVigencia.NO_OFICIAL;
        }
        if (fechaAplicacionObligatoria == null) {
            return EstadoVigencia.SIN_FECHA;
        }
        if (fecha.isBefore(fechaAplicacionObligatoria)) {
            return EstadoVigencia.POR_ENTRAR_EN_VIGENCIA;
        }
        if (fechaFinVigencia != null && fecha.isAfter(fechaFinVigencia)) {
            return EstadoVigencia.DEROGADA;
        }
        return EstadoVigencia.VIGENTE;
    }

    @PrePersist
    @PreUpdate
    void marcarActualizacion() {
        actualizadoEn = Instant.now();
    }
}
