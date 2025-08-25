import fs from 'fs/promises';
import path from 'path';
import { InitOptions, MigratorConfig } from './types';

export class ConfigManager {
  static async load(): Promise<MigratorConfig> {
    const configPaths = [
      path.join(process.cwd(), 'migrator.config.js'),
      path.join(process.cwd(), 'migrator.config.json'),
      path.join(process.cwd(), 'package.json')
    ];

    for (const configPath of configPaths) {
      try {
        await fs.access(configPath);
        if (configPath.endsWith('package.json')) {
          const content = await fs.readFile(configPath, 'utf8');
          const packageJson = JSON.parse(content);
          return packageJson.migrator || {};
        } else if (configPath.endsWith('.json')) {
          const content = await fs.readFile(configPath, 'utf8');
          return JSON.parse(content);
        } else if (configPath.endsWith('.js')) {
            // @ts-ignore
          const module = await import(configPath);
          return module.default || module;
        }
      } catch {
        continue;
      }
    }

    return {
      migrationsDir: './migrations'
    };
  }

  async init(options: InitOptions): Promise<void> {
    const cwd = process.cwd();
    
    // Создаем директорию для миграций
    const migrationsPath = path.join(cwd, options.migrationsDir);
    await fs.mkdir(migrationsPath, { recursive: true });
    
    if (options.type === 'js') {
      const configPath = path.join(cwd, 'migrator.config.js');
      const isESM = await this.isESMProject();
      
      const configContent = isESM ? `
export default {
  connectionString: process.env.DATABASE_URL,
  migrationsDir: '${options.migrationsDir}',
  schemaName: 'public',
  migrationsTable: 'migrations'
};
` : `
module.exports = {
  connectionString: process.env.DATABASE_URL,
  migrationsDir: '${options.migrationsDir}',
  schemaName: 'public',
  migrationsTable: 'migrations'
};
`;
      
      await fs.writeFile(configPath, configContent.trim(), 'utf8');
      
    } else if (options.type === 'json') {
      const configPath = path.join(cwd, 'migrator.config.json');
      const config = {
        connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/database",
        migrationsDir: options.migrationsDir,
        schemaName: 'public',
        migrationsTable: 'migrations'
      };
      
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      
    } else if (options.type === 'package') {
      const packagePath = path.join(cwd, 'package.json');
      
      try {
        const content = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(content);
        
        packageJson.migrator = {
          connectionString: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/database",
          migrationsDir: options.migrationsDir,
          schemaName: 'public',
          migrationsTable: 'migrations'
        };
        
        await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
      } catch {
        throw new Error('package.json not found. Create one first or use a different config type.');
      }
    }
  }

  private async isESMProject(): Promise<boolean> {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(content);
      return packageJson.type === 'module';
    } catch {
      return false;
    }
  }
}