package pe.contabilidad.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/** Respuesta paginada estable (no expone la estructura interna de Spring Data). */
public record PaginaDto<T>(List<T> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) {

    public static <E, T> PaginaDto<T> de(Page<E> page, Function<E, T> mapeo) {
        return new PaginaDto<>(page.getContent().stream().map(mapeo).toList(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
