import fs from 'fs/promises';
import path from 'path';
import { CreateMigrationOptions } from './types';
const LIB_NAME = 'pg-schema-builder'
const templates = {
  table: (name: string) => `import { BaseMigration } from '${LIB_NAME}';

export default class extends BaseMigration {
  async up() {
    await this.schema.createTable('${name}', (table) => {
      table.increments('id');
      table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
      table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
    });
  }

  async down() {
    await this.schema.dropTable('${name}');
  }
}
`,

  alter: (tableName: string) => `import { BaseMigration } from '${LIB_NAME}';

export default class extends BaseMigration {
  async up() {
    await this.schema.alterTable('${tableName}', (table) => {
      // Add your column changes here
      // table.string('new_column');
      // table.dropColumn('old_column');
    });
  }

  async down() {
    await this.schema.alterTable('${tableName}', (table) => {
      // Reverse your changes here
      // table.dropColumn('new_column');
      // table.string('old_column');
    });
  }
}
`,

  raw: () => `import { BaseMigration } from '${LIB_NAME}';

export default class extends BaseMigration {
  async up() {
    // Write your migration logic here
    await this.schema.raw('-- Your SQL here');
  }

  async down() {
    // Write your rollback logic here
    await this.schema.raw('-- Your rollback SQL here');
  }
}
`
};

export async function createMigration(
  name: string, 
  options: CreateMigrationOptions = {}
): Promise<string> {
  const { template = 'raw', migrationsDir = './migrations' } = options;
  
  // Создаем директорию если не существует
  await fs.mkdir(migrationsDir, { recursive: true });
  
  // Генерируем timestamp
  const timestamp = new Date().toISOString()
    .replace(/[-T:\.Z]/g, '')
    .slice(0, 14);
  
  // Очищаем имя миграции
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  const filename = `${timestamp}_${cleanName}.mjs`;
  const filepath = path.join(migrationsDir, filename);
  
  // Извлекаем имя таблицы из имени миграции для шаблонов
  const tableName = cleanName.replace(/^(create|add|alter|drop)_/, '');
  
  let content: string;
  switch (template) {
    case 'table':
      content = templates.table(tableName);
      break;
    case 'alter':
      content = templates.alter(tableName);
      break;
    default:
      content = templates.raw();
  }
  
  await fs.writeFile(filepath, content, 'utf8');
  
  return filename;
}