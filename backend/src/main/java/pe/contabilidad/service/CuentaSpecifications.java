package pe.contabilidad.service;

import jakarta.persistence.criteria.Expression;
import org.springframework.data.jpa.domain.Specification;
import pe.contabilidad.dto.FiltroCuentas;
import pe.contabilidad.entity.CuentaContable;

/** Construye los criterios de consulta del catálogo a partir de los filtros. */
final class CuentaSpecifications {

    private CuentaSpecifications() {
    }

    static Specification<CuentaContable> de(Long versionId, FiltroCuentas f) {
        Specification<CuentaContable> spec = deVersion(versionId);
        if (f == null) {
            return spec;
        }
        String termino = TextoUtil.limpiar(f.termino());
        if (termino != null) {
            spec = spec.and(TextoUtil.esCodigo(termino) ? codigoEmpiezaCon(termino) : denominacionContiene(termino));
        }
        if (f.elemento() != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("elemento").get("numero"), f.elemento()));
        }
        if (f.nivel() != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("nivel"), f.nivel().shortValue()));
        }
        if (f.estado() == FiltroCuentas.EstadoFiltro.ACTIVAS) {
            spec = spec.and((r, q, cb) -> cb.isTrue(r.get("activa")));
        } else if (f.estado() == FiltroCuentas.EstadoFiltro.INACTIVAS) {
            spec = spec.and((r, q, cb) -> cb.isFalse(r.get("activa")));
        }
        if (f.origen() != null) {
            spec = spec.and((r, q, cb) -> cb.equal(r.get("origen"), f.origen()));
        }
        if (Boolean.TRUE.equals(f.conObservacion())) {
            spec = spec.and((r, q, cb) -> cb.isNotNull(r.get("observacionFuente")));
        }
        return spec;
    }

    private static Specification<CuentaContable> deVersion(Long versionId) {
        return (r, q, cb) -> {
            // Evita N+1 al listar: el elemento se carga en la misma consulta (no aplica a consultas de conteo).
            if (q != null && q.getResultType() != Long.class && q.getResultType() != long.class) {
                r.fetch("elemento");
            }
            return cb.equal(r.get("version").get("id"), versionId);
        };
    }

    /** Cuentas activas sin subcuentas: las únicas que admiten movimientos en asientos. */
    static Specification<CuentaContable> deMovimiento() {
        return (r, q, cb) -> {
            var sub = q.subquery(Long.class);
            var hija = sub.from(CuentaContable.class);
            sub.select(hija.get("id")).where(cb.equal(hija.get("padre"), r));
            return cb.and(cb.isTrue(r.get("activa")), cb.not(cb.exists(sub)));
        };
    }

    static Specification<CuentaContable> codigoEmpiezaCon(String prefijo) {
        return (r, q, cb) -> cb.like(r.get("codigo"), TextoUtil.escaparLike(prefijo) + "%", '\\');
    }

    /** Búsqueda por denominación sin distinguir mayúsculas ni tildes; cada palabra debe aparecer. */
    static Specification<CuentaContable> denominacionContiene(String termino) {
        return (r, q, cb) -> {
            Expression<String> normalizada = cb.function("f_normalizar", String.class, r.get("denominacion"));
            return cb.and(java.util.Arrays.stream(TextoUtil.normalizar(termino).split(" "))
                    .filter(p -> !p.isBlank())
                    .map(p -> cb.like(normalizada, "%" + TextoUtil.escaparLike(p) + "%", '\\'))
                    .toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}
