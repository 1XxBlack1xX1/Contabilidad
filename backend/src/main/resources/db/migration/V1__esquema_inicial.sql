-- =====================================================================
-- CONTABILIDAD - Esquema inicial
-- Plan Contable General Empresarial (PCGE) del Perú
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Normaliza texto para búsquedas: minúsculas y sin tildes ("Depreciación" = "depreciacion").
CREATE OR REPLACE FUNCTION f_normalizar(texto TEXT) RETURNS TEXT
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, texto)) $$;

-- ---------------------------------------------------------------------
-- Versiones del PCGE
-- El estado de vigencia (vigente, por entrar en vigencia, derogada) se
-- calcula a partir de las fechas; no se almacena para que no quede desfasado.
-- ---------------------------------------------------------------------
CREATE TABLE version_pcge (
    id                            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo                        VARCHAR(30)  NOT NULL,
    nombre                        VARCHAR(150) NOT NULL,
    descripcion                   TEXT,
    oficial                       BOOLEAN      NOT NULL,
    fecha_aprobacion              DATE,
    fecha_aplicacion_obligatoria  DATE,
    fecha_fin_vigencia            DATE,
    permite_aplicacion_anticipada BOOLEAN,       -- NULL = no documentado
    predeterminada                BOOLEAN      NOT NULL DEFAULT FALSE,
    notas                         TEXT,
    creado_en                     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en                TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_version_pcge_codigo UNIQUE (codigo),
    CONSTRAINT ck_version_pcge_codigo CHECK (codigo ~ '^[A-Z0-9_]+$'),
    CONSTRAINT ck_version_pcge_fechas CHECK (fecha_fin_vigencia IS NULL OR fecha_aplicacion_obligatoria IS NULL
                                             OR fecha_fin_vigencia >= fecha_aplicacion_obligatoria)
);
-- Solo puede existir una versión predeterminada.
CREATE UNIQUE INDEX ux_version_pcge_predeterminada ON version_pcge (predeterminada) WHERE predeterminada;

-- ---------------------------------------------------------------------
-- Fuentes normativas y documentales de cada versión
-- ---------------------------------------------------------------------
CREATE TABLE fuente_normativa (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version_id        BIGINT       NOT NULL REFERENCES version_pcge (id),
    tipo              VARCHAR(20)  NOT NULL,
    titulo            VARCHAR(300) NOT NULL,
    numero            VARCHAR(60),
    entidad_emisora   VARCHAR(200),
    fecha_emision     DATE,
    url               VARCHAR(500),
    nombre_archivo    VARCHAR(200),
    sha256            CHAR(64),
    fecha_consulta    DATE,
    verificada        BOOLEAN      NOT NULL DEFAULT FALSE,
    notas             TEXT,
    creado_en         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_fuente_tipo CHECK (tipo IN ('RESOLUCION', 'DOCUMENTO_OFICIAL', 'REFERENCIA', 'ARCHIVO_IMPORTADO')),
    CONSTRAINT ck_fuente_sha256 CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$')
);
CREATE INDEX ix_fuente_normativa_version ON fuente_normativa (version_id);

-- ---------------------------------------------------------------------
-- Elementos contables (primer dígito del código)
-- ---------------------------------------------------------------------
CREATE TABLE elemento_contable (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version_id      BIGINT       NOT NULL REFERENCES version_pcge (id),
    numero          SMALLINT     NOT NULL,
    denominacion    VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    pagina_fuente   INTEGER,
    seccion_fuente  VARCHAR(120),
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_elemento_version_numero UNIQUE (version_id, numero),
    CONSTRAINT ck_elemento_numero CHECK (numero BETWEEN 0 AND 9)
);

-- ---------------------------------------------------------------------
-- Cuentas contables (jerarquía autorreferenciada)
-- nivel = cantidad de dígitos: 2 cuenta, 3 subcuenta, 4 divisionaria, 5+ subdivisionaria
-- ---------------------------------------------------------------------
CREATE TABLE cuenta_contable (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version_id          BIGINT       NOT NULL REFERENCES version_pcge (id),
    elemento_id         BIGINT       NOT NULL REFERENCES elemento_contable (id),
    padre_id            BIGINT       REFERENCES cuenta_contable (id),
    codigo              VARCHAR(10)  NOT NULL,
    denominacion        VARCHAR(300) NOT NULL,
    descripcion         TEXT,
    nivel               SMALLINT     NOT NULL,
    naturaleza          VARCHAR(10),
    origen              VARCHAR(15)  NOT NULL,
    activa              BOOLEAN      NOT NULL DEFAULT TRUE,
    codigo_fuente       VARCHAR(10),
    observacion_fuente  TEXT,
    pagina_fuente       INTEGER,
    seccion_fuente      VARCHAR(120),
    creado_en           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    creado_por          VARCHAR(60),
    actualizado_por     VARCHAR(60),
    version_registro    INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT uk_cuenta_version_codigo UNIQUE (version_id, codigo),
    CONSTRAINT ck_cuenta_codigo CHECK (codigo ~ '^[0-9]{2,10}$'),
    CONSTRAINT ck_cuenta_nivel CHECK (nivel = length(codigo)),
    CONSTRAINT ck_cuenta_naturaleza CHECK (naturaleza IS NULL OR naturaleza IN ('DEUDORA', 'ACREEDORA')),
    CONSTRAINT ck_cuenta_origen CHECK (origen IN ('OFICIAL', 'IMPORTADA', 'PERSONALIZADA')),
    CONSTRAINT ck_cuenta_padre CHECK ((nivel = 2) = (padre_id IS NULL)),
    CONSTRAINT ck_cuenta_denominacion CHECK (length(btrim(denominacion)) > 0)
);
CREATE INDEX ix_cuenta_version_elemento ON cuenta_contable (version_id, elemento_id);
CREATE INDEX ix_cuenta_padre ON cuenta_contable (padre_id);
CREATE INDEX ix_cuenta_version_nivel ON cuenta_contable (version_id, nivel);
CREATE INDEX ix_cuenta_codigo_prefijo ON cuenta_contable (version_id, codigo varchar_pattern_ops);
CREATE INDEX ix_cuenta_denominacion_trgm ON cuenta_contable USING gin (f_normalizar(denominacion) gin_trgm_ops);

-- Integridad jerárquica: el código de la cuenta debe empezar por el de su padre,
-- tener un dígito más, pertenecer a la misma versión y al elemento de su primer dígito.
CREATE OR REPLACE FUNCTION fn_cuenta_validar_jerarquia() RETURNS TRIGGER
    LANGUAGE plpgsql AS $$
DECLARE
    p          cuenta_contable%ROWTYPE;
    num_elem   SMALLINT;
BEGIN
    SELECT numero INTO num_elem FROM elemento_contable WHERE id = NEW.elemento_id AND version_id = NEW.version_id;
    IF num_elem IS NULL OR num_elem <> substr(NEW.codigo, 1, 1)::SMALLINT THEN
        RAISE EXCEPTION 'La cuenta % no corresponde al elemento indicado', NEW.codigo USING ERRCODE = '23514';
    END IF;
    IF NEW.padre_id IS NOT NULL THEN
        SELECT * INTO p FROM cuenta_contable WHERE id = NEW.padre_id;
        IF p.version_id <> NEW.version_id OR NEW.codigo NOT LIKE p.codigo || '%' OR NEW.nivel <> p.nivel + 1 THEN
            RAISE EXCEPTION 'La cuenta % no es hija válida de la cuenta %', NEW.codigo, p.codigo USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_cuenta_validar_jerarquia
    BEFORE INSERT OR UPDATE OF codigo, padre_id, elemento_id, version_id, nivel ON cuenta_contable
    FOR EACH ROW EXECUTE FUNCTION fn_cuenta_validar_jerarquia();

-- Protección del catálogo base (cuentas oficiales o importadas): solo se permite cambiar el estado (activa) y los
-- datos de auditoría. Las cuentas oficiales no se eliminan. Es una segunda barrera,
-- independiente de las reglas de la aplicación.
CREATE OR REPLACE FUNCTION fn_cuenta_proteger_oficial() RETURNS TRIGGER
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.origen <> 'PERSONALIZADA' THEN
            RAISE EXCEPTION 'Las cuentas oficiales del PCGE no pueden eliminarse (%)', OLD.codigo USING ERRCODE = '42501';
        END IF;
        RETURN OLD;
    END IF;
    IF OLD.origen <> 'PERSONALIZADA' AND (
           NEW.codigo IS DISTINCT FROM OLD.codigo
        OR NEW.denominacion IS DISTINCT FROM OLD.denominacion
        OR NEW.descripcion IS DISTINCT FROM OLD.descripcion
        OR NEW.padre_id IS DISTINCT FROM OLD.padre_id
        OR NEW.elemento_id IS DISTINCT FROM OLD.elemento_id
        OR NEW.version_id IS DISTINCT FROM OLD.version_id
        OR NEW.naturaleza IS DISTINCT FROM OLD.naturaleza
        OR NEW.origen IS DISTINCT FROM OLD.origen
        OR NEW.codigo_fuente IS DISTINCT FROM OLD.codigo_fuente
        OR NEW.observacion_fuente IS DISTINCT FROM OLD.observacion_fuente) THEN
        RAISE EXCEPTION 'La cuenta oficial % está protegida: solo puede activarse o desactivarse', OLD.codigo USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_cuenta_proteger_oficial
    BEFORE UPDATE OR DELETE ON cuenta_contable
    FOR EACH ROW EXECUTE FUNCTION fn_cuenta_proteger_oficial();

-- ---------------------------------------------------------------------
-- Usuarios, roles y permisos
-- ---------------------------------------------------------------------
CREATE TABLE rol (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo      VARCHAR(30)  NOT NULL,
    nombre      VARCHAR(80)  NOT NULL,
    descripcion VARCHAR(300) NOT NULL,
    CONSTRAINT uk_rol_codigo UNIQUE (codigo)
);

CREATE TABLE usuario (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_usuario     VARCHAR(60)  NOT NULL,
    nombre_completo    VARCHAR(150) NOT NULL,
    email              VARCHAR(150) NOT NULL,
    password_hash      VARCHAR(100) NOT NULL,
    activo             BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso      TIMESTAMPTZ,
    creado_en          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizado_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_usuario_nombre UNIQUE (nombre_usuario),
    CONSTRAINT ck_usuario_nombre CHECK (nombre_usuario ~ '^[a-z0-9._-]{3,60}$')
);
CREATE UNIQUE INDEX ux_usuario_email ON usuario (lower(email));

CREATE TABLE usuario_rol (
    usuario_id BIGINT NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    rol_id     BIGINT NOT NULL REFERENCES rol (id),
    PRIMARY KEY (usuario_id, rol_id)
);

INSERT INTO rol (codigo, nombre, descripcion) VALUES
    ('ADMINISTRADOR', 'Administrador', 'Acceso total: usuarios, configuración, importación del catálogo y cuentas personalizadas.'),
    ('CONTADOR',      'Contador',      'Consulta y exporta el catálogo; registra, edita, activa y desactiva cuentas.'),
    ('AUXILIAR',      'Auxiliar contable', 'Consulta y exporta el catálogo. No realiza modificaciones.');

-- ---------------------------------------------------------------------
-- Historial de cambios (auditoría)
-- ---------------------------------------------------------------------
CREATE TABLE historial_cambios (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entidad         VARCHAR(30)  NOT NULL,
    entidad_id      BIGINT,
    cuenta_id       BIGINT       REFERENCES cuenta_contable (id),
    version_id      BIGINT       REFERENCES version_pcge (id),
    accion          VARCHAR(20)  NOT NULL,
    resumen         VARCHAR(300) NOT NULL,
    detalle         JSONB,
    motivo          VARCHAR(500),
    usuario_id      BIGINT       REFERENCES usuario (id),
    nombre_usuario  VARCHAR(60)  NOT NULL,
    fecha           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_historial_accion CHECK (accion IN ('CREACION', 'MODIFICACION', 'ACTIVACION', 'DESACTIVACION',
                                                    'IMPORTACION', 'CONFIGURACION'))
);
CREATE INDEX ix_historial_cuenta ON historial_cambios (cuenta_id, fecha DESC);
CREATE INDEX ix_historial_fecha ON historial_cambios (fecha DESC);
CREATE INDEX ix_historial_version ON historial_cambios (version_id, fecha DESC);

-- El historial es de solo inserción: no se puede modificar ni borrar.
CREATE OR REPLACE FUNCTION fn_historial_inmutable() RETURNS TRIGGER
    LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'El historial de cambios no puede modificarse' USING ERRCODE = '42501';
END $$;

CREATE TRIGGER tg_historial_inmutable
    BEFORE UPDATE OR DELETE ON historial_cambios
    FOR EACH ROW EXECUTE FUNCTION fn_historial_inmutable();
