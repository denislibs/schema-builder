import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import type { SeederInfo, SeederToRollback } from './types.js';

export class SeederManager {
  private seederFiles: string[] = [];

  constructor(
    private pool: Pool,
    private seedersDir = path.join(process.cwd(), 'seeders')
  ) {}

  async initialize(): Promise<void> {
    const tableExists = await this.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'seeders'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      await this.pool.query(`
        CREATE TABLE seeders (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          batch INTEGER NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  }

  async getExecutedSeeders(): Promise<SeederInfo[]> {
    const result = await this.pool.query(
      'SELECT version, batch FROM seeders ORDER BY version ASC'
    );
    return result.rows;
  }

  async getCurrentBatch(): Promise<number> {
    const result = await this.pool.query(
      'SELECT MAX(batch) as batch FROM seeders'
    );
    return result.rows[0].batch || 0;
  }

  async getPendingSeeders(): Promise<string[]> {
    const executedSeeders = await this.getExecutedSeeders();
    const executedVersions = executedSeeders.map(row => row.version);
    
    const files = await fs.readdir(this.seedersDir);
    const seederFiles = files
      .filter(file => /\.(js|ts|cjs|mjs)$/.test(file))
      .filter(file => !executedVersions.includes(this.getVersionFromFilename(file)))
      .sort();
    
    this.seederFiles = seederFiles;
    return seederFiles;
  }

  async runSeeders(specific?: string): Promise<void> {
    await this.initialize();
    
    let seedersToRun: string[];
    
    if (specific) {
      // Запускаем конкретный сидер
      const seederPath = path.join(this.seedersDir, specific);
      try {
        await fs.access(seederPath);
        seedersToRun = [specific];
      } catch {
        throw new Error(`Seeder file not found: ${specific}`);
      }
    } else {
      // Запускаем все ожидающие сидеры
      seedersToRun = await this.getPendingSeeders();
    }
    
    if (seedersToRun.length === 0) {
      console.log('No pending seeders');
      return;
    }
    
    const batch = await this.getCurrentBatch() + 1;
    
    for (const seeder of seedersToRun) {
      await this.executeSeeder(seeder, batch);
    }
  }

  async rollbackSeeders(steps: number = 1): Promise<void> {
    await this.initialize();
    const seedersToRollback = await this.getSeedersToRollback(steps);
    
    if (seedersToRollback.length === 0) {
      console.log('No seeders to rollback');
      return;
    }
    
    for (const seeder of seedersToRollback) {
      await this.rollbackSeeder(seeder);
    }
  }

  private getVersionFromFilename(filename: string): string {
    return filename.split('_')[0];
  }

  private async getSeedersToRollback(steps: number): Promise<SeederToRollback[]> {
    const executedSeeders = await this.getExecutedSeeders();
    
    if (executedSeeders.length === 0) {
      return [];
    }
    
    const lastBatch = await this.getCurrentBatch();
    
    return executedSeeders
      .filter(seeder => seeder.batch === lastBatch)
      .sort((a, b) => b.version.localeCompare(a.version))
      .slice(0, steps)
      .map(seeder => ({
        version: seeder.version,
        filename: this.getFilenameFromVersion(seeder.version)
      }));
  }

  private getFilenameFromVersion(version: string): string {
    return this.seederFiles.find(file => this.getVersionFromFilename(file) === version) || '';
  }

  private async loadSeeder(seederPath: string): Promise<any> {
    const fullPath = path.resolve(seederPath);

    try {
      await fs.access(fullPath);
    } catch (error) {
      throw new Error(`Seeder file not found: ${fullPath}`);
    }
    
    try {
      //@ts-ignore
      const module = await import(fullPath);
      return module;
    } catch (error: any) {
      console.error('Failed to load seeder:', {
        path: fullPath,
        error: error.message
      });

      throw new Error(`Could not load seeder: ${seederPath}. Make sure the file exports a class with run() method. Error: ${error.message}`);
    }
  }

  private async executeSeeder(filename: string, batch: number): Promise<void> {
    const seederPath = path.join(this.seedersDir, filename);
    console.log(`Running seeder: ${filename}`);
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Загружаем сидер
      const seeder = await this.loadSeeder(seederPath);
      
      // Создаем инстанс сидера
      const SeederClass = seeder.default || seeder;
      
      if (typeof SeederClass !== 'function') {
        throw new Error(`Seeder ${filename} must export a class or function`);
      }
      
      const seederInstance = new SeederClass(this.pool.options.connectionString || '');
      
      if (typeof seederInstance.run !== 'function') {
        throw new Error(`Seeder ${filename} must have a 'run' method`);
      }
      
      // Выполняем сидер
      await seederInstance.run();
      
      // Закрываем соединение сидера
      if (typeof seederInstance.close === 'function') {
        await seederInstance.close();
      }
      
      // Записываем в базу что сидер выполнен
      const version = this.getVersionFromFilename(filename);
      const name = filename.replace(/^\d+_/, '').replace(/\.(js|ts|mjs|cjs)$/, '');
      
      await client.query(
        'INSERT INTO seeders (version, name, batch) VALUES ($1, $2, $3)',
        [version, name, batch]
      );
      
      await client.query('COMMIT');
      console.log(`Seeder ${filename} completed successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error running seeder ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async rollbackSeeder(seeder: SeederToRollback): Promise<void> {
    const seederPath = path.join(this.seedersDir, seeder.filename);
    console.log(`Rolling back seeder: ${seeder.filename}`);
    
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Загружаем сидер
      const seederModule = await this.loadSeeder(seederPath);
      
      const SeederClass = seederModule.default || seederModule;
      
      if (typeof SeederClass !== 'function') {
        throw new Error(`Seeder ${seeder.filename} must export a class or function`);
      }
      
      const seederInstance = new SeederClass(this.pool.options.connectionString || '');
      
      // Проверяем наличие метода down
      if (typeof seederInstance.down === 'function') {
        await seederInstance.down();
      } else {
        console.log(`Seeder ${seeder.filename} doesn't have a 'down' method, skipping rollback`);
      }
      
      // Закрываем соединение сидера
      if (typeof seederInstance.close === 'function') {
        await seederInstance.close();
      }
      
      // Удаляем запись о сидере из базы
      await client.query(
        'DELETE FROM seeders WHERE version = $1',
        [seeder.version]
      );
      
      await client.query('COMMIT');
      console.log(`Seeder ${seeder.filename} rolled back successfully`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error rolling back seeder ${seeder.filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async status(): Promise<void> {
    await this.initialize();
    
    const executedSeeders = await this.getExecutedSeeders();
    const pendingSeeders = await this.getPendingSeeders();
    
    console.log('\n=== Seeder Status ===\n');
    
    if (executedSeeders.length > 0) {
      console.log('Executed seeders:');
      executedSeeders.forEach(seeder => {
        console.log(`  ✓ ${seeder.version} (batch ${seeder.batch})`);
      });
    } else {
      console.log('No executed seeders');
    }
    
    if (pendingSeeders.length > 0) {
      console.log('\nPending seeders:');
      pendingSeeders.forEach(seeder => {
        console.log(`  ○ ${seeder}`);
      });
    } else {
      console.log('\nNo pending seeders');
    }
    
    console.log('\n====================\n');
  }

  async reset(): Promise<void> {
    console.log('Rolling back all seeders...');
    
    const executedSeeders = await this.getExecutedSeeders();
    
    // Откатываем все сидеры в обратном порядке
    for (const seeder of executedSeeders.reverse()) {
      const filename = this.getFilenameFromVersion(seeder.version);
      if (filename) {
        await this.rollbackSeeder({
          version: seeder.version,
          filename
        });
      }
    }
  }

  async close(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
      }
    } catch (error) {
      console.error('Error closing SeederManager connection:', error);
    }
  }
}