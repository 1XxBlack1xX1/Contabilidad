# CONTABILIDAD

Sistema web contable basado en el **Plan Contable General Empresarial (PCGE) del Perú**, pensado para
contadores, auxiliares contables y administradores: catálogo oficial, asientos, libros y reportes.

- Incluye el catálogo **oficial completo** del PCGE Modificado 2019 (vigente) y del PCGE 2026
  (obligatorio desde el 01/01/2028), transcritos de los documentos del MEF con su fuente documentada.
- Las cuentas oficiales están protegidas: solo pueden activarse o desactivarse.
- Las cuentas personalizadas quedan identificadas y separadas del catálogo oficial.
- Todo cambio queda en un historial que no puede alterarse.

> Detalle de las fuentes, la metodología de extracción y las erratas del documento oficial:
> [`database/pcge/README.md`](database/pcge/README.md).

## Funcionalidades

| Módulo | Estado |
|---|---|
| Dashboard: totales, versión instalada, vigencia, últimas modificaciones, accesos rápidos | ✅ |
| Plan contable: cuentas, subcuentas y elementos, con búsqueda por código o nombre (sin distinguir tildes) y filtros por elemento, nivel, estado y origen | ✅ |
| Explorador jerárquico: Elemento → Cuenta → Subcuenta → Divisionaria → Subdivisionaria | ✅ |
| Ficha de cuenta: ruta jerárquica, subcuentas, procedencia documental e historial | ✅ |
| Cuentas personalizadas: registro, edición, activación y desactivación con motivo | ✅ |
| Importación desde Excel o CSV, con vista previa, validación y confirmación | ✅ |
| Exportación a Excel (jerarquía plegable), PDF y CSV, respetando los filtros | ✅ |
| Versiones y fuentes normativas, historial de cambios | ✅ |
| Usuarios, roles y permisos | ✅ |
| Asientos contables: partida doble, numeración correlativa anual, solo cuentas activas de último nivel, anulación con motivo | ✅ |
| Ayudas al registrar: sugerencia automática de IGV (18 %, editable) y plantillas de operaciones frecuentes (venta, compra, servicio, cobranza, pago, ingreso al almacén, planilla con ONP y EsSalud) | ✅ |
| Libro diario (Excel y PDF) | ✅ |
| Libro mayor por cuenta, con saldo inicial, saldo acumulado y acumulación de subcuentas (Excel y PDF) | ✅ |
| Balance de comprobación de sumas y saldos por nivel, con verificación de cuadre (Excel y PDF) | ✅ |
| Reportes: estado de situación financiera y estado de resultados por naturaleza (Excel y PDF) | ✅ |

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 3.5 (Web, Data JPA, Security, Validation, Actuator), Maven Wrapper |
| Base de datos | PostgreSQL 17, Hibernate, Flyway |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, Lucide |
| Documentos | Apache POI (Excel), OpenPDF (PDF), Commons CSV |
| Pruebas | JUnit 5, Mockito, MockMvc, Testcontainers |

## Estructura

```
contabilidad/
├── backend/                 API REST Spring Boot
│   └── src/main/java/pe/contabilidad/
│       ├── config/  controller/  service/  repository/  entity/
│       ├── dto/  mapper/  exception/  security/
│   └── src/main/resources/db/migration/   Migraciones Flyway (V1 esquema, V2-V3 catálogo oficial)
├── frontend/                Aplicación React
│   └── src/  api/  componentes/  contexto/  paginas/  utilidades/
├── database/pcge/           Fuentes, herramienta de extracción, CSV validados y erratas
├── docker-compose.yml       PostgreSQL para desarrollo
└── .env.example             Variables de entorno
```

## Requisitos

- **Java 21** (JDK). No hace falta instalar Maven: se usa `mvnw`.
- **Node.js 20 o superior** con npm.
- **Docker Desktop**, para PostgreSQL y las pruebas de integración. También puede usar un
  PostgreSQL 15+ propio, con las extensiones `unaccent` y `pg_trgm` disponibles.

## Instalación y ejecución

### 1. Variables de entorno

```bash
cp .env.example .env
```

Edite `.env` y defina como mínimo:

| Variable | Descripción |
|---|---|
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `APP_ADMIN_USUARIO`, `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD` | Administrador inicial. Solo se crea si la base no tiene usuarios. La contraseña debe tener al menos 12 caracteres |

El backend lee este archivo automáticamente. Nunca suba `.env` al repositorio.

### 2. Base de datos

```bash
docker compose up -d
```

### 3. Backend (puerto 8080)

```bash
cd backend
./mvnw spring-boot:run          # Windows: mvnw.cmd spring-boot:run
```

En el primer arranque, Flyway crea el esquema y carga los dos catálogos oficiales (unas 3400
cuentas, menos de 2 segundos), y se crea el administrador inicial.

### 4. Frontend (puerto 5173)

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:5173** e ingrese con el usuario y la contraseña definidos en `.env`.
En desarrollo, Vite redirige `/api` al backend, de modo que la aplicación y la API comparten origen
(necesario para la cookie de sesión y la protección CSRF).

### Compilación para producción

```bash
cd backend  && ./mvnw clean package          # genera target/contabilidad-backend-0.1.0.jar
cd frontend && npm run build                 # genera dist/ (archivos estáticos)
```

Sirva `frontend/dist` y la API **bajo el mismo dominio**, con un proxy inverso (Nginx o similar)
que redirija `/api` al backend. Además, en producción:

- Use HTTPS y defina `APP_COOKIE_SEGURA=true`.
- Desactive Swagger con `SPRINGDOC_API_DOCS_ENABLED=false` y `SPRINGDOC_SWAGGER_UI_ENABLED=false`.
- Use una contraseña de base de datos robusta y un usuario de PostgreSQL con privilegios mínimos.

## Roles y permisos

| Permiso | Administrador | Contador | Auxiliar contable |
|---|:-:|:-:|:-:|
| Consultar el catálogo | ✅ | ✅ | ✅ |
| Exportar (Excel, PDF, CSV) | ✅ | ✅ | ✅ |
| Registrar, editar, activar y desactivar cuentas | ✅ | ✅ | — |
| Importar catálogos | ✅ | — | — |
| Administrar usuarios | ✅ | — | — |
| Cambiar la versión predeterminada | ✅ | — | — |
| Consultar asientos, libros y reportes | ✅ | ✅ | ✅ |
| Registrar asientos | ✅ | ✅ | ✅ |
| Anular asientos | ✅ | ✅ | — |

El backend verifica los permisos en cada endpoint (`@PreAuthorize`). La interfaz solo oculta lo
que el usuario no puede usar.

## Reglas del catálogo

- **Cuentas oficiales**: no se modifican ni se eliminan. Una segunda barrera en PostgreSQL
  (triggers) lo impide aunque la aplicación fallara. Solo pueden activarse o desactivarse.
- **Cuentas personalizadas**: se registran como hijas de una cuenta existente y activa, con un
  dígito más (p. ej. `1041` → `10411`). Las cuentas de dos dígitos están reservadas por el PCGE.
  Solo se admiten en elementos que el PCGE deja a criterio de la entidad (Elemento 9 del 2019).
- **Desactivar** una cuenta desactiva también sus subcuentas. Para **activar** una subcuenta, su
  cuenta superior debe estar activa. Ambas acciones exigen un motivo.
- **Importar** crea siempre una versión nueva marcada como *no oficial*, con la huella SHA-256
  del archivo. Nunca modifica ni mezcla versiones existentes.
- **Historial**: registra usuario, fecha, valores anteriores y nuevos, y motivo. La base de datos
  impide editarlo o borrarlo.

## Reglas de los asientos

- Partida doble: al menos dos líneas y la suma del debe igual a la del haber. Cada línea va al debe
  o al haber, nunca a ambos. Los importes se expresan en soles (PEN), con dos decimales.
- Solo se usan cuentas **activas de último nivel** (sin subcuentas) de la versión del catálogo con
  la que se trabaja. No se admiten fechas futuras ni fechas fuera de la vigencia de la versión.
- Numeración correlativa por año, sin huecos (`2026-000001`, `2026-000002`…).
- Un asiento registrado **no se edita ni se elimina**. Si tiene un error, se **anula** con motivo y
  se registra uno nuevo. Los asientos anulados se conservan, pero no afectan libros ni reportes.
- PostgreSQL vuelve a verificar el cuadre al confirmar cada transacción y bloquea cualquier
  modificación de asientos registrados.
- Los reportes son de gestión y se calculan con los saldos por elemento:
  - Activo: elementos 1 a 3. Pasivo: elemento 4. Patrimonio: elemento 5.
  - Resultado del ejercicio: elementos 6 a 9.
  - Estado de resultados: ingresos del elemento 7 sin la cuenta 79, menos gastos del elemento 6.
  - No reemplazan a los estados financieros elaborados conforme a las NIIF.

## API REST

La documentación interactiva (OpenAPI) está en **http://localhost:8080/swagger-ui.html**, o en
`http://localhost:5173/swagger-ui.html` a través del proxy.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` | Inicio y cierre de sesión |
| GET | `/api/auth/sesion` · `/api/auth/csrf` | Usuario actual · token CSRF |
| GET | `/api/cuentas` | Lista paginada. Filtros: `version`, `termino`, `elemento`, `nivel`, `estado`, `origen`, `conObservacion`, `pagina`, `tamano`, `orden` |
| GET | `/api/cuentas/{id}` | Detalle con ruta jerárquica, subcuentas y procedencia |
| GET | `/api/cuentas/codigo/{codigo}` | Búsqueda por código exacto |
| GET | `/api/cuentas/buscar?termino=` | Búsqueda rápida por código o denominación |
| GET | `/api/cuentas/arbol` | Árbol jerárquico completo |
| POST | `/api/cuentas` | Registrar una cuenta personalizada |
| PUT | `/api/cuentas/{id}` | Editar una cuenta personalizada |
| PATCH | `/api/cuentas/{id}/estado` | Activar o desactivar (con motivo) |
| GET | `/api/cuentas/{id}/historial` | Historial de la cuenta |
| GET | `/api/elementos` | Elementos con su cantidad de cuentas |
| GET | `/api/versiones-pcge` · `/api/versiones-pcge/{codigo}` | Versiones, vigencia y fuentes normativas |
| PUT | `/api/versiones-pcge/{codigo}/predeterminada` | Cambiar la versión predeterminada |
| GET | `/api/dashboard` · `/api/historial` | Indicadores · últimas modificaciones |
| GET | `/api/exportaciones/cuentas?formato=XLSX\|PDF\|CSV` | Exportación con los mismos filtros del listado |
| POST | `/api/importaciones/vista-previa` · `/api/importaciones` | Validar y confirmar una importación (multipart) |
| GET/POST/PUT | `/api/usuarios` · `/api/usuarios/roles` | Gestión de usuarios |
| GET | `/api/asientos` · `/api/asientos/{id}` | Listado (filtros: `desde`, `hasta`, `estado`, `termino`) · detalle |
| POST | `/api/asientos` | Registrar un asiento |
| POST | `/api/asientos/{id}/anulacion` | Anular un asiento (con motivo) |
| GET | `/api/libros/diario` · `/api/libros/mayor` · `/api/libros/balance-comprobacion` | Libros contables (`desde`, `hasta`; mayor: `cuenta`; balance: `nivel`) |
| GET | `/api/reportes/situacion-financiera` · `/api/reportes/resultados` | Reportes de gestión |
| GET | `.../exportar?formato=XLSX|PDF` | Exportación de cada libro o reporte |

Si no se indica `version`, se usa la versión predeterminada (PCGE Modificado 2019). Los errores
tienen un formato uniforme: `{ estado, error, mensaje, campos, ruta, fecha }`.

**Autenticación**: sesión HTTP con cookie `HttpOnly` y `SameSite=Strict`. Las operaciones que
modifican datos requieren la cabecera `X-XSRF-TOKEN` con el valor de la cookie `XSRF-TOKEN`.

## Pruebas

```bash
cd backend
./mvnw test        # 22 pruebas unitarias (reglas de negocio, importación, vigencia)
./mvnw verify      # además, 34 pruebas de integración con PostgreSQL real (requiere Docker)
```

Las pruebas de integración levantan PostgreSQL 17 con Testcontainers y verifican:

- Los totales exactos del catálogo cargado (1772 / 1628) y su jerarquía.
- Las erratas documentadas.
- Los triggers de protección del catálogo y del historial.
- Los endpoints con sus permisos, CSRF, validaciones, concurrencia, desactivación en cascada y
  exportaciones.
- Inicio de sesión con usuario o con correo electrónico.
- Un escenario contable completo (aporte de capital, venta con IGV, compra, cobranza y un asiento
  anulado) con cifras exactas en el libro diario, el libro mayor, el balance de comprobación y los
  estados financieros, además del rechazo de asientos inválidos y la inmutabilidad en la base de datos.

Frontend: `npm run build` verifica los tipos y compila; `npm run lint` revisa el código.

## Seguridad

- Contraseñas con BCrypt. Bloqueo temporal tras 5 intentos fallidos de inicio de sesión.
- Protección CSRF, cabeceras CSP, `X-Frame-Options: DENY` y política de referer.
- Los mensajes de error no exponen trazas ni SQL. Los registros no incluyen contraseñas ni datos sensibles.
- Validación de entradas en el backend (Bean Validation) y restricciones en la base de datos.
- Configuración solo por variables de entorno; no hay credenciales en el código.

## Pendientes conocidos

- Verificar la fecha de emisión de la Resolución CNC N.° 002-2019-EF/30. Hoy se muestra como
  "no verificada" porque el portal del MEF no permitió la descarga automatizada.
- Cierre de períodos contables (bloqueo de meses cerrados) y asientos de apertura y cierre automáticos.
- Moneda extranjera y tipo de cambio (hoy los asientos se registran solo en soles).
- Formatos de libros electrónicos del PLE de SUNAT.
