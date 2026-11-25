package pe.contabilidad.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bloquea temporalmente un usuario tras varios intentos fallidos de inicio de sesión,
 * para mitigar ataques de fuerza bruta. El estado se mantiene en memoria.
 */
@Component
public class ControlIntentosLogin {

    private record Registro(int fallos, Instant bloqueadoHasta) {
    }

    private final Map<String, Registro> registros = new ConcurrentHashMap<>();
    private final int intentosMaximos;
    private final Duration bloqueo;
    private final Clock reloj;

    public ControlIntentosLogin(@Value("${app.login.intentos-maximos:5}") int intentosMaximos,
                                @Value("${app.login.bloqueo-minutos:15}") int bloqueoMinutos,
                                Clock reloj) {
        this.intentosMaximos = intentosMaximos;
        this.bloqueo = Duration.ofMinutes(bloqueoMinutos);
        this.reloj = reloj;
    }

    public boolean estaBloqueado(String usuario) {
        Registro r = registros.get(clave(usuario));
        return r != null && r.bloqueadoHasta() != null && reloj.instant().isBefore(r.bloqueadoHasta());
    }

    public void registrarFallo(String usuario) {
        registros.compute(clave(usuario), (k, r) -> {
            int fallos = (r == null || (r.bloqueadoHasta() != null && !reloj.instant().isBefore(r.bloqueadoHasta())))
                    ? 1 : r.fallos() + 1;
            return new Registro(fallos, fallos >= intentosMaximos ? reloj.instant().plus(bloqueo) : null);
        });
    }

    public void registrarExito(String usuario) {
        registros.remove(clave(usuario));
    }

    public long minutosBloqueo() {
        return bloqueo.toMinutes();
    }

    private static String clave(String usuario) {
        return usuario == null ? "" : usuario.trim().toLowerCase();
    }
}
