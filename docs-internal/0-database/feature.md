# Recipe feature database notes

Updated for the recipe editor rollout:

- `Recipe` now supports standalone recipes (`cookbookId` nullable).
- Draft/autosave metadata is persisted on `Recipe` (`draftSavedAt`, `lastAutosavedAt`, `autosaveVersion`, `status`, `publishedAt`).
- Recipe image storage keeps file metadata/path only (`imagePath`, mime, dimensions, byte size); binary image blobs are not stored in Postgres.
- Recipe tags are modeled with `RecipeTag` + `RecipeTagOnRecipe` and household-scoped normalized uniqueness.
- Ingredients and units are household-scoped entities with normalized uniqueness.
- Ingredient translation rows are stored in `IngredientTranslation` to support locale-aware inline creation/search.
- Ingredient rows are mixed-kind (`RecipeIngredientRowKind`) with per-row `position`:
  - `HEADING`: uses `heading`
  - `ITEM`: uses `ingredientId` (required at validation layer), optional `quantity` and `unitId`
- Duplicate ingredient rows are intentionally allowed (no unique constraint on ingredient in a recipe).
- Instructions are stored inline as JSON on `Recipe.instructions` (no separate instruction table).
