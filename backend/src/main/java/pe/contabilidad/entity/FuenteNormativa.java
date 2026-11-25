package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "fuente_normativa")
@Getter
@Setter
@NoArgsConstructor
public class FuenteNormativa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id")
    private VersionPcge version;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoFuente tipo;

    @Column(nullable = false, length = 300)
    private String titulo;

    @Column(length = 60)
    private String numero;

    @Column(length = 200)
    private String entidadEmisora;

    private LocalDate fechaEmision;

    @Column(length = 500)
    private String url;

    @Column(length = 200)
    private String nombreArchivo;

    @Column(length = 64, columnDefinition = "bpchar(64)")
    private String sha256;

    private LocalDate fechaConsulta;

    @Column(nullable = false)
    private boolean verificada;

    private String notas;
}
