export interface MigratorConfig {
  connectionString?: string;
  migrationsDir?: string;
  schemaName?: string;
  migrationsTable?: string;
  seedersDir?: string;
}

export interface InitOptions {
  type: 'js' | 'json' | 'package';
  migrationsDir: string;
}

export interface MigrationInfo {
  version: string;
  batch: number;
}

export interface MigrationToRollback {
  version: string;
  filename: string;
}
    
export interface CreateMigrationOptions {
  template?: 'table' | 'alter' | 'raw';
  migrationsDir?: string;
}

export interface SeederInfo {
  version: string;
  batch: number;
  executed_at?: string;
}

export interface SeederToRollback {
  version: string;
  filename: string;
}