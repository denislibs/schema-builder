export interface DatabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  column_comment: string | null;
  is_unique?: boolean;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  foreign_table?: string;
  foreign_column?: string;
}

export interface DatabaseTable {
  table_name: string;
  columns: DatabaseColumn[];
  primary_keys: string[];
  foreign_keys: Array<{
    column_name: string;
    foreign_table: string;
    foreign_column: string;
  }>;
  indexes: Array<{
    index_name: string;
    columns: string[];
    is_unique: boolean;
  }>;
}

export interface DatabaseSchema {
  tables: DatabaseTable[];
  enums: Array<{
    name: string;
    values: string[];
  }>;
}

export interface GenerateOptions {
  outputDir?: string;
  format?: 'types' | 'interfaces' | 'classes' | 'zod';
  includeComments?: boolean;
  exportStyle?: 'named' | 'default' | 'namespace';
  camelCase?: boolean;
  addTimestamps?: boolean;
  addRelations?: boolean;
}

export interface ModelOptions extends GenerateOptions {
  baseClass?: string;
  includeMethods?: boolean;
  includeValidation?: boolean;
  ormStyle?: 'active-record' | 'data-mapper' | 'simple';
}
