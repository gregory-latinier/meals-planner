-- 1. Ajout de la colonne pour le premier jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
ALTER TABLE public."HouseholdPreferences"
  ADD COLUMN IF NOT EXISTS "weekStartDay" integer DEFAULT 1 NOT NULL;

-- 2. Ajout de la contrainte de validation (valeur entre 0 et 6)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_week_start_day_valid'
  ) THEN
    ALTER TABLE public."HouseholdPreferences"
      ADD CONSTRAINT check_week_start_day_valid
      CHECK ("weekStartDay" >= 0 AND "weekStartDay" <= 6);
  END IF;
END $$;

-- 3. Enregistrement dans la table de migrations pour rester synchronisé avec node-pg-migrate
INSERT INTO public.pgmigrations (name, run_on)
SELECT '006_add_week_start_day', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.pgmigrations WHERE name = '006_add_week_start_day'
);

-- Optionnel : pour basculer immédiatement les foyers existants sur le samedi (6) :
-- UPDATE public."HouseholdPreferences" SET "weekStartDay" = 6;
