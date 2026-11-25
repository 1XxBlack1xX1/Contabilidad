package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

/** Registro de auditoría. La base de datos impide modificarlo o eliminarlo. */
@Entity
@Table(name = "historial_cambios")
@Getter
@Setter
@NoArgsConstructor
public class HistorialCambio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30, updatable = false)
    private String entidad;

    @Column(updatable = false)
    private Long entidadId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cuenta_id", updatable = false)
    private CuentaContable cuenta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id", updatable = false)
    private VersionPcge version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private AccionHistorial accion;

    @Column(nullable = false, length = 300, updatable = false)
    private String resumen;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> detalle;

    @Column(length = 500, updatable = false)
    private String motivo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", updatable = false)
    private Usuario usuario;

    @Column(nullable = false, length = 60, updatable = false)
    private String nombreUsuario;

    @Column(nullable = false, updatable = false)
    private Instant fecha;

    @PrePersist
    void alCrear() {
        if (fecha == null) {
            fecha = Instant.now();
        }
    }
}
