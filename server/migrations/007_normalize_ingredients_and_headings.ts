import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

// Same SQL as 007_normalize_ingredients_and_headings.sql (without the pgmigrations bookkeeping).
// Idempotent, and leaves "updatedAt" / "autosaveVersion" untouched.
export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Ingredient names in lowercase
  pgm.sql(`
    UPDATE public."Ingredient"
    SET "name" = lower(btrim("name"))
    WHERE "name" <> lower(btrim("name"));
  `);

  // 2. Ingredient section headings: first letter capitalized
  pgm.sql(`
    UPDATE public."RecipeIngredientRow"
    SET "heading" = upper(left(btrim("heading"), 1)) || substr(btrim("heading"), 2)
    WHERE "kind" = 'HEADING'
      AND "heading" IS NOT NULL
      AND btrim("heading") <> ''
      AND "heading" <> (upper(left(btrim("heading"), 1)) || substr(btrim("heading"), 2));
  `);

  // 3. Instruction section headings (JSONB array of { kind, text })
  pgm.sql(`
    UPDATE public."Recipe" r
    SET "instructions" = (
      SELECT jsonb_agg(
        CASE
          WHEN t.elem->>'kind' = 'heading' AND jsonb_typeof(t.elem->'text') = 'string'
            THEN jsonb_set(
              t.elem,
              '{text}',
              to_jsonb(upper(left(btrim(t.elem->>'text'), 1)) || substr(btrim(t.elem->>'text'), 2))
            )
          ELSE t.elem
        END
        ORDER BY t.ord
      )
      FROM jsonb_array_elements(r."instructions") WITH ORDINALITY AS t(elem, ord)
    )
    WHERE jsonb_typeof(r."instructions") = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(r."instructions") AS e(elem)
        WHERE e.elem->>'kind' = 'heading'
          AND jsonb_typeof(e.elem->'text') = 'string'
          AND btrim(e.elem->>'text') <> ''
          AND (e.elem->>'text') <> (upper(left(btrim(e.elem->>'text'), 1)) || substr(btrim(e.elem->>'text'), 2))
      );
  `);
}

// The original casing is lost, so there is nothing to restore.
export async function down(_pgm: MigrationBuilder): Promise<void> {}
