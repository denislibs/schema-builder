import { Pool } from 'pg';
import type { DatabaseSchema, DatabaseTable, DatabaseColumn } from './types/generator.js';

export class SchemaInspector {
  constructor(private pool: Pool) {}

  async inspectSchema(schemaName: string = 'public'): Promise<DatabaseSchema> {
    const tables = await this.getTables(schemaName);
    const enums = await this.getEnums(schemaName);

    const tablesWithDetails = await Promise.all(
      tables.map(tableName => this.getTableDetails(tableName, schemaName))
    );

    return {
      tables: tablesWithDetails,
      enums
    };
  }

  private async getTables(schemaName: string): Promise<string[]> {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('migrations', 'seeders')
      ORDER BY table_name
    `;

    const result = await this.pool.query(query, [schemaName]);
    return result.rows.map(row => row.table_name);
  }

  private async getEnums(schemaName: string): Promise<Array<{ name: string; values: string[] }>> {
    const query = `
      SELECT t.typname as name,
             array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = $1
      GROUP BY t.typname
      ORDER BY t.typname
    `;

    const result = await this.pool.query(query, [schemaName]);
    return result.rows;
  }

  private async getTableDetails(tableName: string, schemaName: string): Promise<DatabaseTable> {
    const columns = await this.getColumns(tableName, schemaName);
    const primaryKeys = await this.getPrimaryKeys(tableName, schemaName);
    const foreignKeys = await this.getForeignKeys(tableName, schemaName);
    const indexes = await this.getIndexes(tableName, schemaName);

    return {
      table_name: tableName,
      columns,
      primary_keys: primaryKeys,
      foreign_keys: foreignKeys,
      indexes
    };
  }

  private async getColumns(tableName: string, schemaName: string): Promise<DatabaseColumn[]> {
    const query = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        CASE WHEN uq.column_name IS NOT NULL OR pk.column_name IS NOT NULL THEN true ELSE false END as is_unique,
        fk.foreign_table_name as foreign_table,
        fk.foreign_column_name as foreign_column,
        cc.constraint_type
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
          AND tc.table_schema = $2
          AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
          AND tc.table_schema = $2
          AND tc.constraint_type = 'UNIQUE'
      ) uq ON c.column_name = uq.column_name
      LEFT JOIN (
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1 
          AND tc.table_schema = $2
          AND tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.column_name = fk.column_name
      LEFT JOIN (
        SELECT kcu.column_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = $1 
          AND tc.table_schema = $2
          AND tc.constraint_type IN ('UNIQUE', 'CHECK')
      ) cc ON c.column_name = cc.column_name
      WHERE c.table_name = $1 
        AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `;

    const result = await this.pool.query(query, [tableName, schemaName]);
    return result.rows.map(row => ({
      column_name: row.column_name,
      data_type: row.data_type,
      is_nullable: row.is_nullable,
      column_default: row.column_default,
      character_maximum_length: row.character_maximum_length,
      numeric_precision: row.numeric_precision,
      numeric_scale: row.numeric_scale,
      column_comment: null,
      is_unique: row.is_unique,
      is_primary_key: row.is_primary_key,
      is_foreign_key: row.is_foreign_key,
      foreign_table: row.foreign_table_name,
      foreign_column: row.foreign_column_name
    }));
  }

  private async getPrimaryKeys(tableName: string, schemaName: string): Promise<string[]> {
    const query = `
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 
        AND tc.table_schema = $2
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `;

    const result = await this.pool.query(query, [tableName, schemaName]);
    return result.rows.map(row => row.column_name);
  }

  private async getForeignKeys(tableName: string, schemaName: string): Promise<Array<{
    column_name: string;
    foreign_table: string;
    foreign_column: string;
  }>> {
    const query = `
      SELECT 
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = $1 
        AND tc.table_schema = $2
        AND tc.constraint_type = 'FOREIGN KEY'
    `;

    const result = await this.pool.query(query, [tableName, schemaName]);
    return result.rows;
  }

  private async getIndexes(tableName: string, schemaName: string): Promise<Array<{
    index_name: string;
    columns: string[];
    is_unique: boolean;
  }>> {
    const query = `
      SELECT 
        i.relname as index_name,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE t.relname = $1 
        AND n.nspname = $2
        AND t.relkind = 'r'
        AND i.relname NOT LIKE '%_pkey'
      GROUP BY i.relname, ix.indisunique
      ORDER BY i.relname
    `;

    const result = await this.pool.query(query, [tableName, schemaName]);
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
