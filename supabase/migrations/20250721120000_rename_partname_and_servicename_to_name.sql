-- Migration: rename legacy partName/serviceName JSON keys (and table columns) to `name`
-- Scope:
--   - public.* tables with dedicated columns named part_name / service_name
--   - public.maintenance_submissions (parts_replaced, services_performed)
--   - public.companies (form_data)
--
-- The migration is idempotent: it only touches rows whose JSON text still
-- contains any of the old keys, and it skips elements that already have a
-- `name` key. Column renames are skipped when a `name` column already exists.
--
-- NOTE: This migration may scan large JSONB columns. Run it during a low-traffic
-- window on production projects.

-- 1. Rename any dedicated table columns first
DO $$
DECLARE
    col record;
    has_name boolean;
    sql text;
BEGIN
    FOR col IN
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name IN ('part_name', 'service_name')
        ORDER BY table_name, column_name
    LOOP
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = col.table_schema
              AND table_name = col.table_name
              AND column_name = 'name'
        ) INTO has_name;

        IF has_name THEN
            RAISE NOTICE 'Skipping rename: %.% already has a "name" column',
                col.table_schema, col.table_name;
            CONTINUE;
        END IF;

        sql := format(
            'ALTER TABLE %I.%I RENAME COLUMN %I TO name',
            col.table_schema,
            col.table_name,
            col.column_name
        );

        BEGIN
            EXECUTE sql;
            RAISE NOTICE 'Renamed column %.% -> name', col.table_name, col.column_name;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Failed to rename %.% (%): %', col.table_name, col.column_name, col.column_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Helper function for recursively normalising JSONB objects
CREATE OR REPLACE FUNCTION public.migrate_cmr_part_service_names(input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    obj_key text;
    obj_value jsonb;
    new_obj jsonb := '{}'::jsonb;
    arr jsonb := '[]'::jsonb;
    el jsonb;
BEGIN
    IF jsonb_typeof(input) = 'array' THEN
        FOR el IN SELECT * FROM jsonb_array_elements(input)
        LOOP
            arr := arr || public.migrate_cmr_part_service_names(el);
        END LOOP;
        RETURN arr;
    ELSIF jsonb_typeof(input) = 'object' THEN
        FOR obj_key, obj_value IN SELECT * FROM jsonb_each(input)
        LOOP
            IF obj_key IN ('partName', 'part_name', 'serviceName', 'service_name') THEN
                -- Promote the legacy key to `name` only if `name` is not already present.
                IF NOT (new_obj ? 'name') THEN
                    new_obj := jsonb_set(new_obj, '{name}', public.migrate_cmr_part_service_names(obj_value), true);
                END IF;
            ELSE
                new_obj := jsonb_set(new_obj, ARRAY[obj_key], public.migrate_cmr_part_service_names(obj_value), true);
            END IF;
        END LOOP;
        RETURN new_obj;
    ELSE
        RETURN input;
    END IF;
END;
$$;

-- 3. Migrate JSONB columns
DO $$
DECLARE
    v_parts_replaced_is_jsonb boolean := false;
    v_services_performed_is_jsonb boolean := false;
    v_form_data_is_jsonb boolean := false;
BEGIN
    -- maintenance_submissions
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'maintenance_submissions'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'maintenance_submissions'
              AND column_name = 'parts_replaced'
              AND data_type = 'jsonb'
        ) INTO v_parts_replaced_is_jsonb;

        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'maintenance_submissions'
              AND column_name = 'services_performed'
              AND data_type = 'jsonb'
        ) INTO v_services_performed_is_jsonb;

        IF v_parts_replaced_is_jsonb OR v_services_performed_is_jsonb THEN
            UPDATE public.maintenance_submissions
            SET parts_replaced = CASE WHEN v_parts_replaced_is_jsonb THEN public.migrate_cmr_part_service_names(parts_replaced) ELSE parts_replaced END,
                services_performed = CASE WHEN v_services_performed_is_jsonb THEN public.migrate_cmr_part_service_names(services_performed) ELSE services_performed END
            WHERE parts_replaced::text ILIKE '%"partName"%'
               OR parts_replaced::text ILIKE '%"part_name"%'
               OR services_performed::text ILIKE '%"serviceName"%'
               OR services_performed::text ILIKE '%"service_name"%';
        END IF;
    END IF;

    -- companies.form_data
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
    ) THEN
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'companies'
              AND column_name = 'form_data'
              AND data_type = 'jsonb'
        ) INTO v_form_data_is_jsonb;

        IF v_form_data_is_jsonb THEN
            UPDATE public.companies
            SET form_data = public.migrate_cmr_part_service_names(form_data)
            WHERE form_data::text ILIKE '%"partName"%'
               OR form_data::text ILIKE '%"part_name"%'
               OR form_data::text ILIKE '%"serviceName"%'
               OR form_data::text ILIKE '%"service_name"%';
        END IF;
    END IF;
END $$;

-- 4. Verification: fail fast if any legacy keys survived the migration
DO $$
DECLARE
    ms_count integer := 0;
    c_count integer := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maintenance_submissions') THEN
        SELECT count(*) INTO ms_count
        FROM public.maintenance_submissions
        WHERE parts_replaced::text ILIKE '%"partName"%'
           OR parts_replaced::text ILIKE '%"part_name"%'
           OR services_performed::text ILIKE '%"serviceName"%'
           OR services_performed::text ILIKE '%"service_name"%';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
        SELECT count(*) INTO c_count
        FROM public.companies
        WHERE form_data::text ILIKE '%"partName"%'
           OR form_data::text ILIKE '%"part_name"%'
           OR form_data::text ILIKE '%"serviceName"%'
           OR form_data::text ILIKE '%"service_name"%';
    END IF;

    IF ms_count > 0 OR c_count > 0 THEN
        RAISE EXCEPTION 'Legacy part/service keys remain after migration: maintenance_submissions=%, companies=%', ms_count, c_count;
    END IF;
END $$;

-- 5. Ensure no dedicated part_name/service_name columns are left behind
DO $$
DECLARE
    remaining_columns integer;
BEGIN
    SELECT count(*) INTO remaining_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('part_name', 'service_name');

    IF remaining_columns > 0 THEN
        RAISE EXCEPTION 'Migration could not rename % column(s) named part_name/service_name. Resolve dependencies and retry.', remaining_columns;
    END IF;
END $$;

-- 6. Clean up the helper function after the migration runs.
DROP FUNCTION IF EXISTS public.migrate_cmr_part_service_names(jsonb);
