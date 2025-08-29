import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Pool } from 'pg';
import { SchemaBuilder } from '../src';
import { createTestDb, tableExists, getTableColumns } from './helpers/db-utils';

describe('SchemaBuilder', () => {
  let pool: Pool;
  let schema: SchemaBuilder;

  beforeEach(() => {
    // Создаем тестовую базу данных перед каждым тестом
    const { pool: testPool } = createTestDb();
    pool = testPool;
    schema = new SchemaBuilder(pool, {
      schemaName: 'public',
      migrationsTable: 'migrations'
    });
  });

  afterEach(async () => {
    // Закрываем пул подключений после каждого теста
    await pool.end();
  });

  describe('hasTable', () => {
    it('должен возвращать false, если таблица не существует', async () => {
      const exists = await schema.hasTable('non_existent_table');
      expect(exists).toBe(false);
    });

    it('должен возвращать true, если таблица существует', async () => {
      // Создаем таблицу
      await schema.createTable('test_table', (table) => {
        table.increments('id');
        table.string('name');
      });

      const exists = await schema.hasTable('test_table');
      expect(exists).toBe(true);
    });
  });

  describe('createTable', () => {
    it('должен создавать таблицу с указанными колонками', async () => {
      // Создаем таблицу
      await schema.createTable('users', (table) => {
        table.increments('id');
        table.string('name', 100).notNullable();
        table.string('email', 255).notNullable().unique();
        table.boolean('active').defaultTo(true);
        table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
      });

      // Проверяем, что таблица существует
      const exists = await tableExists(pool, 'users');
      expect(exists).toBe(true);

      // Проверяем, что все колонки созданы
      const columns = await getTableColumns(pool, 'users');
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('email');
      expect(columns).toContain('active');
      expect(columns).toContain('created_at');
    });
  });

  describe('hasColumn', () => {
    it('должен возвращать false, если колонка не существует', async () => {
      // Создаем таблицу
      await schema.createTable('test_table', (table) => {
        table.increments('id');
      });

      const hasColumn = await schema.hasColumn('test_table', 'non_existent_column');
      expect(hasColumn).toBe(false);
    });

    it('должен возвращать true, если колонка существует', async () => {
      // Создаем таблицу с колонкой name
      await schema.createTable('test_table', (table) => {
        table.increments('id');
        table.string('name');
      });

      const hasColumn = await schema.hasColumn('test_table', 'name');
      expect(hasColumn).toBe(true);
    });
  });

  describe('alterTable', () => {
    it('должен добавлять новую колонку в существующую таблицу', async () => {
      // Создаем таблицу
      await schema.createTable('users', (table) => {
        table.increments('id');
        table.string('name');
      });

      // Изменяем таблицу, добавляя новую колонку
      await schema.alterTable('users', (table) => {
        table.addString('email', 255).notNullable();
      });

      // Проверяем, что колонка добавлена
      const hasColumn = await schema.hasColumn('users', 'email');
      expect(hasColumn).toBe(true);
    });
  });
});