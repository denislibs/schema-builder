import { Pool, PoolClient } from 'pg';
import AlterTableBuilder from './AlterTableBuilder';
import TableBuilder from './TableBuilder';

/**
 * Интерфейс для опций SchemaBuilder
 */
interface SchemaBuilderOptions {
  /** Имя схемы (по умолчанию 'public') */
  schemaName?: string;
  /** Имя таблицы миграций (по умолчанию 'migrations') */
  migrationsTable?: string;
  /** Дополнительные опции */
  [key: string]: any;
}

/**
 * Интерфейс для миграции
 */
interface Migration {
  /** Идентификатор миграции */
  id: number;
  /** Имя миграции */
  name: string;
  /** Номер пакета миграций */
  batch: number;
  /** Время выполнения миграции */
  migration_time: Date;
}

/**
 * Интерфейс для информации о колонке
 */
interface ColumnInfo {
  /** Имя колонки */
  column_name: string;
  /** Тип данных колонки */
  data_type: string;
  /** Максимальная длина колонки */
  character_maximum_length: number | null;
  /** Является ли колонка обязательной */
  is_nullable: string;
  /** Значение по умолчанию */
  column_default: string | null;
}

/**
 * Интерфейс для информации о внешнем ключе
 */
interface ForeignKeyInfo {
  /** Имя ограничения */
  constraint_name: string;
  /** Имя колонки */
  column_name: string;
  /** Имя таблицы, на которую ссылается внешний ключ */
  referenced_table_name: string;
  /** Имя колонки, на которую ссылается внешний ключ */
  referenced_column_name: string;
}

/**
 * Интерфейс для информации об индексе
 */
interface IndexInfo {
  /** Имя индекса */
  indexname: string;
  /** Определение индекса */
  indexdef: string;
}

/**
 * Интерфейс для информации о схеме таблицы
 */
interface TableSchema {
  /** Колонки таблицы */
  columns: ColumnInfo[];
  /** Первичный ключ таблицы */
  primaryKey: string | null;
  /** Внешние ключи таблицы */
  foreignKeys: ForeignKeyInfo[];
  /** Индексы таблицы */
  indexes: IndexInfo[];
}

/**
 * Основной класс SchemaBuilder
 */
class SchemaBuilder {
  /** Пул подключений к базе данных */
  private pool: Pool;
  /** Опции SchemaBuilder */
  private options: SchemaBuilderOptions;
  /** Кэш запросов */
  private queryCache: Map<string, any>;

  /**
   * Создает новый экземпляр SchemaBuilder
   * @param pool - пул подключений к базе данных
   * @param options - опции SchemaBuilder
   */
  constructor(pool: Pool, options: SchemaBuilderOptions = {}) {
    this.pool = pool;
    this.options = {
      schemaName: 'public',
      migrationsTable: 'migrations',
      ...options
    };
    this.queryCache = new Map();
  }

  /**
   * Начинает транзакцию
   * @returns клиент с активной транзакцией
   */
  async beginTransaction(): Promise<PoolClient> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Фиксирует транзакцию
   * @param client - клиент с активной транзакцией
   */
  async commitTransaction(client: PoolClient): Promise<void> {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Откатывает транзакцию
   * @param client - клиент с активной транзакцией
   */
  async rollbackTransaction(client: PoolClient): Promise<void> {
    await client.query('ROLLBACK');
    client.release();
  }

  /**
   * Выполняет операции в транзакции
   * @param callback - функция, выполняющая операции в транзакции
   */
  async transaction(callback: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await this.beginTransaction();
    try {
      await callback(client);
      await this.commitTransaction(client);
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Проверяет существование таблицы
   * @param tableName - имя таблицы
   * @returns существует ли таблица
   */
  async hasTable(tableName: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);
    
    return result.rows.length > 0;
  }

  /**
   * Проверяет существование колонки в таблице
   * @param tableName - имя таблицы
   * @param columnName - имя колонки
   * @returns существует ли колонка
   */
  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    
    return result.rows.length > 0;
  }

  /**
   * Создает новую таблицу
   * @param tableName - имя таблицы
   * @param callback - функция для определения структуры таблицы
   */
  async createTable(tableName: string, callback: (table: TableBuilder) => void): Promise<void> {
    const tableBuilder = new TableBuilder(tableName);
    callback(tableBuilder);
    
    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (
      ${tableBuilder.getColumnDefinitions().join(',\n      ')}
      ${tableBuilder.constraints.length > 0 ? ',\n      ' + tableBuilder.getConstraints().join(',\n      ') : ''}
      ${tableBuilder.primaryKey ? `,\n      ${tableBuilder.primaryKey}` : ''}
    )`;
    
    try {
      await this.pool.query(query);
      
      // Создаем индексы, если они определены
      for (const index of tableBuilder.getIndexes()) {
        await this.pool.query(index);
      }
      
      // Добавляем комментарии, если они определены
      for (const comment of tableBuilder.getComments()) {
        await this.pool.query(comment);
      }
    } catch (error) {
      console.error(`Ошибка при создании таблицы ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Удаляет таблицу
   * @param tableName - имя таблицы
   */
  async dropTable(tableName: string): Promise<void> {
    await this.pool.query(`DROP TABLE IF EXISTS ${tableName}`);
  }

  /**
   * Изменяет существующую таблицу
   * @param tableName - имя таблицы
   * @param callback - функция для определения изменений
   */
  async alterTable(tableName: string, callback: (table: AlterTableBuilder) => void): Promise<void> {
    const alterBuilder = new AlterTableBuilder(tableName);
    callback(alterBuilder);
    
    for (const query of alterBuilder.getQueries()) {
      await this.pool.query(query);
    }
  }

  /**
   * Выполняет произвольный SQL-запрос
   * @param sql - SQL-запрос
   * @param params - параметры запроса
   */
  async raw(sql: string, params: any[] = []): Promise<void> {
    await this.pool.query(sql, params);
  }

  /**
   * Создает индекс, если он не существует
   * @param indexName - имя индекса
   * @param tableName - имя таблицы
   * @param columns - столбцы для индекса
   * @returns был ли создан индекс
   */
  async createIndexIfNotExists(indexName: string, tableName: string, columns: string): Promise<boolean> {
    try {
      // Проверяем, существует ли индекс
      const result = await this.pool.query(`
        SELECT 1 FROM pg_indexes 
        WHERE indexname = $1
      `, [indexName]);
      
      if (result.rows.length === 0) {
        // Индекс не существует, создаем его
        await this.raw(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
        return true;
      } else {
        // Индекс уже существует, пропускаем создание
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Создает таблицу миграций, если она не существует
   */
  async createMigrationsTable(): Promise<void> {
    const tableName = this.options.migrationsTable as string;
    
    if (!(await this.hasTable(tableName))) {
      await this.createTable(tableName, (table) => {
        table.increments('id');
        table.string('name', 255).notNullable();
        table.integer('batch').notNullable();
        table.timestamp('migration_time').defaultTo('CURRENT_TIMESTAMP');
      });
    }
  }

  /**
   * Получает список выполненных миграций
   * @returns список выполненных миграций
   */
  async getMigrations(): Promise<Migration[]> {
    const tableName = this.options.migrationsTable as string;
    
    if (!(await this.hasTable(tableName))) {
      await this.createMigrationsTable();
      return [];
    }
    
    const result = await this.pool.query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
    return result.rows;
  }

  /**
   * Добавляет запись о выполненной миграции
   * @param name - имя миграции
   * @param batch - номер пакета миграций
   */
  async addMigration(name: string, batch: number): Promise<void> {
    const tableName = this.options.migrationsTable as string;
    
    await this.pool.query(`
      INSERT INTO ${tableName} (name, batch) 
      VALUES ($1, $2)
    `, [name, batch]);
  }

  /**
   * Удаляет запись о миграции
   * @param name - имя миграции
   */
  async removeMigration(name: string): Promise<void> {
    const tableName = this.options.migrationsTable as string;
    
    await this.pool.query(`
      DELETE FROM ${tableName} 
      WHERE name = $1
    `, [name]);
  }

  /**
   * Получает информацию о схеме таблицы
   * @param tableName - имя таблицы
   * @returns информация о схеме таблицы
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    // Получаем информацию о колонках
    const columnsResult = await this.pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    // Получаем информацию о первичном ключе
    const primaryKeyResult = await this.pool.query(`
      SELECT c.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
      JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
        AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
    `, [tableName]);
    
    // Получаем информацию о внешних ключах
    const foreignKeysResult = await this.pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table_name,
        ccu.column_name AS referenced_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
    `, [tableName]);
    
    // Получаем информацию об индексах
    const indexesResult = await this.pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1
    `, [tableName]);
    
    // Формируем первичный ключ
    let primaryKey = null;
    if (primaryKeyResult.rows.length > 0) {
      const primaryKeyColumns = primaryKeyResult.rows.map(row => row.column_name);
      primaryKey = primaryKeyColumns.join(', ');
    }
    
    return {
      columns: columnsResult.rows,
      primaryKey,
      foreignKeys: foreignKeysResult.rows,
      indexes: indexesResult.rows
    };
  }

  /**
   * Генерирует код модели на основе существующей таблицы
   * @param tableName - имя таблицы
   * @param modelName - имя модели
   * @returns код модели
   */
  async generateModel(tableName: string, modelName: string): Promise<string> {
    const schema = await this.getTableSchema(tableName);
    
    let modelCode = `class ${modelName} {
`;
    
    // Добавляем свойства класса на основе колонок таблицы
    for (const column of schema.columns) {
      const type = this.mapPostgresTypeToJS(column.data_type);
      modelCode += `  ${column.column_name}: ${type};
`;
    }
    
    // Добавляем конструктор
    modelCode += `
  constructor(data = {}) {
`;
    
    for (const column of schema.columns) {
      modelCode += `    this.${column.column_name} = data.${column.column_name};
`;
    }
    
    modelCode += `  }
`;
    
    // Добавляем метод toJSON
    modelCode += `
  toJSON() {
    return {
`;
    
    for (const column of schema.columns) {
      modelCode += `      ${column.column_name}: this.${column.column_name},
`;
    }
    
    modelCode += `    };
  }
`;
    
    // Добавляем статический метод tableName
    modelCode += `
  static get tableName() {
    return '${tableName}';
  }
`;
    
    // Добавляем статический метод для получения первичного ключа
    if (schema.primaryKey) {
      modelCode += `
  static get primaryKey() {
    return '${schema.primaryKey}';
  }
`;
    }
    
    modelCode += `}

export default ${modelName};
`;
    
    return modelCode;
  }

  /**
   * Преобразует тип PostgreSQL в тип JavaScript
   * @param postgresType - тип PostgreSQL
   * @returns тип JavaScript
   */
  private mapPostgresTypeToJS(postgresType: string): string {
    const typeMap: Record<string, string> = {
      'integer': 'number',
      'bigint': 'number',
      'smallint': 'number',
      'decimal': 'number',
      'numeric': 'number',
      'real': 'number',
      'double precision': 'number',
      'float': 'number',
      'boolean': 'boolean',
      'character varying': 'string',
      'varchar': 'string',
      'character': 'string',
      'char': 'string',
      'text': 'string',
      'uuid': 'string',
      'date': 'Date',
      'timestamp': 'Date',
      'timestamp with time zone': 'Date',
      'timestamp without time zone': 'Date',
      'time': 'string',
      'time with time zone': 'string',
      'time without time zone': 'string',
      'json': 'object',
      'jsonb': 'object',
      'array': 'Array<any>'
    };
    
    return typeMap[postgresType.toLowerCase()] || 'any';
  }
}

export default SchemaBuilder;