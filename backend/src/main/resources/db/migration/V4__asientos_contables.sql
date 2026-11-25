-- =====================================================================
-- CONTABILIDAD - Módulo de asientos contables (partida doble)
-- Base del libro diario, libro mayor, balance de comprobación y reportes.
-- =====================================================================

-- Nueva acción de auditoría: anulación de asientos.
ALTER TABLE historial_cambios DROP CONSTRAINT ck_historial_accion;
ALTER TABLE historial_cambios ADD CONSTRAINT ck_historial_accion CHECK (accion IN (
    'CREACION', 'MODIFICACION', 'ACTIVACION', 'DESACTIVACION', 'IMPORTACION', 'CONFIGURACION', 'ANULACION'));

-- Alcance de los roles con el nuevo módulo.
UPDATE rol SET descripcion = 'Acceso total: usuarios, configuración, importación del catálogo, cuentas personalizadas, asientos y reportes.'
 WHERE codigo = 'ADMINISTRADOR';
UPDATE rol SET descripcion = 'Gestiona las cuentas del catálogo, registra y anula asientos, y consulta libros y reportes.'
 WHERE codigo = 'CONTADOR';
UPDATE rol SET descripcion = 'Consulta el catálogo, registra asientos y consulta libros y reportes. No modifica el catálogo ni anula asientos.'
 WHERE codigo = 'AUXILIAR';

-- ---------------------------------------------------------------------
-- Correlativo anual de asientos (numeración sin huecos por ejercicio)
-- ---------------------------------------------------------------------
CREATE TABLE correlativo_asiento (
    anio    SMALLINT PRIMARY KEY,
    ultimo  INTEGER  NOT NULL CHECK (ultimo > 0)
);

-- ---------------------------------------------------------------------
-- Asiento contable (cabecera)
-- ---------------------------------------------------------------------
CREATE TABLE asiento_contable (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version_id            BIGINT        NOT NULL REFERENCES version_pcge (id),
    anio                  SMALLINT      NOT NULL,
    numero                INTEGER       NOT NULL,
    fecha                 DATE          NOT NULL,
    glosa                 VARCHAR(300)  NOT NULL,
    documento_referencia  VARCHAR(60),
    moneda                CHAR(3)       NOT NULL DEFAULT 'PEN',
    estado                VARCHAR(10)   NOT NULL DEFAULT 'REGISTRADO',
    total_debe            NUMERIC(18,2) NOT NULL,
    total_haber           NUMERIC(18,2) NOT NULL,
    motivo_anulacion      VARCHAR(500),
    anulado_por           VARCHAR(60),
    anulado_en            TIMESTAMPTZ,
    creado_por            VARCHAR(60)   NOT NULL,
    creado_en             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uk_asiento_anio_numero UNIQUE (anio, numero),
    CONSTRAINT ck_asiento_anio CHECK (anio = extract(YEAR FROM fecha)),
    CONSTRAINT ck_asiento_estado CHECK (estado IN ('REGISTRADO', 'ANULADO')),
    CONSTRAINT ck_asiento_cuadre CHECK (total_debe = total_haber AND total_debe > 0),
    CONSTRAINT ck_asiento_moneda CHECK (moneda = 'PEN'),
    CONSTRAINT ck_asiento_glosa CHECK (length(btrim(glosa)) > 0),
    CONSTRAINT ck_asiento_anulacion CHECK ((estado = 'ANULADO') = (motivo_anulacion IS NOT NULL))
);
CREATE INDEX ix_asiento_version_fecha ON asiento_contable (version_id, fecha, numero);

-- ---------------------------------------------------------------------
-- Líneas del asiento
-- ---------------------------------------------------------------------
CREATE TABLE asiento_detalle (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    asiento_id  BIGINT        NOT NULL REFERENCES asiento_contable (id),
    linea       SMALLINT      NOT NULL,
    cuenta_id   BIGINT        NOT NULL REFERENCES cuenta_contable (id),
    glosa       VARCHAR(300),
    debe        NUMERIC(18,2) NOT NULL DEFAULT 0,
    haber       NUMERIC(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT uk_detalle_linea UNIQUE (asiento_id, linea),
    -- Cada línea va al debe o al haber, nunca a ambos ni con importe cero o negativo.
    CONSTRAINT ck_detalle_importes CHECK (debe >= 0 AND haber >= 0 AND (debe > 0) <> (haber > 0))
);
CREATE INDEX ix_detalle_asiento ON asiento_detalle (asiento_id);
CREATE INDEX ix_detalle_cuenta ON asiento_detalle (cuenta_id);

-- Verificación al confirmar la transacción: el asiento cuadra (debe = haber), tiene al menos
-- dos líneas, los totales de la cabecera coinciden con las líneas y todas las cuentas
-- pertenecen a la misma versión del catálogo que el asiento.
CREATE OR REPLACE FUNCTION fn_asiento_verificar() RETURNS TRIGGER
    LANGUAGE plpgsql AS $$
DECLARE
    v_id      BIGINT;
    a         asiento_contable%ROWTYPE;
    s_debe    NUMERIC(18,2);
    s_haber   NUMERIC(18,2);
    n_lineas  INTEGER;
    n_ajenas  INTEGER;
BEGIN
    IF TG_TABLE_NAME = 'asiento_contable' THEN
        v_id := NEW.id;
    ELSE
        v_id := NEW.asiento_id;
    END IF;
    SELECT * INTO a FROM asiento_contable WHERE id = v_id;
    SELECT coalesce(sum(debe), 0), coalesce(sum(haber), 0), count(*) INTO s_debe, s_haber, n_lineas
      FROM asiento_detalle WHERE asiento_id = v_id;
    SELECT count(*) INTO n_ajenas FROM asiento_detalle d JOIN cuenta_contable c ON c.id = d.cuenta_id
     WHERE d.asiento_id = v_id AND c.version_id <> a.version_id;
    IF n_lineas < 2 OR s_debe <> s_haber OR s_debe <> a.total_debe OR s_haber <> a.total_haber OR n_ajenas > 0 THEN
        RAISE EXCEPTION 'El asiento %-% no cuadra o tiene líneas inválidas (debe %, haber %, % líneas)',
            a.anio, a.numero, s_debe, s_haber, n_lineas USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER tg_asiento_verificar
    AFTER INSERT ON asiento_contable DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_asiento_verificar();

CREATE CONSTRAINT TRIGGER tg_detalle_verificar
    AFTER INSERT ON asiento_detalle DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fn_asiento_verificar();

-- Inmutabilidad: un asiento registrado no se edita ni se elimina. La única modificación
-- admitida es su anulación (con motivo), que lo conserva para la trazabilidad.
CREATE OR REPLACE FUNCTION fn_asiento_inmutable() RETURNS TRIGGER
    LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME = 'asiento_detalle' OR TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Los asientos registrados no pueden modificarse ni eliminarse; corresponde anularlos'
            USING ERRCODE = '42501';
    END IF;
    IF OLD.estado = 'REGISTRADO' AND NEW.estado = 'ANULADO'
       AND (NEW.version_id, NEW.anio, NEW.numero, NEW.fecha, NEW.glosa, NEW.documento_referencia, NEW.moneda,
            NEW.total_debe, NEW.total_haber, NEW.creado_por, NEW.creado_en)
           IS NOT DISTINCT FROM
           (OLD.version_id, OLD.anio, OLD.numero, OLD.fecha, OLD.glosa, OLD.documento_referencia, OLD.moneda,
            OLD.total_debe, OLD.total_haber, OLD.creado_por, OLD.creado_en) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Los asientos registrados no pueden modificarse; solo pueden anularse una vez'
        USING ERRCODE = '42501';
END $$;

CREATE TRIGGER tg_asiento_inmutable
    BEFORE UPDATE OR DELETE ON asiento_contable
    FOR EACH ROW EXECUTE FUNCTION fn_asiento_inmutable();

CREATE TRIGGER tg_detalle_inmutable
    BEFORE UPDATE OR DELETE ON asiento_detalle
    FOR EACH ROW EXECUTE FUNCTION fn_asiento_inmutable();
