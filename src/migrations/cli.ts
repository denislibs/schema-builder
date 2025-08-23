#!/usr/bin/env node
import { MigrationManager } from './MigrationManager';
import { createMigration } from './createMigration';

import path from 'path';
import fs from 'fs/promises';

interface CliConfig {
  connectionString?: string;
  migrationsDir?: string;
}

async function loadConfig(): Promise<CliConfig> {
  const configPaths = [
    path.join(process.cwd(), 'schema-builder.config.js'),
    path.join(process.cwd(), 'schema-builder.config.json'),
    path.join(process.cwd(), 'package.json')
  ];

  for (const configPath of configPaths) {
    try {
      if (configPath.endsWith('.js')) {
        // Используем require вместо import
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
      console.log('  migrate                    Run pending migrations');
      console.log('  rollback [--steps N]       Rollback last N migrations (default: 1)');
      console.log('  status                     Show migration status');
      console.log('  fresh                      Drop all tables and re-run migrations');
      console.log('  reset                      Rollback all migrations');
      console.log('  create --name <name>       Create new migration file');
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