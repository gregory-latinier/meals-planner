import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('HouseholdPreferences', {
    householdId: {
      type: 'text',
      notNull: true,
      primaryKey: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    defaultMealPlanServings: {
      type: 'integer',
      notNull: true,
      default: 4,
    },
    createdAt: {
      type: 'timestamp(3)',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
      type: 'timestamp(3)',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint('HouseholdPreferences', 'check_default_meal_plan_servings_positive', {
    check: '"defaultMealPlanServings" > 0',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('HouseholdPreferences');
}
