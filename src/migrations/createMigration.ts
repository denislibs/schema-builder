import fs from 'fs/promises';
import path from 'path';

export async function createMigration(migrationName: string, migrationsDir?: string): Promise<string> {
  const dir = migrationsDir || path.join(process.cwd(), 'migrations');
  
  await fs.mkdir(dir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const filename = `${timestamp}_${migrationName}.ts`;
  const filePath = path.join(dir, filename);
  
  const template = `
    import { BaseMigration } from 'pg-schema-builder';
    
    export default class extends BaseMigration {
        async up(): Promise<void> {
        // Your migration code here
        this.schema.createTable('your_table', (table) => {
            table.increments('id');
            table.string('name', 100).notNullable();
            table.timestamps();
        });
        }

        async down(): Promise<void> {
            // Your rollback code here
            this.schema.dropTable('your_table');
        }
    }
`;

  await fs.writeFile(filePath, template, 'utf8');
  return filePath;
}