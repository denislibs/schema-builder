/**
 * Интерфейс для цепочки методов колонки
 */
interface ColumnChainable {
  notNullable: () => ColumnChainable;
  nullable: () => ColumnChainable;
  unique: () => ColumnChainable;
  defaultTo: (value: any) => ColumnChainable;
  references: (column?: string) => ReferenceChainable;
  comment: (text: string) => ColumnChainable;
}

/**
 * Интерфейс для цепочки методов внешнего ключа
 */
interface ReferenceChainable extends ColumnChainable {
  inTable: (tableName: string) => ForeignKeyChainable;
}

/**
 * Интерфейс для цепочки методов внешнего ключа с действиями
 */
interface ForeignKeyChainable extends ColumnChainable {
  onDelete: (action: string) => ColumnChainable;
  onUpdate: (action: string) => ColumnChainable;
}

/**
 * Интерфейс для цепочки методов внешнего ключа в методе foreign
 */
interface ForeignKeyConstraintChainable {
  onDelete: (action: string) => AlterTableBuilder;
  onUpdate: (action: string) => AlterTableBuilder;
}

/**
 * Класс для изменения существующей таблицы
 */
class AlterTableBuilder {
  /** Имя таблицы */
  public tableName: string;
  /** SQL-запросы для изменения таблицы */
  public alterQueries: string[] = [];
  /** Колонка, на которую ссылается внешний ключ */
  private _referencedColumn?: string;

  /**
   * Создает новый экземпляр AlterTableBuilder
   * @param tableName - имя таблицы
   */
  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Добавляет новый столбец
   * @param name - имя столбца
   * @param type - тип столбца
   */
  addColumn(name: string, type: string): ColumnChainable {
    this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD COLUMN ${name} ${type}`);
    return this.chainable(name);
  }

  /**
   * Добавляет строковый столбец
   * @param name - имя столбца
   * @param length - максимальная длина строки
   */
  addString(name: string, length: number = 255): ColumnChainable {
    return this.addColumn(name, `VARCHAR(${length})`);
  }

  /**
   * Добавляет целочисленный столбец
   * @param name - имя столбца
   */
  addInteger(name: string): ColumnChainable {
    return this.addColumn(name, 'INTEGER');
  }

  /**
   * Добавляет столбец с временной меткой
   * @param name - имя столбца
   */
  addTimestamp(name: string): ColumnChainable {
    return this.addColumn(name, 'TIMESTAMP WITH TIME ZONE');
  }

  /**
   * Добавляет столбец с типом boolean
   * @param name - имя столбца
   */
  addBoolean(name: string): ColumnChainable {
    return this.addColumn(name, 'BOOLEAN');
  }

  /**
   * Удаляет столбец
   * @param name - имя столбца
   */
  dropColumn(name: string): AlterTableBuilder {
    this.alterQueries.push(`ALTER TABLE ${this.tableName} DROP COLUMN ${name}`);
    return this;
  }

  /**
   * Переименовывает столбец
   * @param oldName - старое имя столбца
   * @param newName - новое имя столбца
   */
  renameColumn(oldName: string, newName: string): AlterTableBuilder {
    this.alterQueries.push(`ALTER TABLE ${this.tableName} RENAME COLUMN ${oldName} TO ${newName}`);
    return this;
  }

  /**
   * Возвращает все SQL-запросы для изменения таблицы
   */
  getQueries(): string[] {
    return this.alterQueries;
  }

  /**
   * Создает цепочку методов
   * @param columnName - имя колонки
   */
  chainable(columnName: string): ColumnChainable {
    return {
      notNullable: (): ColumnChainable => {
        this.alterQueries.push(`ALTER TABLE ${this.tableName} ALTER COLUMN ${columnName} SET NOT NULL`);
        return this.chainable(columnName);
      },
      nullable: (): ColumnChainable => {
        this.alterQueries.push(`ALTER TABLE ${this.tableName} ALTER COLUMN ${columnName} DROP NOT NULL`);
        return this.chainable(columnName);
      },
      unique: (): ColumnChainable => {
        this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_${columnName}_unique UNIQUE (${columnName})`);
        return this.chainable(columnName);
      },
      defaultTo: (value: any): ColumnChainable => {
        let defaultValue: string | number | boolean = value;
        
        if (typeof value === 'string') {
          defaultValue = `'${value}'`;
        } else if (value === null) {
          defaultValue = 'NULL';
        } else if (value === true) {
          defaultValue = 'TRUE';
        } else if (value === false) {
          defaultValue = 'FALSE';
        } else if (value instanceof Date) {
          defaultValue = `'${value.toISOString()}'`;
        } else if (value === 'CURRENT_TIMESTAMP') {
          defaultValue = 'CURRENT_TIMESTAMP';
        }
        
        this.alterQueries.push(`ALTER TABLE ${this.tableName} ALTER COLUMN ${columnName} SET DEFAULT ${defaultValue}`);
        return this.chainable(columnName);
      },
      references: (column: string = 'id'): ReferenceChainable => {
        // Store the referenced column for later use with inTable
        this._referencedColumn = column;
        
        // Return an object with inTable method
        return {
          ...this.chainable(columnName),
          inTable: (tableName: string): ForeignKeyChainable => {
            this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_${columnName}_fkey FOREIGN KEY (${columnName}) REFERENCES ${tableName}(${this._referencedColumn})`);
            
            // Return an object with onDelete and onUpdate methods
            return {
              ...this.chainable(columnName),
              onDelete: (action: string): ColumnChainable => {
                // Поддерживаемые действия: CASCADE, RESTRICT, SET NULL, SET DEFAULT, NO ACTION
                const validActions = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'];
                const upperAction = action.toUpperCase();
                
                if (!validActions.includes(upperAction)) {
                  throw new Error(`Invalid ON DELETE action: ${action}. Valid actions are: ${validActions.join(', ')}`);
                }
                
                // Удаляем предыдущее ограничение и создаем новое с ON DELETE
                this.alterQueries.pop(); // Удаляем последний запрос (добавление ограничения)
                this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_${columnName}_fkey FOREIGN KEY (${columnName}) REFERENCES ${tableName}(${this._referencedColumn}) ON DELETE ${upperAction}`);
                return this.chainable(columnName);
              },
              onUpdate: (action: string): ColumnChainable => {
                // Поддерживаемые действия: CASCADE, RESTRICT, SET NULL, SET DEFAULT, NO ACTION
                const validActions = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'];
                const upperAction = action.toUpperCase();
                
                if (!validActions.includes(upperAction)) {
                  throw new Error(`Invalid ON UPDATE action: ${action}. Valid actions are: ${validActions.join(', ')}`);
                }
                
                // Удаляем предыдущее ограничение и создаем новое с ON UPDATE
                this.alterQueries.pop(); // Удаляем последний запрос (добавление ограничения)
                this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${this.tableName}_${columnName}_fkey FOREIGN KEY (${columnName}) REFERENCES ${tableName}(${this._referencedColumn}) ON UPDATE ${upperAction}`);
                return this.chainable(columnName);
              }
            };
          }
        };
      },
      comment: (text: string): ColumnChainable => {
        this.alterQueries.push(`COMMENT ON COLUMN ${this.tableName}.${columnName} IS '${text.replace(/'/g, "''")}'`);
        return this.chainable(columnName);
      }
    };
  }

  /**
   * Добавляет комментарий к таблице
   * @param text - текст комментария
   */
  comment(text: string): AlterTableBuilder {
    this.alterQueries.push(`COMMENT ON TABLE ${this.tableName} IS '${text.replace(/'/g, "''")}'`);
    return this;
  }

  /**
   * Добавляет ограничение внешнего ключа
   * @param columns - колонки для внешнего ключа
   * @param referenceTable - таблица, на которую ссылается внешний ключ
   * @param referenceColumns - колонки, на которые ссылается внешний ключ
   */
  foreign(columns: string | string[], referenceTable: string, referenceColumns: string | string[]): ForeignKeyConstraintChainable {
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    const referenceColumnList = Array.isArray(referenceColumns) ? referenceColumns.join(', ') : referenceColumns;
    const constraintName = `${this.tableName}_${Array.isArray(columns) ? columns.join('_') : columns}_fkey`;
    
    this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${columnList}) REFERENCES ${referenceTable}(${referenceColumnList})`);
    
    return {
      onDelete: (action: string): AlterTableBuilder => {
        // Поддерживаемые действия: CASCADE, RESTRICT, SET NULL, SET DEFAULT, NO ACTION
        const validActions = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'];
        const upperAction = action.toUpperCase();
        
        if (!validActions.includes(upperAction)) {
          throw new Error(`Invalid ON DELETE action: ${action}. Valid actions are: ${validActions.join(', ')}`);
        }
        
        // Удаляем предыдущее ограничение и создаем новое с ON DELETE
        this.alterQueries.pop(); // Удаляем последний запрос (добавление ограничения)
        this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${columnList}) REFERENCES ${referenceTable}(${referenceColumnList}) ON DELETE ${upperAction}`);
        return this;
      },
      onUpdate: (action: string): AlterTableBuilder => {
        // Поддерживаемые действия: CASCADE, RESTRICT, SET NULL, SET DEFAULT, NO ACTION
        const validActions = ['CASCADE', 'RESTRICT', 'SET NULL', 'SET DEFAULT', 'NO ACTION'];
        const upperAction = action.toUpperCase();
        
        if (!validActions.includes(upperAction)) {
          throw new Error(`Invalid ON UPDATE action: ${action}. Valid actions are: ${validActions.join(', ')}`);
        }
        
        // Удаляем предыдущее ограничение и создаем новое с ON UPDATE
        this.alterQueries.pop(); // Удаляем последний запрос (добавление ограничения)
        this.alterQueries.push(`ALTER TABLE ${this.tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${columnList}) REFERENCES ${referenceTable}(${referenceColumnList}) ON UPDATE ${upperAction}`);
        return this;
      }
    };
  }
}

export default AlterTableBuilder;