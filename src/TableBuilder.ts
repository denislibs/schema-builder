import ColumnBuilder from './ColumnBuilder';
import type { ArrayElementType, ArrayTypeOptions } from './types';

/**
 * Класс для построения определения таблицы
 */
class TableBuilder {
  /** Имя таблицы */
  public tableName: string;
  /** Колонки таблицы */
  public columns: ColumnBuilder[] = [];
  /** Первичный ключ */
  public primaryKey: string | null = null;
  /** Определения индексов */
  public indexDefinitions: string[] = [];
  /** Определения уникальных индексов */
  public uniqueIndexDefinitions: string[] = [];
  /** Комментарий к таблице */
  public tableComment: string | null = null;
  /** Комментарии к колонкам */
  public columnComments: Array<{ column: string; comment: string }> = [];
  /** Ограничения таблицы */
  public constraints: string[] = [];

  /**
   * Создает новый экземпляр TableBuilder
   * @param tableName - имя таблицы
   */
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Добавляет колонку с автоинкрементом
   * @param name - имя колонки
   */
  increments(name: string): ColumnBuilder {
    const column = ColumnBuilder.Serial(name, this);
    this.columns.push(column);
    return column.primary();
  }

  /**
   * Добавляет целочисленную колонку
   * @param name - имя колонки
   */
  integer(name: string): ColumnBuilder {
    const column = ColumnBuilder.Integer(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет строковую колонку
   * @param name - имя колонки
   * @param length - максимальная длина строки
   */
  string(name: string, length: number = 255): ColumnBuilder {
    const column = ColumnBuilder.Varchar(name, length, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет текстовую колонку
   * @param name - имя колонки
   */
  text(name: string): ColumnBuilder {
    const column = ColumnBuilder.Text(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с временной меткой
   * @param name - имя колонки
   */
  timestamp(name: string): ColumnBuilder {
    const column = ColumnBuilder.Timestamp(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет булеву колонку
   * @param name - имя колонки
   */
  boolean(name: string): ColumnBuilder {
    const column = ColumnBuilder.Boolean(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку типа JSONB
   * @param name - имя колонки
   */
  json(name: string): ColumnBuilder {
    const column = ColumnBuilder.JSONB(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с датой
   * @param name - имя колонки
   */
  date(name: string): ColumnBuilder {
    const column = ColumnBuilder.Date(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку типа UUID
   * @param name - имя колонки
   */
  uuid(name: string): ColumnBuilder {
    const column = ColumnBuilder.UUID(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с десятичным числом
   * @param name - имя колонки
   * @param precision - общее количество значащих цифр
   * @param scale - количество цифр после запятой
   */
  decimal(name: string, precision: number = 8, scale: number = 2): ColumnBuilder {
    const column = ColumnBuilder.Decimal(name, precision, scale, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с числом с плавающей точкой
   * @param name - имя колонки
   */
  float(name: string): ColumnBuilder {
    const column = new ColumnBuilder(name, 'FLOAT', this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с числом двойной точности
   * @param name - имя колонки
   */
  double(name: string): ColumnBuilder {
    const column = ColumnBuilder.DoublePrecision(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с большим целым числом
   * @param name - имя колонки
   */
  bigInteger(name: string): ColumnBuilder {
    const column = ColumnBuilder.BigInt(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с маленьким целым числом
   * @param name - имя колонки
   */
  smallInteger(name: string): ColumnBuilder {
    const column = ColumnBuilder.SmallInt(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с временем
   * @param name - имя колонки
   */
  time(name: string): ColumnBuilder {
    const column = ColumnBuilder.Time(name, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с массивом
   * @param name - имя колонки
   * @param type - тип элементов массива
   * @param options - дополнительные параметры типа
   */
  array(name: string, type: ArrayElementType, options?: ArrayTypeOptions): ColumnBuilder {
    const column = ColumnBuilder.Array(name, type, this, options);
    this.columns.push(column);
    return column;
  }

  /**
   * Добавляет колонку с массивом текста
   * @param name - имя колонки
   */
  textArray(name: string): ColumnBuilder {
    return this.array(name, 'text');
  }

  /**
   * Добавляет колонку с массивом строк
   * @param name - имя колонки
   * @param length - максимальная длина строки
   */
  stringArray(name: string, length?: number): ColumnBuilder {
    return this.array(name, 'varchar', { length });
  }

  /**
   * Добавляет колонку с массивом целых чисел
   * @param name - имя колонки
   */
  integerArray(name: string): ColumnBuilder {
    return this.array(name, 'integer');
  }

  /**
   * Добавляет колонку с массивом больших целых чисел
   * @param name - имя колонки
   */
  bigIntegerArray(name: string): ColumnBuilder {
    return this.array(name, 'bigint');
  }

  /**
   * Добавляет колонку с массивом UUID
   * @param name - имя колонки
   */
  uuidArray(name: string): ColumnBuilder {
    return this.array(name, 'uuid');
  }

  /**
   * Добавляет колонку с массивом дат
   * @param name - имя колонки
   */
  dateArray(name: string): ColumnBuilder {
    return this.array(name, 'date');
  }

  /**
   * Добавляет колонку с массивом временных меток
   * @param name - имя колонки
   */
  timestampArray(name: string): ColumnBuilder {
    return this.array(name, 'timestamp');
  }

  /**
   * Добавляет колонку с массивом булевых значений
   * @param name - имя колонки
   */
  booleanArray(name: string): ColumnBuilder {
    return this.array(name, 'boolean');
  }

  /**
   * Добавляет колонку с массивом JSON
   * @param name - имя колонки
   */
  jsonArray(name: string): ColumnBuilder {
    return this.array(name, 'json');
  }

  /**
   * Добавляет колонку с массивом JSONB
   * @param name - имя колонки
   */
  jsonbArray(name: string): ColumnBuilder {
    return this.array(name, 'jsonb');
  }

  /**
   * Добавляет колонку с перечислением
   * @param name - имя колонки
   * @param values - значения перечисления
   */
  enum(name: string, values: string[]): ColumnBuilder {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('Enum values must be a non-empty array');
    }
    
    const enumValues = values.map(v => `'${v}'`).join(', ');
    // Для enum нет специального статического метода, поэтому создаем колонку с проверкой
    const column = new ColumnBuilder(name, `TEXT CHECK (${name} IN (${enumValues}))`, this);
    this.columns.push(column);
    return column;
  }

  /**
   * Устанавливает первичный ключ
   * @param columns - колонки для первичного ключа
   */
  primary(columns: string | string[]): void {
    if (Array.isArray(columns)) {
      this.primaryKey = `PRIMARY KEY (${columns.join(', ')})`;
    } else {
      this.primaryKey = `PRIMARY KEY (${columns})`;
    }
  }

  /**
   * Добавляет индекс
   * @param columns - колонки для индекса
   * @param indexName - имя индекса
   */
  index(columns: string | string[], indexName?: string): TableBuilder {
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    const name = indexName || `idx_${this.tableName}_${columnList.replace(/, /g, '_')}`;
    this.indexDefinitions.push(`CREATE INDEX ${name} ON ${this.tableName}(${columnList})`);
    return this;
  }

  /**
   * Добавляет уникальный индекс
   * @param columns - колонки для индекса
   * @param indexName - имя индекса
   */
  uniqueIndex(columns: string | string[], indexName?: string): TableBuilder {
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    const name = indexName || `uniq_${this.tableName}_${columnList.replace(/, /g, '_')}`;
    this.uniqueIndexDefinitions.push(`CREATE UNIQUE INDEX ${name} ON ${this.tableName}(${columnList})`);
    return this;
  }

  /**
   * Добавляет комментарий к таблице
   * @param text - текст комментария
   */
  comment(text: string): TableBuilder {
    this.tableComment = text;
    return this;
  }

  /**
   * Добавляет комментарий к колонке
   * @param columnName - имя колонки
   * @param text - текст комментария
   */
  commentColumn(columnName: string, text: string): TableBuilder {
    this.columnComments.push({ column: columnName, comment: text });
    return this;
  }

  /**
   * Добавляет ограничение CHECK
   * @param expression - выражение для проверки
   * @param constraintName - имя ограничения
   */
  check(expression: string, constraintName?: string): TableBuilder {
    const name = constraintName || `chk_${this.tableName}_${Date.now()}`;
    this.constraints.push(`CONSTRAINT ${name} CHECK (${expression})`);
    return this;
  }

  /**
   * Добавляет ограничение EXCLUDE
   * @param columns - колонки для ограничения
   * @param operators - операторы для ограничения
   * @param constraintName - имя ограничения
   */
  exclude(columns: string[], operators: string[], constraintName?: string): TableBuilder {
    if (!Array.isArray(columns) || !Array.isArray(operators) || columns.length !== operators.length) {
      throw new Error('Columns and operators must be arrays of the same length');
    }

    const elements = columns.map((col, i) => `${col} WITH ${operators[i]}`).join(', ');
    const name = constraintName || `excl_${this.tableName}_${Date.now()}`;
    this.constraints.push(`CONSTRAINT ${name} EXCLUDE (${elements})`);
    return this;
  }

  /**
   * Возвращает все ограничения
   */
  getConstraints(): string[] {
    return this.constraints;
  }

  /**
   * Возвращает определения всех колонок
   */
  getColumnDefinitions(): string[] {
    return this.columns.map(column => column.toString());
  }

  /**
   * Возвращает все индексы
   */
  getIndexes(): string[] {
    return [...this.indexDefinitions, ...this.uniqueIndexDefinitions];
  }

  /**
   * Возвращает все комментарии
   */
  getComments(): string[] {
    const comments: string[] = [];
    
    if (this.tableComment) {
      comments.push(`COMMENT ON TABLE ${this.tableName} IS '${this.tableComment.replace(/'/g, "''")}'`);
    }
    
    for (const { column, comment } of this.columnComments) {
      comments.push(`COMMENT ON COLUMN ${this.tableName}.${column} IS '${comment.replace(/'/g, "''")}'`);
    }
    
    return comments;
  }
}

export default TableBuilder;