import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('MealPlanItem', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    recipeId: {
      type: 'text',
      references: '"Recipe"',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    title: { type: 'varchar(500)', notNull: true },
    date: { type: 'date' },
    weekStartDate: { type: 'date', notNull: true },
    mealType: { type: 'varchar(50)', notNull: true, default: 'dinner' },
    servings: { type: 'integer' },
    completed: { type: 'boolean', notNull: true, default: false },
    notes: { type: 'text' },
    position: { type: 'integer', notNull: true, default: 0 },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true },
  });

  pgm.createIndex('MealPlanItem', 'householdId');
  pgm.createIndex('MealPlanItem', ['householdId', 'weekStartDate']);
  pgm.createIndex('MealPlanItem', ['householdId', 'date']);
  pgm.createIndex('MealPlanItem', 'recipeId');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('MealPlanItem');
}
