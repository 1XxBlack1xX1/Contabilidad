package pe.contabilidad;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base de las pruebas de integración: levanta un PostgreSQL 17 real en Docker (compartido por todas
 * las clases) y aplica las migraciones Flyway, incluida la carga del catálogo oficial.
 */
@SpringBootTest(properties = {
        "spring.config.import=",           // no leer el .env local
        "app.admin-inicial.usuario=",      // no crear el administrador inicial
        "app.admin-inicial.password="
})
public abstract class IntegracionBase {

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    static {
        POSTGRES.start();
    }
}
