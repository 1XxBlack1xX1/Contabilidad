package pe.contabilidad.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import pe.contabilidad.dto.ErrorRespuesta;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduce las excepciones a respuestas JSON uniformes y comprensibles.
 * Nunca expone trazas, sentencias SQL ni datos internos al cliente.
 */
@RestControllerAdvice
public class ManejadorGlobalExcepciones {

    private static final Logger log = LoggerFactory.getLogger(ManejadorGlobalExcepciones.class);

    @ExceptionHandler(RecursoNoEncontradoException.class)
    ResponseEntity<ErrorRespuesta> noEncontrado(RecursoNoEncontradoException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.NOT_FOUND, ex.getMessage(), null, req);
    }

    @ExceptionHandler(ReglaNegocioException.class)
    ResponseEntity<ErrorRespuesta> reglaNegocio(ReglaNegocioException ex, HttpServletRequest req) {
        Map<String, String> campos = ex.getCampo() == null ? null : Map.of(ex.getCampo(), ex.getMessage());
        return respuesta(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), campos, req);
    }

    @ExceptionHandler(ConflictoException.class)
    ResponseEntity<ErrorRespuesta> conflicto(ConflictoException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.CONFLICT, ex.getMessage(), null, req);
    }

    @ExceptionHandler(CuentaProtegidaException.class)
    ResponseEntity<ErrorRespuesta> protegida(CuentaProtegidaException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.FORBIDDEN, ex.getMessage(), null, req);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ErrorRespuesta> concurrencia(ObjectOptimisticLockingFailureException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.CONFLICT,
                "Otra persona modificó este registro mientras usted lo editaba. Recargue la información e intente nuevamente.", null, req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorRespuesta> validacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> campos.putIfAbsent(e.getField(), e.getDefaultMessage()));
        ex.getBindingResult().getGlobalErrors().forEach(e -> campos.putIfAbsent(e.getObjectName(), e.getDefaultMessage()));
        return respuesta(HttpStatus.BAD_REQUEST, "Revise los datos ingresados.", campos, req);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ErrorRespuesta> restriccion(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> {
            String ruta = v.getPropertyPath().toString();
            campos.putIfAbsent(ruta.substring(ruta.lastIndexOf('.') + 1), v.getMessage());
        });
        return respuesta(HttpStatus.BAD_REQUEST, "Revise los datos ingresados.", campos, req);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class, MissingServletRequestPartException.class})
    ResponseEntity<ErrorRespuesta> solicitudInvalida(Exception ex, HttpServletRequest req) {
        return respuesta(HttpStatus.BAD_REQUEST, "La solicitud no tiene el formato esperado.", null, req);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ErrorRespuesta> archivoGrande(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.PAYLOAD_TOO_LARGE, "El archivo supera el tamaño máximo permitido (10 MB).", null, req);
    }

    @ExceptionHandler({AccessDeniedException.class, AuthorizationDeniedException.class})
    ResponseEntity<ErrorRespuesta> accesoDenegado(Exception ex, HttpServletRequest req) {
        return respuesta(HttpStatus.FORBIDDEN, "No tiene permisos para realizar esta acción.", null, req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorRespuesta> metodo(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.METHOD_NOT_ALLOWED, "Operación no permitida sobre este recurso.", null, req);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorRespuesta> rutaInexistente(NoResourceFoundException ex, HttpServletRequest req) {
        return respuesta(HttpStatus.NOT_FOUND, "El recurso solicitado no existe.", null, req);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorRespuesta> integridad(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violación de integridad en {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getClass().getSimpleName());
        return respuesta(HttpStatus.CONFLICT, "La operación incumple una regla de integridad del catálogo.", null, req);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorRespuesta> inesperado(Exception ex, HttpServletRequest req) {
        log.error("Error no controlado en {} {}", req.getMethod(), req.getRequestURI(), ex);
        return respuesta(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrió un error inesperado. Si el problema persiste, comuníquese con el administrador.", null, req);
    }

    private ResponseEntity<ErrorRespuesta> respuesta(HttpStatus estado, String mensaje, Map<String, String> campos,
                                                     HttpServletRequest req) {
        return ResponseEntity.status(estado)
                .body(new ErrorRespuesta(estado.value(), estado.getReasonPhrase(), mensaje, campos, req.getRequestURI(), Instant.now()));
    }
}
