#!/usr/bin/env node

import { MigrationManager } from './MigrationManager.js';
import { createMigration } from './createMigration.js';
import path from 'path';
import fs from 'fs/promises';

interface CliConfig {
  connectionString?: string;
  migrationsDir?: string;
}

async function createConfigFile(configType: string = 'js'): Promise<string> {
  const cwd = process.cwd();
  
  if (configType === 'js') {
    const configPath = path.join(cwd, 'schema-builder.config.js');
    
    // Определяем тип проекта
    const isESM = await isESMProject();
    
    const configContent = isESM ? 
    `export default {
      // Database connection string
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/database',
      
      // Directory where migration files are stored
      migrationsDir: './migrations',
      
      // Optional: Schema name (default: 'public')
      schemaName: 'public',
      
      // Optional: Migrations table name (default: 'migrations')
      migrationsTable: 'migrations'
  };
` : 
    `module.exports = {
      // Database connection string
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/database',
      
      // Directory where migration files are stored
      migrationsDir: './migrations',
      
      // Optional: Schema name (default: 'public')
      schemaName: 'public',
      
      // Optional: Migrations table name (default: 'migrations')
      migrationsTable: 'migrations'
    };
`;
    
    await fs.writeFile(configPath, configContent, 'utf8');
    return configPath;
  } else if (configType === 'json') {
    const configPath = path.join(cwd, 'schema-builder.config.json');
    const configContent = {
      connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/database',
      migrationsDir: './migrations',
      schemaName: 'public',
      migrationsTable: 'migrations'
    };
    
    await fs.writeFile(configPath, JSON.stringify(configContent, null, 2), 'utf8');
    return configPath;
  } else if (configType === 'package') {
    const packageJsonPath = path.join(cwd, 'package.json');
    
    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      packageJson.schemaBuilder = {
        connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/database',
        migrationsDir: './migrations',
        schemaName: 'public',
        migrationsTable: 'migrations'
      };
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      return packageJsonPath;
    } catch (error) {
      throw new Error('package.json not found. Please run this command in a Node.js project directory.');
    }
  }
  
  throw new Error('Invalid config type. Use: js, json, or package');
}

async function initProject(options: any): Promise<void> {
  const configType = options.config || 'js';
  const migrationsDir = options.migrationsDir || './migrations';
  
  try {
    // Создаем конфигурационный файл
    const configPath = await createConfigFile(configType);
    console.log(`✓ Created config file: ${configPath}`);
    
    // Создаем папку для миграций
    const migrationsDirPath = path.resolve(process.cwd(), migrationsDir);
    await fs.mkdir(migrationsDirPath, { recursive: true });
    console.log(`✓ Created migrations directory: ${migrationsDirPath}`);
    
    // Создаем .gitignore для игнорирования чувствительных данных
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let gitignoreContent = '';
    
    try {
      gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    } catch {
      // .gitignore не существует
    }
    
    const gitignoreEntries = [
      '# pg-schema-builder',
      'schema-builder.config.js',
      '.env'
    ];
    
    let shouldUpdateGitignore = false;
    gitignoreEntries.forEach(entry => {
      if (!gitignoreContent.includes(entry)) {
        gitignoreContent += `\n${entry}`;
        shouldUpdateGitignore = true;
      }
    });
    
    if (shouldUpdateGitignore) {
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf8');
      console.log(`✓ Updated .gitignore`);
    }
    
    // Создаем пример .env файла
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envContent = `# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/database
`;
    
    try {
      await fs.access(envExamplePath);
    } catch {
      await fs.writeFile(envExamplePath, envContent, 'utf8');
      console.log(`✓ Created .env.example`);
    }
    
    // Создаем README для миграций
    const migrationReadmePath = path.join(migrationsDirPath, 'README.md');
    const readmeContent = `# Migrations

This directory contains database migration files.

## Usage

### Create a new migration
\`\`\`bash
npx pg-schema create --name create_users_table
\`\`\`

### Run migrations
\`\`\`bash
npx pg-schema migrate
\`\`\`

### Check status
\`\`\`bash
npx pg-schema status
\`\`\`

### Rollback migrations
\`\`\`bash
npx pg-schema rollback --steps 1
\`\`\`

## Migration Structure

Each migration file should export a class extending BaseMigration:

\`\`\`typescript
import { BaseMigration } from 'pg-schema-builder';

export default class CreateUsersTable extends BaseMigration {
  async up(): Promise<void> {
    // Migration code here
  }

  async down(): Promise<void> {
    // Rollback code here
  }
}
\`\`\`
`;
    
    await fs.writeFile(migrationReadmePath, readmeContent, 'utf8');
    console.log(`✓ Created migrations README`);
    
    console.log('\n🎉 Project initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your database connection string in the config file');
    console.log('2. Create your first migration: npx pg-schema create --name create_initial_tables');
    console.log('3. Run migrations: npx pg-schema migrate');
    
  } catch (error) {
    console.error('Error initializing project:', error);
    process.exit(1);
  }
}

async function isESMProject(): Promise<boolean> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(content);
    return packageJson.type === 'module';
  } catch {
    return false;
  }
}

async function loadConfig(): Promise<CliConfig> {
  const configPaths = [
    path.join(process.cwd(), 'schema-builder.config.js'),
    path.join(process.cwd(), 'schema-builder.config.mjs'),
    path.join(process.cwd(), 'schema-builder.config.cjs'),
    path.join(process.cwd(), 'schema-builder.config.json'),
    path.join(process.cwd(), 'package.json')
  ];

  for (const configPath of configPaths) {
    try {
      // Проверяем существование файла
      await fs.access(configPath);
      
      if (configPath.endsWith('.js') || configPath.endsWith('.mjs')) {
        // Для ESM модулей используем dynamic import
        //@ts-ignore
        const { pathToFileURL } = await import('url');
        const fileUrl = pathToFileURL(configPath).href;
        //@ts-ignore
        const config = await import(`${fileUrl}?t=${Date.now()}`);
        return config.default || config;
      } else if (configPath.endsWith('.cjs')) {
        // Для CommonJS используем createRequire
        //@ts-ignore
        const { createRequire } = await import('module');
        //@ts-ignore
        const require = createRequire(import.meta.url);
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);
        return config.default || config;
      } else if (configPath.endsWith('.json')) {
        const content = await fs.readFile(configPath, 'utf8');
        const json = JSON.parse(content);
        return configPath.endsWith('package.json') ? json.schemaBuilder || {} : json;
      }
    } catch (error) {
      // Игнорируем ошибки и пробуем следующий файл
      console.debug(`Config file not found or invalid: ${configPath}`);
    }
  }

  return {};
}


function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options: Record<string, any> = {};
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        options[key] = value;
        i++; // Пропускаем значение
      } else {
        options[key] = true;
      }
    }
  }
  
  return { command, options };
}

async function main() {
  const { command, options } = parseArgs();
  console.log(command);
  console.log(options)
  // Команда init не требует подключения к БД
  if (command === 'init') {
    await initProject(options);
    return;
  }
  
  const config = await loadConfig();
  
  // Приоритет: аргументы командной строки > конфиг файл > переменные окружения
  const connectionString = 
    options.connection || 
    config.connectionString || 
    process.env.DATABASE_URL;
    
  const migrationsDir = 
    options.migrationsDir || 
    config.migrationsDir || 
    path.join(process.cwd(), 'migrations');
  
  if (!connectionString) {
    console.error('Database connection string is required!');
    console.error('Provide it via:');
    console.error('  --connection "postgresql://user:pass@host:port/db"');
    console.error('  DATABASE_URL environment variable');
    console.error('  schema-builder.config.js file');
    console.error('  package.json schemaBuilder section');
    console.error('\nOr run "npx pg-schema init" to create a config file');
    process.exit(1);
  }

  switch (command) {
    case 'migrate':
      const manager = new MigrationManager(connectionString, migrationsDir);
      await manager.runMigrations();
      await manager.close();
      break;
      
    case 'rollback':
      const rollbackManager = new MigrationManager(connectionString, migrationsDir);
      await rollbackManager.rollbackMigrations(parseInt(options.steps) || 1);
      await rollbackManager.close();
      break;
      
    case 'status':
      const statusManager = new MigrationManager(connectionString, migrationsDir);
      await statusManager.status();
      await statusManager.close();
      break;
      
    case 'fresh':
      const freshManager = new MigrationManager(connectionString, migrationsDir);
      await freshManager.fresh();
      await freshManager.close();
      break;
      
    case 'reset':
      const resetManager = new MigrationManager(connectionString, migrationsDir);
      await resetManager.reset();
      await resetManager.close();
      break;
      
    case 'create':
      if (!options.name && !options._[0]) {
        console.error('Migration name is required');
        console.error('Usage: pg-schema create --name create_users_table');
        process.exit(1);
      }
      const migrationName = options.name || options._[0];
      const filePath = await createMigration(migrationName, migrationsDir);
      console.log(`Migration created: ${filePath}`);
      break;
      
    case 'debug':
      const debugManager = new MigrationManager(connectionString, migrationsDir);
      await debugManager.debugMigrationPaths();
      await debugManager.close();
      break;
      
    default:
      console.log('Usage: pg-schema <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  init [--config type]       Initialize project with config file');
      console.log('                             Config types: js (default), json, package');
      console.log('  migrate                    Run pending migrations');
      console.log('  rollback [--steps N]       Rollback last N migrations (default: 1)');
      console.log('  status                     Show migration status');
      console.log('  fresh                      Drop all tables and re-run migrations');
      console.log('  reset                      Rollback all migrations');
      console.log('  create --name <name>       Create new migration file');
      console.log('  debug                      Debug migration paths');
      console.log('');
      console.log('Init Options:');
      console.log('  --config <type>            Config file type: js, json, package');
      console.log('  --migrationsDir <path>     Migrations directory (default: ./migrations)');
      console.log('');
      console.log('Options:');
      console.log('  --connection <string>      Database connection string');
      console.log('  --migrationsDir <path>     Path to migrations directory');
      console.log('');
      console.log('Configuration:');
      console.log('  DATABASE_URL env variable');
      console.log('  schema-builder.config.js');
      console.log('  package.json "schemaBuilder" section');
  }
}

main().catch(console.error);