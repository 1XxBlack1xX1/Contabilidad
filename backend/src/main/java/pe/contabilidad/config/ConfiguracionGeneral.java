package pe.contabilidad.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class ConfiguracionGeneral {

    /** Zona horaria oficial del Perú. Las fechas de vigencia del PCGE se evalúan en esta zona. */
    public static final ZoneId ZONA_PERU = ZoneId.of("America/Lima");

    @Bean
    Clock reloj() {
        return Clock.system(ZONA_PERU);
    }

    @Bean
    OpenAPI documentacionApi() {
        return new OpenAPI().info(new Info()
                .title("CONTABILIDAD - API")
                .version("0.1.0")
                .description("API REST para la gestión del Plan Contable General Empresarial (PCGE) del Perú. "
                        + "Requiere sesión iniciada (POST /api/auth/login) y el token CSRF en la cabecera X-XSRF-TOKEN "
                        + "para operaciones que modifican datos."));
    }
}
