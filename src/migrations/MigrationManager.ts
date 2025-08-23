import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

interface MigrationInfo {
  version: string;
  batch: number;
}

interface MigrationToRollback {
  version: string;
  filename: string;
}

export class MigrationManager {
  private dbPool: Pool;
  private migrationsDir: string;
  private migrationFiles: string[] = [];

  constructor(connectionString: string, migrationsDir?: string) {
    this.dbPool = new Pool({ connectionString });
    this.migrationsDir = migrationsDir || path.join(process.cwd(), 'migrations');
  }

  async initialize(): Promise<void> {
    const tableExists = await this.dbPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      const batchColumnExists = await this.dbPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'migrations' 
          AND column_name = 'batch'
        );
      `);
      
      if (!batchColumnExists.rows[0].exists) {
        await this.dbPool.query(`
          ALTER TABLE migrations 
          ADD COLUMN batch INTEGER NOT NULL DEFAULT 1;
        `);
      }
    } else {
      await this.dbPool.query(`
        CREATE TABLE migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          batch INTEGER NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  }

  async getExecutedMigrations(): Promise<MigrationInfo[]> {
    const result = await this.dbPool.query(
      'SELECT version, batch FROM migrations ORDER BY version ASC'
    );
    return result.rows;
  }

  async getCurrentBatch(): Promise<number> {
    const result = await this.dbPool.query(
      'SELECT MAX(batch) as batch FROM migrations'
    );
    return result.rows[0].batch || 0;
  }

  async getPendingMigrations(): Promise<string[]> {
    const executedMigrations = await this.getExecutedMigrations();
    const executedVersions = executedMigrations.map(row => row.version);
    
    const files = await fs.readdir(this.migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
      .filter(file => !executedVersions.includes(this.getVersionFromFilename(file)))
      .sort();
    
    this.migrationFiles = migrationFiles;
    return migrationFiles;
  }

  async runMigrations(): Promise<void> {
    await this.initialize();
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    const batch = await this.getCurrentBatch() + 1;
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration, batch);
    }
  }

  async rollbackMigrations(steps: number = 1): Promise<void> {
    await this.initialize();
    const migrationsToRollback = await this.getMigrationsToRollback(steps);
    
    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    for (const migration of migrationsToRollback) {
      await this.rollbackMigration(migration);
    }
  }

  private getVersionFromFilename(filename: string): string {
    return filename.split('_')[0];
  }

  private async getMigrationsToRollback(steps: number): Promise<MigrationToRollback[]> {
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      return [];
    }
    
    const lastBatch = await this.getCurrentBatch();
    
    return executedMigrations
      .filter(migration => migration.batch === lastBatch)
      .sort((a, b) => b.version.localeCompare(a.version))
      .slice(0, steps)
      .map(migration => ({
        version: migration.version,
        filename: this.getFilenameFromVersion(migration.version)
      }));
  }

  private getFilenameFromVersion(version: string): string {
    return this.migrationFiles.find(file => this.getVersionFromFilename(file) === version) || '';
  }

  private async executeMigration(filename: string, batch: number): Promise<void> {
    const migrationPath = path.join(this.migrationsDir, filename);
    console.log(`Executing migration: ${filename}`);
    
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Используем require для совместимости с CommonJS
      let migration;
      try {
        // Очищаем кэш require
        const fullPath = require.resolve(migrationPath);
        delete require.cache[fullPath];
        migration = require(migrationPath);
      } catch (error) {
        // Если это скомпилированный JS файл, попробуем его
        const jsPath = migrationPath.replace('.ts', '.js');
        const fullJsPath = require.resolve(jsPath);
        delete require.cache[fullJsPath];
        migration = require(jsPath);
      }
      
      // Создаем инстанс миграции
      const MigrationClass = migration.default || migration;
      const migrationInstance = new MigrationClass(this.dbPool.options.connectionString);
      
      // Выполняем миграцию
      await migrationInstance.up();
      
      // Закрываем соединение миграции
      await migrationInstance.close();
      
      // Записываем в базу что миграция выполнена
      const version = this.getVersionFromFilename(filename);
      const name = filename.replace(/^\d+_/, '').replace(/\.(js|ts)$/, '');
      
      await client.query(
        'INSERT INTO migrations (version, name, batch) VALUES ($1, $2, $3)',
        [version, name, batch]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${filename} executed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error executing migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async rollbackMigration(migration: MigrationToRollback): Promise<void> {
    const migrationPath = path.join(this.migrationsDir, migration.filename);
    console.log(`Rolling back migration: ${migration.filename}`);
    
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Используем require для совместимости с CommonJS
      let migrationModule;
      try {
        const fullPath = require.resolve(migrationPath);
        delete require.cache[fullPath];
        migrationModule = require(migrationPath);
      } catch (error) {
        // Если это скомпилированный JS файл, попробуем его
        const jsPath = migrationPath.replace('.ts', '.js');
        const fullJsPath = require.resolve(jsPath);
        delete require.cache[fullJsPath];
        migrationModule = require(jsPath);
      }
      
      // Создаем инстанс миграции
      const MigrationClass = migrationModule.default || migrationModule;
      const migrationInstance = new MigrationClass(this.dbPool.options.connectionString);
      
      // Выполняем откат миграции
      await migrationInstance.down();
      
      // Закрываем соединение миграции
      await migrationInstance.close();
      
      // Удаляем запись о миграции из базы
      await client.query(
        'DELETE FROM migrations WHERE version = $1',
        [migration.version]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${migration.filename} rolled back successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error rolling back migration ${migration.filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async status(): Promise<void> {
    await this.initialize();
    
    const executedMigrations = await this.getExecutedMigrations();
    const pendingMigrations = await this.getPendingMigrations();
    
    console.log('\n=== Migration Status ===\n');
    
    if (executedMigrations.length > 0) {
      console.log('Executed migrations:');
      executedMigrations.forEach(migration => {
        console.log(`  ✓ ${migration.version} (batch ${migration.batch})`);
      });
    } else {
      console.log('No executed migrations');
    }
    
    if (pendingMigrations.length > 0) {
      console.log('\nPending migrations:');
      pendingMigrations.forEach(migration => {
        console.log(`  ○ ${migration}`);
      });
    } else {
      console.log('\nNo pending migrations');
    }
    
    console.log('\n========================\n');
  }

  async fresh(): Promise<void> {
    console.log('Dropping all tables and re-running migrations...');
    
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Получаем все таблицы
      const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename != 'migrations'
      `);
      
      // Удаляем все таблицы
      for (const row of tablesResult.rows) {
        await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
      }
      
      // Очищаем таблицу миграций
      await client.query('DELETE FROM migrations');
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
    // Запускаем все миграции заново
    await this.runMigrations();
  }

  async reset(): Promise<void> {
    console.log('Rolling back all migrations...');
    
    const executedMigrations = await this.getExecutedMigrations();
    
    // Откатываем все миграции в обратном порядке
    for (const migration of executedMigrations.reverse()) {
      const filename = this.getFilenameFromVersion(migration.version);
      if (filename) {
        await this.rollbackMigration({
          version: migration.version,
          filename
        });
      }
    }
  }

  async close(): Promise<void> {
    await this.dbPool.end();
  }
}