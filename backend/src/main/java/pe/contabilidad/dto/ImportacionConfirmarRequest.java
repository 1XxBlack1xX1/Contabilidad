package pe.contabilidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Datos de la nueva versión que se crea al confirmar una importación.
 * {@code sha256Revisado} garantiza que se importa exactamente el archivo revisado en la vista previa.
 */
public record ImportacionConfirmarRequest(
        @NotBlank(message = "Indique un código para la versión")
        @Pattern(regexp = "^[A-Z0-9_]{3,30}$", message = "Use de 3 a 30 caracteres: mayúsculas, números o guion bajo")
        String codigo,

        @NotBlank(message = "Indique un nombre para la versión") @Size(max = 150)
        String nombre,

        @Size(max = 2000)
        String descripcion,

        @NotBlank(message = "Indique la fuente de los datos importados") @Size(max = 300)
        String fuenteTitulo,

        @Size(max = 500)
        String fuenteUrl,

        @Size(max = 2000)
        String notas,

        @NotBlank(message = "Falta la huella del archivo revisado")
        @Pattern(regexp = "^[0-9a-f]{64}$", message = "Huella de archivo no válida")
        String sha256Revisado) {
}
