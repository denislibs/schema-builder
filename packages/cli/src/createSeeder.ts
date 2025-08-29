import fs from 'fs/promises';
import path from 'path';

export interface CreateSeederOptions {
  template?: 'basic' | 'table' | 'faker';
  seedersDir?: string;
}

const templates = {
  basic: (name: string) => `
    import { BaseSeeder } from 'pg-schema-builder/seeds';

    export default class ${toPascalCase(name)}Seeder extends BaseSeeder {
        async run(): Promise<void> {
            // Add your seeding logic here
            console.log('Running ${name} seeder...');
            
            // Example:
            // await this.insertOrIgnore('users', [
            //   { name: 'John Doe', email: 'john@example.com' },
            //   { name: 'Jane Doe', email: 'jane@example.com' }
            // ]);
        }

        async down(): Promise<void> {
            // Optional: Add rollback logic here
            console.log('Rolling back ${name} seeder...');
            
            // Example:
            // await this.query('DELETE FROM users WHERE email IN ($1, $2)', [
            //   'john@example.com', 
            //   'jane@example.com'
            // ]);
        }
    }

`,

  table: (tableName: string) => `
    import { BaseSeeder } from 'pg-schema-builder/seeds';

    export default class ${toPascalCase(tableName)}Seeder extends BaseSeeder {
    async run(): Promise<void> {
        // Check if data already exists
        const count = await this.count('${tableName}');
        if (count > 0) {
        console.log('${tableName} already has data, skipping...');
        return;
        }

        console.log('Seeding ${tableName}...');
        
        const data = [
        // Add your ${tableName} data here
        // { column1: 'value1', column2: 'value2' },
        ];

        await this.insertOrIgnore('${tableName}', data);
        console.log(\`Inserted \${data.length} records into ${tableName}\`);
    }

    async down(): Promise<void> {
        console.log('Clearing ${tableName}...');
        await this.query('TRUNCATE TABLE ${tableName} CASCADE');
    }
    }`,

  faker: (name: string) => `
    import { BaseSeeder } from 'pg-schema-builder/seeds';

    export default class ${toPascalCase(name)}Seeder extends BaseSeeder {
    async run(): Promise<void> {
        console.log('Running ${name} seeder with fake data...');
        
        // Generate fake data
        const fakeData = [];
        for (let i = 0; i < 50; i++) {
        fakeData.push({
            name: this.faker.name(),
            email: this.faker.email(),
            created_at: this.faker.date(),
            is_active: this.faker.boolean()
            // Add more fake data fields as needed
        });
        }

        // Insert fake data
        await this.insertOrIgnore('your_table', fakeData);
        console.log(\`Inserted \${fakeData.length} fake records\`);
    }

    async down(): Promise<void> {
        console.log('Clearing fake data...');
        // Add specific cleanup logic here
    }
    }
`
};

function toPascalCase(str: string): string {
  return str
    .split(/[_\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export async function createSeeder(
  name: string, 
  options: CreateSeederOptions = {}
): Promise<string> {
  const { template = 'basic', seedersDir = './seeders' } = options;
  
  // Создаем директорию если не существует
  await fs.mkdir(seedersDir, { recursive: true });
  
  // Генерируем timestamp
  const timestamp = new Date().toISOString()
    .replace(/[-T:\.Z]/g, '')
    .slice(0, 14);
  
  // Очищаем имя сидера
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  
  const filename = `${timestamp}_${cleanName}.mjs`;
  const filepath = path.join(seedersDir, filename);
  
  let content: string;
  switch (template) {
    case 'table':
      content = templates.table(cleanName);
      break;
    case 'faker':
      content = templates.faker(cleanName);
      break;
    default:
      content = templates.basic(cleanName);
  }
  
  await fs.writeFile(filepath, content, 'utf8');
  
  return filename;
}