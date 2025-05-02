import { describe, it, expect } from 'vitest';
import ColumnBuilder from '../src/ColumnBuilder';
import { createTestDb } from './helpers/db-utils';
import { Pool } from 'pg';
import { TableBuilder } from '../src';

describe('ColumnBuilder', () => {
  describe('статические методы создания колонок', () => {
    it('Integer должен создавать колонку типа INTEGER', () => {
      const column = ColumnBuilder.Integer('user_id');
      expect(column.name).toBe('user_id');
      expect(column.type).toBe('INTEGER');
      expect(column.constraints).toEqual([]);
    });

    it('Varchar должен создавать колонку типа VARCHAR с указанной длиной', () => {
      const column = ColumnBuilder.Varchar('username', 100);
      expect(column.name).toBe('username');
      expect(column.type).toBe('VARCHAR(100)');
      expect(column.constraints).toEqual([]);
    });

    it('Text должен создавать колонку типа TEXT', () => {
      const column = ColumnBuilder.Text('description');
      expect(column.name).toBe('description');
      expect(column.type).toBe('TEXT');
      expect(column.constraints).toEqual([]);
    });

    it('Boolean должен создавать колонку типа BOOLEAN', () => {
      const column = ColumnBuilder.Boolean('is_active');
      expect(column.name).toBe('is_active');
      expect(column.type).toBe('BOOLEAN');
      expect(column.constraints).toEqual([]);
    });

    it('Timestamp должен создавать колонку типа TIMESTAMP', () => {
      const column = ColumnBuilder.Timestamp('created_at');
      expect(column.name).toBe('created_at');
      expect(column.type).toBe('TIMESTAMP WITH TIME ZONE');
      expect(column.constraints).toEqual([]);
    });

    it('Date должен создавать колонку типа DATE', () => {
      const column = ColumnBuilder.Date('birth_date');
      expect(column.name).toBe('birth_date');
      expect(column.type).toBe('DATE');
      expect(column.constraints).toEqual([]);
    });

    it('Decimal должен создавать колонку типа DECIMAL с указанной точностью', () => {
      const column = ColumnBuilder.Decimal('price', 10, 2);
      expect(column.name).toBe('price');
      expect(column.type).toBe('DECIMAL(10,2)');
      expect(column.constraints).toEqual([]);
    });

    it('Serial должен создавать колонку типа SERIAL', () => {
      const column = ColumnBuilder.Serial('id');
      expect(column.name).toBe('id');
      expect(column.type).toBe('SERIAL');
      expect(column.constraints).toEqual([]);
    });

    it('SmallSerial должен создавать колонку типа SMALLSERIAL', () => {
      const column = ColumnBuilder.SmallSerial('id');
      expect(column.name).toBe('id');
      expect(column.type).toBe('SMALLSERIAL');
      expect(column.constraints).toEqual([]);
    });

    it('BigSerial должен создавать колонку типа BIGSERIAL', () => {
      const column = ColumnBuilder.BigSerial('id');
      expect(column.name).toBe('id');
      expect(column.type).toBe('BIGSERIAL');
      expect(column.constraints).toEqual([]);
    });

    it('UUID должен создавать колонку типа UUID', () => {
      const column = ColumnBuilder.UUID('id');
      expect(column.name).toBe('id');
      expect(column.type).toBe('UUID');
      expect(column.constraints).toEqual([]);
    });

    it('JSON должен создавать колонку типа JSON', () => {
      const column = ColumnBuilder.JSON('data');
      expect(column.name).toBe('data');
      expect(column.type).toBe('JSON');
      expect(column.constraints).toEqual([]);
    });

    it('JSONB должен создавать колонку типа JSONB', () => {
      const column = ColumnBuilder.JSONB('data');
      expect(column.name).toBe('data');
      expect(column.type).toBe('JSONB');
      expect(column.constraints).toEqual([]);
    });

    it('INET должен создавать колонку типа INET', () => {
      const column = ColumnBuilder.INET('ip_address');
      expect(column.name).toBe('ip_address');
      expect(column.type).toBe('INET');
      expect(column.constraints).toEqual([]);
    });

    it('CIDR должен создавать колонку типа CIDR', () => {
      const column = ColumnBuilder.CIDR('network');
      expect(column.name).toBe('network');
      expect(column.type).toBe('CIDR');
      expect(column.constraints).toEqual([]);
    });

    it('MACADDR должен создавать колонку типа MACADDR', () => {
      const column = ColumnBuilder.MACADDR('mac_address');
      expect(column.name).toBe('mac_address');
      expect(column.type).toBe('MACADDR');
      expect(column.constraints).toEqual([]);
    });

    it('BYTEA должен создавать колонку типа BYTEA', () => {
      const column = ColumnBuilder.BYTEA('binary_data');
      expect(column.name).toBe('binary_data');
      expect(column.type).toBe('BYTEA');
      expect(column.constraints).toEqual([]);
    });

    it('SmallInt должен создавать колонку типа SMALLINT', () => {
      const column = ColumnBuilder.SmallInt('small_id');
      expect(column.name).toBe('small_id');
      expect(column.type).toBe('SMALLINT');
      expect(column.constraints).toEqual([]);
    });

    it('BigInt должен создавать колонку типа BIGINT', () => {
      const column = ColumnBuilder.BigInt('big_id');
      expect(column.name).toBe('big_id');
      expect(column.type).toBe('BIGINT');
      expect(column.constraints).toEqual([]);
    });

    it('Real должен создавать колонку типа REAL', () => {
      const column = ColumnBuilder.Real('real_number');
      expect(column.name).toBe('real_number');
      expect(column.type).toBe('REAL');
      expect(column.constraints).toEqual([]);
    });

    it('DoublePrecision должен создавать колонку типа DOUBLE PRECISION', () => {
      const column = ColumnBuilder.DoublePrecision('double_number');
      expect(column.name).toBe('double_number');
      expect(column.type).toBe('DOUBLE PRECISION');
      expect(column.constraints).toEqual([]);
    });

    it('Time должен создавать колонку типа TIME', () => {
      const column = ColumnBuilder.Time('meeting_time');
      expect(column.name).toBe('meeting_time');
      expect(column.type).toBe('TIME');
      expect(column.constraints).toEqual([]);
    });

    it('Interval должен создавать колонку типа INTERVAL', () => {
      const column = ColumnBuilder.Interval('duration');
      expect(column.name).toBe('duration');
      expect(column.type).toBe('INTERVAL');
      expect(column.constraints).toEqual([]);
    });

    it('Array должен создавать колонку типа массив', () => {
      const column = ColumnBuilder.Array('tags', 'TEXT');
      expect(column.name).toBe('tags');
      expect(column.type).toBe('TEXT[]');
      expect(column.constraints).toEqual([]);
    });

    it('должен поддерживать цепочку методов с новым API', () => {
      const column = ColumnBuilder.Integer('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      
      expect(column.name).toBe('user_id');
      expect(column.type).toBe('INTEGER');
      expect(column.constraints).toContain('NOT NULL');
      expect(column.constraints).toContain('REFERENCES users(id)');
      expect(column.constraints).toContain('ON DELETE CASCADE');
    });
  });
  describe('constructor', () => {
    it('должен создавать экземпляр с указанными параметрами', () => {
      const mockTable = new TableBuilder('test-table');
      const column = new ColumnBuilder('username', 'VARCHAR(100)', mockTable);
      
      expect(column.name).toBe('username');
      expect(column.type).toBe('VARCHAR(100)');
      expect(column.table).toBe(mockTable);
      expect(column.constraints).toEqual([]);
      expect(column.referencedColumn).toBeUndefined();
      expect(column.referencedTable).toBeUndefined();
    });
  });

  describe('методы модификации колонок', () => {
    let column: ColumnBuilder;
    let mockTable: any;

    beforeEach(() => {
      mockTable = {};
      column = new ColumnBuilder('test_column', 'INTEGER', mockTable);
    });

    it('notNullable должен добавлять ограничение NOT NULL', () => {
      column.notNullable();
      expect(column.constraints).toContain('NOT NULL');
    });

    it('nullable не должен добавлять ограничений', () => {
      column.nullable();
      expect(column.constraints).toEqual([]);
    });

    it('unique должен добавлять ограничение UNIQUE', () => {
      column.unique();
      expect(column.constraints).toContain('UNIQUE');
    });

    it('primary должен добавлять ограничение PRIMARY KEY', () => {
      column.primary();
      expect(column.constraints).toContain('PRIMARY KEY');
    });

    it('defaultTo должен добавлять ограничение DEFAULT с числовым значением', () => {
      column.defaultTo(42);
      expect(column.constraints).toContain('DEFAULT 42');
    });

    it('defaultTo должен добавлять ограничение DEFAULT со строковым значением', () => {
      column.defaultTo('test');
      expect(column.constraints).toContain("DEFAULT 'test'");
    });

    it('defaultTo должен корректно обрабатывать CURRENT_TIMESTAMP', () => {
      column.defaultTo('CURRENT_TIMESTAMP');
      expect(column.constraints).toContain('DEFAULT CURRENT_TIMESTAMP');
    });

    it('references должен устанавливать ссылку на колонку', () => {
      column.references('id');
      expect(column.referencedColumn).toBe('id');
    });

    it('inTable должен устанавливать ссылку на таблицу и добавлять ограничение REFERENCES', () => {
      column.references('id').inTable('users');
      expect(column.referencedTable).toBe('users');
      expect(column.constraints).toContain('REFERENCES users(id)');
    });

    it('onDelete должен добавлять ограничение ON DELETE', () => {
      column.references('id').inTable('users').onDelete('CASCADE');
      expect(column.constraints).toContain('ON DELETE CASCADE');
    });

    it('onDelete должен выбрасывать ошибку при неверном действии', () => {
      column.references('id').inTable('users');
      expect(() => column.onDelete('INVALID_ACTION')).toThrow();
    });

    it('onUpdate должен добавлять ограничение ON UPDATE', () => {
      column.references('id').inTable('users').onUpdate('CASCADE');
      expect(column.constraints).toContain('ON UPDATE CASCADE');
    });

    it('onUpdate должен выбрасывать ошибку при неверном действии', () => {
      column.references('id').inTable('users');
      expect(() => column.onUpdate('INVALID_ACTION')).toThrow();
    });

    it('onDelete и onUpdate не должны добавлять ограничения без указания таблицы', () => {
      column.references('id');
      column.onDelete('CASCADE');
      column.onUpdate('CASCADE');
      expect(column.constraints).not.toContain('ON DELETE CASCADE');
      expect(column.constraints).not.toContain('ON UPDATE CASCADE');
    });
  });

  describe('toString', () => {
    it('должен возвращать корректное определение колонки без ограничений', () => {
      const mockTable = new TableBuilder('test-table');
      
      const column = new ColumnBuilder('name', 'VARCHAR(100)', mockTable);
      expect(column.toString()).toBe('name VARCHAR(100)');
    });

    it('должен возвращать корректное определение колонки с одним ограничением', () => {
      const mockTable = new TableBuilder('test-table');
      
			const column = new ColumnBuilder('name', 'VARCHAR(100)', mockTable).notNullable();
      expect(column.toString()).toBe('name VARCHAR(100) NOT NULL');
    });

    it('должен возвращать корректное определение колонки с несколькими ограничениями', () => {
      const mockTable = new TableBuilder('test-table');
      
			const column = new ColumnBuilder('email', 'VARCHAR(255)', mockTable)
        .notNullable()
        .unique()
        .defaultTo('user@example.com');
      expect(column.toString()).toBe("email VARCHAR(255) NOT NULL UNIQUE DEFAULT 'user@example.com'");
    });

    it('должен возвращать корректное определение колонки с внешним ключом', () => {
      const mockTable = new TableBuilder('test-table');
			const column = new ColumnBuilder('user_id', 'INTEGER', mockTable)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      expect(column.toString()).toBe('user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE');
    });
  });

  describe('интеграция с базой данных', () => {
    let pool: Pool;

    beforeEach(() => {
      // Создаем тестовую базу данных перед каждым тестом
      const { pool: testPool } = createTestDb();
      pool = testPool;
    });

    afterEach(async () => {
      // Закрываем пул подключений после каждого теста
      await pool.end();
    });

    it('должен создавать колонку в таблице', async () => {
      // Создаем таблицу
      await pool.query(`
        CREATE TABLE test_table (
          id SERIAL PRIMARY KEY
        )
      `);
			const testTable = new TableBuilder('test_table')
      // Создаем колонку с помощью ColumnBuilder
      const column = new ColumnBuilder('name', 'VARCHAR(100)', testTable)
        .notNullable()
        .defaultTo('default_name');

      // Добавляем колонку в таблицу
      await pool.query(`ALTER TABLE test_table ADD COLUMN ${column.toString()}`);

      // Проверяем, что колонка создана
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'test_table' AND column_name = 'name'
      `);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].column_name).toBe('name');
      expect(result.rows[0].data_type).toBe('text');
      expect(result.rows[0].is_nullable).toBe('NO');
      // Не проверяем column_default, так как его поведение в pg-mem может отличаться
    });
  });
});