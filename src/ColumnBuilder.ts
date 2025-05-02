import type TableBuilder from './TableBuilder';

/**
 * Класс для работы с колонками
 */
class ColumnBuilder {
  /** Имя колонки */
  public name: string;
  /** Тип колонки */
  public type: string;
  /** Таблица, к которой относится колонка */
  public table: TableBuilder;
  /** Ограничения колонки */
  public constraints: string[] = [];
  /** Колонка, на которую ссылается внешний ключ */
  public referencedColumn?: string;
  /** Таблица, на которую ссылается внешний ключ */
  public referencedTable?: string;

  /**
   * Создает колонку типа INTEGER
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Integer(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'INTEGER', table);
  }

  /**
   * Создает колонку типа VARCHAR с указанной длиной
   * @param name - имя колонки
   * @param length - максимальная длина строки
   * @param table - таблица, к которой относится колонка
   */
  static Varchar(name: string, length: number = 255, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, `VARCHAR(${length})`, table);
  }

  /**
   * Создает колонку типа TEXT
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Text(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'TEXT', table);
  }

  /**
   * Создает колонку типа BOOLEAN
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Boolean(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'BOOLEAN', table);
  }

  /**
   * Создает колонку типа TIMESTAMP WITH TIME ZONE
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Timestamp(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'TIMESTAMP WITH TIME ZONE', table);
  }

  /**
   * Создает колонку типа DATE
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Date(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'DATE', table);
  }

  /**
   * Создает колонку типа DECIMAL с указанной точностью
   * @param name - имя колонки
   * @param precision - общее количество значащих цифр
   * @param scale - количество цифр после запятой
   * @param table - таблица, к которой относится колонка
   */
  static Decimal(name: string, precision: number = 10, scale: number = 2, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, `DECIMAL(${precision},${scale})`, table);
  }

  /**
   * Создает колонку типа SERIAL (автоинкрементное поле)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Serial(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'SERIAL', table);
  }

  /**
   * Создает колонку типа SMALLSERIAL (автоинкрементное поле)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static SmallSerial(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'SMALLSERIAL', table);
  }

  /**
   * Создает колонку типа BIGSERIAL (автоинкрементное поле)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static BigSerial(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'BIGSERIAL', table);
  }

  /**
   * Создает колонку типа UUID
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static UUID(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'UUID', table);
  }

  /**
   * Создает колонку типа JSON
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static JSON(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'JSON', table);
  }

  /**
   * Создает колонку типа JSONB
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static JSONB(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'JSONB', table);
  }

  /**
   * Создает колонку типа INET (IPv4 или IPv6 адрес)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static INET(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'INET', table);
  }

  /**
   * Создает колонку типа CIDR (IPv4 или IPv6 сеть)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static CIDR(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'CIDR', table);
  }

  /**
   * Создает колонку типа MACADDR (MAC адрес)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static MACADDR(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'MACADDR', table);
  }

  /**
   * Создает колонку типа BYTEA (бинарные данные)
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static BYTEA(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'BYTEA', table);
  }

  /**
   * Создает колонку типа SMALLINT
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static SmallInt(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'SMALLINT', table);
  }

  /**
   * Создает колонку типа BIGINT
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static BigInt(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'BIGINT', table);
  }

  /**
   * Создает колонку типа REAL
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Real(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'REAL', table);
  }

  /**
   * Создает колонку типа DOUBLE PRECISION
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static DoublePrecision(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'DOUBLE PRECISION', table);
  }

  /**
   * Создает колонку типа TIME
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Time(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'TIME', table);
  }

  /**
   * Создает колонку типа INTERVAL
   * @param name - имя колонки
   * @param table - таблица, к которой относится колонка
   */
  static Interval(name: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, 'INTERVAL', table);
  }

  /**
   * Создает колонку типа массив
   * @param name - имя колонки
   * @param type - тип элементов массива
   * @param table - таблица, к которой относится колонка
   */
  static Array(name: string, type: string, table: TableBuilder = {} as TableBuilder): ColumnBuilder {
    return new ColumnBuilder(name, `${type}[]`, table);
  }

  /**
   * Создает новый экземпляр ColumnBuilder
   * @param name - имя колонки
   * @param type - тип колонки
   * @param table - таблица, к которой относится колонка
   */
  constructor(name: string, type: string, table: TableBuilder) {
    this.name = name;
    this.type = type;
    this.table = table;
  }

  /**
   * Устанавливает ограничение NOT NULL
   */
  notNullable(): ColumnBuilder {
    this.constraints.push('NOT NULL');
    return this;
  }

  /**
   * Устанавливает колонку как nullable (по умолчанию)
   */
  nullable(): ColumnBuilder {
    // По умолчанию колонки могут быть NULL, поэтому ничего не добавляем
    return this;
  }

  /**
   * Устанавливает ограничение UNIQUE
   */
  unique(): ColumnBuilder {
    this.constraints.push('UNIQUE');
    return this;
  }

  /**
   * Устанавливает значение по умолчанию
   * @param value - значение по умолчанию
   */
  defaultTo(value: string | number | boolean | null | Date | 'CURRENT_TIMESTAMP'): ColumnBuilder {
    if (value === 'CURRENT_TIMESTAMP') {
      this.constraints.push(`DEFAULT ${value}`);
    } else if (value instanceof Date) {
      this.constraints.push(`DEFAULT '${value.toISOString()}'`);
    } else if (typeof value === 'string') {
      this.constraints.push(`DEFAULT '${value}'`);
    } else if (value === null) {
      this.constraints.push(`DEFAULT NULL`);
    } else {
      this.constraints.push(`DEFAULT ${value}`);
    }
    return this;
  }

  /**
   * Устанавливает колонку как первичный ключ
   */
  primary(): ColumnBuilder {
    this.constraints.push('PRIMARY KEY');
    return this;
  }

  /**
   * Устанавливает ссылку на колонку в другой таблице
   * @param column - колонка, на которую ссылается внешний ключ
   */
  references(column: string): ColumnBuilder {
    this.referencedColumn = column;
    return this;
  }

  /**
   * Устанавливает таблицу, на которую ссылается внешний ключ
   * @param tableName - таблица, на которую ссылается внешний ключ
   */
  inTable(tableName: string): ColumnBuilder {
    this.referencedTable = tableName;
    this.constraints.push(`REFERENCES ${tableName}(${this.referencedColumn})`);
    return this;
  }

  /**
   * Устанавливает действие при удалении записи в родительской таблице
   * @param action - действие при удалении
   */
  onDelete(action: string): ColumnBuilder {
    if (this.referencedTable) {
      // Поддерживаемые действия: CASCADE, RESTRICT, SET NULL, SET DEFAULT, NO ACTION
      const validActions = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'];
      const upperAction = action.toUpperCase();
      
      if (!validActions.includes(upperAction)) {
        throw new Error(`Invalid ON DELETE action: ${action}. Valid actions are: ${validActions.join(', ')}`);
      }
      
      this.constraints.push(`ON DELETE ${upperAction}`);
    }
    return this;
  }

  /**
   * Устанавливает действие при обновлении записи в родительской таблице
   * @param action - действие при обновлении
   */
  onUpdate(action: string): ColumnBuilder {
    if (this.referencedTable) {
      // Поддерживаемые действия: CASCADE, RESTRICT, SET NULL, SET DEFAULT, NO ACTION
      const validActions = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'];
      const upperAction = action.toUpperCase();
      
      if (!validActions.includes(upperAction)) {
        throw new Error(`Invalid ON UPDATE action: ${action}. Valid actions are: ${validActions.join(', ')}`);
      }
      
      this.constraints.push(`ON UPDATE ${upperAction}`);
    }
    return this;
  }

  /**
   * Преобразует определение колонки в строку
   */
  toString(): string {
    return `${this.name} ${this.type}${this.constraints.length > 0 ? ' ' + this.constraints.join(' ') : ''}`;
  }
}

export default ColumnBuilder;