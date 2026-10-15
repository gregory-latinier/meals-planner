import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('Ingredient', {
    alwaysInStock: { type: 'boolean', notNull: true, default: false },
  });

  pgm.createType('ShoppingListStatus', ['ACTIVE', 'COMPLETED']);
  pgm.createType('ShoppingListItemSource', ['RECIPE', 'MANUAL']);

  pgm.createTable('ShoppingList', {
    id: { type: 'text', primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    status: { type: '"ShoppingListStatus"', notNull: true, default: 'ACTIVE' },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completedAt: { type: 'timestamp(3)' },
  });

  pgm.createIndex('ShoppingList', ['householdId', 'createdAt']);
  // At most one active list per household.
  pgm.createIndex('ShoppingList', 'householdId', {
    name: 'ShoppingList_one_active_per_household',
    unique: true,
    where: `"status" = 'ACTIVE'`,
  });

  pgm.createTable('ShoppingListItem', {
    id: { type: 'text', primaryKey: true },
    listId: {
      type: 'text',
      notNull: true,
      references: '"ShoppingList"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    ingredientId: {
      type: 'text',
      references: '"Ingredient"',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    name: { type: 'varchar(300)', notNull: true },
    nameNormalized: { type: 'varchar(300)', notNull: true },
    // [{ amount: number | null, text: string | null, unitId: string | null, unitName: string | null }]
    quantities: { type: 'jsonb', notNull: true, default: pgm.func(`'[]'::jsonb`) },
    // Free-text quantity typed by hand; takes precedence over `quantities` for display.
    quantityText: { type: 'varchar(200)' },
    storeId: {
      type: 'text',
      references: '"Store"',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    source: { type: '"ShoppingListItemSource"', notNull: true, default: 'MANUAL' },
    // Always-in-stock ingredient: shown in the collapsed "check your pantry" section.
    pantryCheck: { type: 'boolean', notNull: true, default: false },
    checked: { type: 'boolean', notNull: true, default: false },
    checkedAt: { type: 'timestamp(3)' },
    position: { type: 'integer', notNull: true, default: 0 },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createIndex('ShoppingListItem', 'listId');
  pgm.createIndex('ShoppingListItem', 'ingredientId');
  pgm.createIndex('ShoppingListItem', 'storeId');

  pgm.createTable('ShoppingListMealPlanItem', {
    listId: {
      type: 'text',
      notNull: true,
      references: '"ShoppingList"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    mealPlanItemId: {
      type: 'text',
      notNull: true,
      references: '"MealPlanItem"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.addConstraint('ShoppingListMealPlanItem', 'ShoppingListMealPlanItem_pkey', {
    primaryKey: ['listId', 'mealPlanItemId'],
  });
  pgm.createIndex('ShoppingListMealPlanItem', 'mealPlanItemId');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('ShoppingListMealPlanItem');
  pgm.dropTable('ShoppingListItem');
  pgm.dropTable('ShoppingList');
  pgm.dropType('ShoppingListItemSource');
  pgm.dropType('ShoppingListStatus');
  pgm.dropColumn('Ingredient', 'alwaysInStock');
}
