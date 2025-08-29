/**
 * Поддерживаемые типы элементов массивов в PostgreSQL
 */
export type ArrayElementType = 
  | 'text'
  | 'varchar'
  | 'char'
  | 'integer'
  | 'bigint'
  | 'smallint'
  | 'decimal'
  | 'numeric'
  | 'float'
  | 'double precision'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'timestamptz'
  | 'time'
  | 'uuid'
  | 'json'
  | 'jsonb';

/**
 * Параметры для массивов с ограниченной длиной
 */
export interface ArrayTypeOptions {
  length?: number;
  precision?: number;
  scale?: number;
}