package pe.contabilidad.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "elemento_contable")
@Getter
@Setter
@NoArgsConstructor
public class ElementoContable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id")
    private VersionPcge version;

    @Column(nullable = false)
    private short numero;

    @Column(nullable = false, length = 200)
    private String denominacion;

    private String descripcion;

    private Integer paginaFuente;

    @Column(length = 120)
    private String seccionFuente;
}
