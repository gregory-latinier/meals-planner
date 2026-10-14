import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Household table
  pgm.createTable('Household', {
    id: { type: 'text', notNull: true, primaryKey: true },
    passwordHash: { type: 'text', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });

  // Session table
  pgm.createTable('Session', {
    id: { type: 'text', notNull: true, primaryKey: true },
    token: { type: 'text', notNull: true, unique: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    expiresAt: { type: 'timestamp(3)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('Session', 'token');
  pgm.createIndex('Session', 'householdId');

  // PasswordResetToken table
  pgm.createTable('PasswordResetToken', {
    id: { type: 'text', notNull: true, primaryKey: true },
    token: { type: 'text', notNull: true, unique: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    expiresAt: { type: 'timestamp(3)', notNull: true },
    used: { type: 'boolean', notNull: true, default: false },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.createIndex('PasswordResetToken', 'token');

  // Cookbook table
  pgm.createTable('Cookbook', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    name: { type: 'varchar(500)', notNull: true },
    nameNormalized: { type: 'varchar(500)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('Cookbook', 'householdId');
  pgm.createIndex('Cookbook', 'updatedAt');
  pgm.addConstraint('Cookbook', 'Cookbook_householdId_nameNormalized_key', {
    unique: ['householdId', 'nameNormalized']
  });

  // Store table
  pgm.createTable('Store', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    name: { type: 'varchar(500)', notNull: true },
    nameNormalized: { type: 'varchar(500)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('Store', 'householdId');
  pgm.createIndex('Store', 'updatedAt');
  pgm.addConstraint('Store', 'Store_householdId_nameNormalized_key', {
    unique: ['householdId', 'nameNormalized']
  });

  // Recipe enums
  pgm.createType('RecipeStatus', ['DRAFT', 'PUBLISHED']);
  pgm.createType('RecipeIngredientRowKind', ['HEADING', 'ITEM']);
  pgm.createType('RecipeExtractionModel', ['GEMINI_FREE']);

  // Add Household columns from later migrations
  pgm.addColumn('Household', {
    recipeExtractionModel: { type: 'RecipeExtractionModel', notNull: true, default: 'GEMINI_FREE' },
    geminiApiKeyEncrypted: { type: 'text' },
    geminiApiKeyMasked: { type: 'varchar(32)' },
    geminiApiKeyUpdatedAt: { type: 'timestamp(3)' }
  });

  // Recipe table
  pgm.createTable('Recipe', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    cookbookId: {
      type: 'text',
      references: '"Cookbook"',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    title: { type: 'varchar(500)', notNull: true },
    status: { type: 'RecipeStatus', notNull: true, default: 'DRAFT' },
    servings: { type: 'integer' },
    prepMinutes: { type: 'integer' },
    cookMinutes: { type: 'integer' },
    sourceUrl: { type: 'text' },
    instructions: { type: 'jsonb', notNull: true },
    imagePath: { type: 'varchar(1024)' },
    imageMimeType: { type: 'varchar(100)' },
    imageWidth: { type: 'integer' },
    imageHeight: { type: 'integer' },
    imageSizeBytes: { type: 'integer' },
    draftSavedAt: { type: 'timestamp(3)' },
    lastAutosavedAt: { type: 'timestamp(3)' },
    autosaveVersion: { type: 'integer', notNull: true, default: 0 },
    publishedAt: { type: 'timestamp(3)' },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('Recipe', ['householdId', 'updatedAt']);
  pgm.createIndex('Recipe', ['householdId', 'status', 'updatedAt']);
  pgm.createIndex('Recipe', 'cookbookId');

  // RecipeTag table
  pgm.createTable('RecipeTag', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    name: { type: 'varchar(100)', notNull: true },
    nameNormalized: { type: 'varchar(100)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('RecipeTag', 'householdId');
  pgm.createIndex('RecipeTag', ['householdId', 'name']);
  pgm.addConstraint('RecipeTag', 'RecipeTag_householdId_nameNormalized_key', {
    unique: ['householdId', 'nameNormalized']
  });

  // RecipeTagOnRecipe table
  pgm.createTable('RecipeTagOnRecipe', {
    recipeId: {
      type: 'text',
      notNull: true,
      references: '"Recipe"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    tagId: {
      type: 'text',
      notNull: true,
      references: '"RecipeTag"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });
  pgm.addConstraint('RecipeTagOnRecipe', 'RecipeTagOnRecipe_pkey', {
    primaryKey: ['recipeId', 'tagId']
  });
  pgm.createIndex('RecipeTagOnRecipe', 'tagId');

  // Ingredient table
  pgm.createTable('Ingredient', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    name: { type: 'varchar(300)', notNull: true },
    nameNormalized: { type: 'varchar(300)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('Ingredient', 'householdId');
  pgm.createIndex('Ingredient', ['householdId', 'name']);
  pgm.addConstraint('Ingredient', 'Ingredient_householdId_nameNormalized_key', {
    unique: ['householdId', 'nameNormalized']
  });

  // IngredientTranslation table
  pgm.createTable('IngredientTranslation', {
    id: { type: 'text', notNull: true, primaryKey: true },
    ingredientId: {
      type: 'text',
      notNull: true,
      references: '"Ingredient"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    locale: { type: 'varchar(8)', notNull: true },
    name: { type: 'varchar(300)', notNull: true },
    nameNormalized: { type: 'varchar(300)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.addConstraint('IngredientTranslation', 'IngredientTranslation_ingredientId_locale_key', {
    unique: ['ingredientId', 'locale']
  });
  pgm.createIndex('IngredientTranslation', ['locale', 'nameNormalized']);

  // Unit table
  pgm.createTable('Unit', {
    id: { type: 'text', notNull: true, primaryKey: true },
    householdId: {
      type: 'text',
      notNull: true,
      references: '"Household"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    name: { type: 'varchar(100)', notNull: true },
    nameNormalized: { type: 'varchar(100)', notNull: true },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('Unit', 'householdId');
  pgm.createIndex('Unit', ['householdId', 'name']);
  pgm.addConstraint('Unit', 'Unit_householdId_nameNormalized_key', {
    unique: ['householdId', 'nameNormalized']
  });

  // RecipeIngredientRow table
  pgm.createTable('RecipeIngredientRow', {
    id: { type: 'text', notNull: true, primaryKey: true },
    recipeId: {
      type: 'text',
      notNull: true,
      references: '"Recipe"',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    position: { type: 'integer', notNull: true },
    kind: { type: 'RecipeIngredientRowKind', notNull: true },
    heading: { type: 'varchar(500)' },
    ingredientId: {
      type: 'text',
      references: '"Ingredient"',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    quantity: { type: 'varchar(100)' },
    unitId: {
      type: 'text',
      references: '"Unit"',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },
    note: { type: 'varchar(500)' },
    createdAt: { type: 'timestamp(3)', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp(3)', notNull: true }
  });
  pgm.createIndex('RecipeIngredientRow', ['recipeId', 'position']);
  pgm.createIndex('RecipeIngredientRow', 'ingredientId');
  pgm.createIndex('RecipeIngredientRow', 'unitId');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('RecipeIngredientRow');
  pgm.dropTable('Unit');
  pgm.dropTable('IngredientTranslation');
  pgm.dropTable('Ingredient');
  pgm.dropTable('RecipeTagOnRecipe');
  pgm.dropTable('RecipeTag');
  pgm.dropTable('Recipe');
  pgm.dropTable('Store');
  pgm.dropTable('Cookbook');
  pgm.dropTable('PasswordResetToken');
  pgm.dropTable('Session');
  pgm.dropTable('Household');
  pgm.dropType('RecipeExtractionModel');
  pgm.dropType('RecipeIngredientRowKind');
  pgm.dropType('RecipeStatus');
}
