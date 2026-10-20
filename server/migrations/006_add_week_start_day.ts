import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('HouseholdPreferences', {
    weekStartDay: {
      type: 'integer',
      notNull: true,
      default: 1, // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    },
  });

  pgm.addConstraint('HouseholdPreferences', 'check_week_start_day_valid', {
    check: '"weekStartDay" >= 0 AND "weekStartDay" <= 6',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('HouseholdPreferences', 'check_week_start_day_valid');
  pgm.dropColumn('HouseholdPreferences', 'weekStartDay');
}
