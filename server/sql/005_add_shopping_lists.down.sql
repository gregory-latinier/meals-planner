-- Annulation de la migration 005 (équivalent manuel de `down` dans 005_add_shopping_lists.ts).
-- ATTENTION : supprime toutes les listes de courses et la colonne "alwaysInStock".

BEGIN;

DROP TABLE "ShoppingListMealPlanItem";
DROP TABLE "ShoppingListItem";
DROP TABLE "ShoppingList";
DROP TYPE "ShoppingListItemSource";
DROP TYPE "ShoppingListStatus";
ALTER TABLE "Ingredient" DROP COLUMN "alwaysInStock";

DELETE FROM "pgmigrations" WHERE "name" = '005_add_shopping_lists';

COMMIT;
