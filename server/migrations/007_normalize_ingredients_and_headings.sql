-- Migration 007: normalise les données existantes
--   - noms d'ingrédients en minuscules
--   - titres de section (ingrédients et étapes) avec la première lettre en majuscule
-- Idempotent : chaque UPDATE ne touche que les lignes à corriger.
-- Ne modifie ni "updatedAt" ni "autosaveVersion".
-- ATTENTION : la casse d'origine n'est pas récupérable, faire une sauvegarde avant.

-- 1. Ingrédients en minuscules
UPDATE public."Ingredient"
SET "name" = lower(btrim("name"))
WHERE "name" <> lower(btrim("name"));

-- 2. Titres de section des ingrédients
UPDATE public."RecipeIngredientRow"
SET "heading" = upper(left(btrim("heading"), 1)) || substr(btrim("heading"), 2)
WHERE "kind" = 'HEADING'
  AND "heading" IS NOT NULL
  AND btrim("heading") <> ''
  AND "heading" <> (upper(left(btrim("heading"), 1)) || substr(btrim("heading"), 2));

-- 3. Titres de section des étapes (JSONB : [{ "kind": "heading" | "item", "text": "..." }])
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

-- 4. Enregistrement dans la table de migrations pour rester synchronisé avec node-pg-migrate
INSERT INTO public.pgmigrations (name, run_on)
SELECT '007_normalize_ingredients_and_headings', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '007_normalize_ingredients_and_headings'
);
