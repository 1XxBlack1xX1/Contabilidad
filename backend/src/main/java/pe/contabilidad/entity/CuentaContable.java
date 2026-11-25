package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "cuenta_contable")
@Getter
@Setter
@NoArgsConstructor
public class CuentaContable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id")
    private VersionPcge version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "elemento_id")
    private ElementoContable elemento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "padre_id")
    private CuentaContable padre;

    @Column(nullable = false, length = 10)
    private String codigo;

    @Column(nullable = false, length = 300)
    private String denominacion;

    private String descripcion;

    /** Cantidad de dígitos del código (2 = cuenta, 3 = subcuenta, 4 = divisionaria, 5+ = subdivisionaria). */
    @Column(nullable = false)
    private short nivel;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Naturaleza naturaleza;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private OrigenCuenta origen;

    @Column(nullable = false)
    private boolean activa = true;

    /** Código tal como aparece impreso en la fuente, cuando difiere del aplicado (errata documentada). */
    @Column(length = 10)
    private String codigoFuente;

    private String observacionFuente;

    private Integer paginaFuente;

    @Column(length = 120)
    private String seccionFuente;

    @Column(nullable = false, updatable = false)
    private Instant creadoEn;

    @Column(nullable = false)
    private Instant actualizadoEn;

    @Column(length = 60, updatable = false)
    private String creadoPor;

    @Column(length = 60)
    private String actualizadoPor;

    @Version
    @Column(name = "version_registro", nullable = false)
    private int versionRegistro;

    public TipoNivel getTipoNivel() {
        return TipoNivel.desdeDigitos(nivel);
    }

    @PrePersist
    void alCrear() {
        creadoEn = Instant.now();
        actualizadoEn = creadoEn;
    }

    @PreUpdate
    void alActualizar() {
        actualizadoEn = Instant.now();
    }
}
