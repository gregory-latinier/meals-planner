import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('RecipeImageProvider', ['NANO_BANANA', 'FREE_PROVIDER']);
  pgm.addColumn('Household', {
    recipeImageProvider: {
      type: 'RecipeImageProvider',
      notNull: true,
      default: 'NANO_BANANA',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('Household', 'recipeImageProvider');
  pgm.dropType('RecipeImageProvider');
}
