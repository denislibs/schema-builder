import fs from 'fs/promises';
import path from 'path';
import type { DatabaseSchema, DatabaseTable, DatabaseColumn, ModelOptions } from './types/generator.js';

export class ModelGenerator {
  constructor(private schema: DatabaseSchema) {}

  async generateModels(options: ModelOptions = {}): Promise<Map<string, string>> {
    const {
      ormStyle = 'active-record',
      baseClass = 'BaseModel',
      includeMethods = true,
      includeValidation = false,
      camelCase = true,
      addRelations = true
    } = options;

    const models = new Map<string, string>();

    // Генерируем базовый класс
    models.set('BaseModel', this.generateBaseModel(options));

    // Генерируем модели для каждой таблицы
    for (const table of this.schema.tables) {
      const modelName = this.toPascalCase(table.table_name);
      let modelContent = '';

      switch (ormStyle) {
        case 'active-record':
          modelContent = this.generateActiveRecordModel(table, { ...options, baseClass });
          break;
        case 'data-mapper':
          modelContent = this.generateDataMapperModel(table, options);
          break;
        case 'simple':
          modelContent = this.generateSimpleModel(table, options);
          break;
      }

      models.set(modelName, modelContent);
    }

    return models;
  }

  async saveModels(outputDir: string, options: ModelOptions = {}): Promise<void> {
    const models = await this.generateModels(options);
    
    // Создаем директорию если не существует
    await fs.mkdir(outputDir, { recursive: true });

    // Сохраняем каждую модель в отдельный файл
    for (const [modelName, content] of models) {
      const fileName = options.camelCase 
        ? this.toCamelCase(modelName) + '.ts'
        : this.toSnakeCase(modelName) + '.ts';
      
      const filePath = path.join(outputDir, fileName);
      await fs.writeFile(filePath, content, 'utf8');
    }

    // Генерируем index файл
    const indexContent = this.generateIndexFile(models, options);
    await fs.writeFile(path.join(outputDir, 'index.ts'), indexContent, 'utf8');
  }

  private generateBaseModel(options: ModelOptions): string {
    return `import { Pool, QueryResult } from 'pg';

/**
 * Base Model class providing common database operations
 */
export abstract class BaseModel {
  protected static pool: Pool;
  protected static tableName: string;
  
  // Instance properties
  protected _isDirty = false;
  protected _isNew = true;
  protected _originalData: Record<string, any> = {};

  static setPool(pool: Pool): void {
    this.pool = pool;
  }

  constructor(data: Record<string, any> = {}) {
    Object.assign(this, data);
    this._originalData = { ...data };
    this._isNew = !this.getPrimaryKeyValue();
  }

  // ===== STATIC METHODS =====

  static async find<T extends BaseModel>(this: new (...args: any[]) => T, id: any): Promise<T | null> {
    const query = \`SELECT * FROM \${this.tableName} WHERE id = $1\`;
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const instance = new this(result.rows[0]);
    instance._isNew = false;
    return instance;
  }

  static async findBy<T extends BaseModel>(
    this: new (...args: any[]) => T, 
    conditions: Record<string, any>
  ): Promise<T | null> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, index) => \`\${key} = $\${index + 1}\`).join(' AND ');
    
    const query = \`SELECT * FROM \${this.tableName} WHERE \${whereClause} LIMIT 1\`;
    const result = await this.pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    const instance = new this(result.rows[0]);
    instance._isNew = false;
    return instance;
  }

  static async findAll<T extends BaseModel>(
    this: new (...args: any[]) => T,
    conditions: Record<string, any> = {},
    options: { limit?: number; offset?: number; orderBy?: string } = {}
  ): Promise<T[]> {
    let query = \`SELECT * FROM \${this.tableName}\`;
    const values: any[] = [];
    
    if (Object.keys(conditions).length > 0) {
      const keys = Object.keys(conditions);
      const whereClause = keys.map((key, index) => \`\${key} = $\${index + 1}\`).join(' AND ');
      query += \` WHERE \${whereClause}\`;
      values.push(...Object.values(conditions));
    }

    if (options.orderBy) {
      query += \` ORDER BY \${options.orderBy}\`;
    }

    if (options.limit) {
      query += \` LIMIT \${options.limit}\`;
    }

    if (options.offset) {
      query += \` OFFSET \${options.offset}\`;
    }

    const result = await this.pool.query(query, values);
    return result.rows.map(row => {
      const instance = new this(row);
      instance._isNew = false;
      return instance;
    });
  }

  static async create<T extends BaseModel>(
    this: new (...args: any[]) => T,
    data: Record<string, any>
  ): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => \`$\${index + 1}\`).join(', ');
    
    const query = \`
      INSERT INTO \${this.tableName} (\${keys.join(', ')}) 
      VALUES (\${placeholders}) 
      RETURNING *
    \`;
    
    const result = await this.pool.query(query, values);
    const instance = new this(result.rows[0]);
    instance._isNew = false;
    return instance;
  }

  static async deleteWhere(conditions: Record<string, any>): Promise<number> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClause = keys.map((key, index) => \`\${key} = $\${index + 1}\`).join(' AND ');
    
    const query = \`DELETE FROM \${(this as any).tableName} WHERE \${whereClause}\`;
    const result = await this.pool.query(query, values);
    return result.rowCount || 0;
  }

  // ===== INSTANCE METHODS =====

  async save(): Promise<this> {
    if (this._isNew) {
      return this.insert();
    } else {
      return this.update();
    }
  }

  async insert(): Promise<this> {
    const data = this.getAttributes();
    const keys = Object.keys(data).filter(key => data[key] !== undefined);
    const values = keys.map(key => data[key]);
    const placeholders = values.map((_, index) => \`$\${index + 1}\`).join(', ');
    
    const query = \`
      INSERT INTO \${(this.constructor as any).tableName} (\${keys.join(', ')}) 
      VALUES (\${placeholders}) 
      RETURNING *
    \`;
    
    const result = await (this.constructor as any).pool.query(query, values);
    Object.assign(this, result.rows[0]);
    this._isNew = false;
    this._isDirty = false;
    this._originalData = { ...result.rows[0] };
    return this;
  }

  async update(): Promise<this> {
    if (!this._isDirty) {
      return this;
    }

    const data = this.getChanges();
    if (Object.keys(data).length === 0) {
      return this;
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => \`\${key} = $\${index + 1}\`).join(', ');
    const primaryKey = this.getPrimaryKeyValue();
    
    const query = \`
      UPDATE \${(this.constructor as any).tableName} 
      SET \${setClause} 
      WHERE id = $\${values.length + 1} 
      RETURNING *
    \`;
    
    const result = await (this.constructor as any).pool.query(query, [...values, primaryKey]);
    Object.assign(this, result.rows[0]);
    this._isDirty = false;
    this._originalData = { ...result.rows[0] };
    return this;
  }

  async delete(): Promise<boolean> {
    const primaryKey = this.getPrimaryKeyValue();
    if (!primaryKey) {
      return false;
    }

    const query = \`DELETE FROM \${(this.constructor as any).tableName} WHERE id = $1\`;
    const result = await (this.constructor as any).pool.query(query, [primaryKey]);
    return (result.rowCount || 0) > 0;
  }

  async reload(): Promise<this> {
    const primaryKey = this.getPrimaryKeyValue();
    if (!primaryKey) {
      throw new Error('Cannot reload model without primary key');
    }

    const query = \`SELECT * FROM \${(this.constructor as any).tableName} WHERE id = $1\`;
    const result = await (this.constructor as any).pool.query(query, [primaryKey]);
    
    if (result.rows.length === 0) {
      throw new Error('Record not found');
    }

    Object.assign(this, result.rows[0]);
    this._isDirty = false;
    this._originalData = { ...result.rows[0] };
    return this;
  }

  // ===== HELPER METHODS =====

  protected abstract getPrimaryKeyValue(): any;
  
  protected getAttributes(): Record<string, any> {
    const attrs: Record<string, any> = {};
    for (const key in this) {
      if (!key.startsWith('_') && typeof this[key] !== 'function') {
        attrs[key] = this[key];
      }
    }
    return attrs;
  }

  protected getChanges(): Record<string, any> {
    const changes: Record<string, any> = {};
    const current = this.getAttributes();
    
    for (const key in current) {
      if (current[key] !== this._originalData[key]) {
        changes[key] = current[key];
      }
    }
    
    return changes;
  }

  isNew(): boolean {
    return this._isNew;
  }

  isDirty(): boolean {
    return this._isDirty;
  }

  toJSON(): Record<string, any> {
    return this.getAttributes();
  }
}
`;
  }

  private generateActiveRecordModel(table: DatabaseTable, options: ModelOptions): string {
    const className = this.toPascalCase(table.table_name);
    const { baseClass = 'BaseModel', includeValidation, camelCase, addRelations } = options;
    
    let output = this.generateHeader();
    
    // Импорты
    output += `import { ${baseClass} } from './${baseClass}.js';\n`;
    if (includeValidation) {
      output += `import { z } from 'zod';\n`;
    }
    
    // Добавляем импорты для связанных моделей
    if (addRelations) {
      const relatedTables = table.foreign_keys.map(fk => fk.foreign_table);
      for (const relatedTable of [...new Set(relatedTables)]) {
        const relatedModel = this.toPascalCase(relatedTable);
        output += `import { ${relatedModel} } from './${relatedModel}.js';\n`;
      }
    }

    output += '\n';

    // Интерфейс для типизации
    output += this.generateInterface(table, options);

    // Класс модели
    output += `export class ${className} extends ${baseClass} implements I${className} {\n`;
    output += `  protected static override tableName = '${table.table_name}';\n\n`;

    // Свойства
    for (const column of table.columns) {
      const propName = camelCase ? this.toCamelCase(column.column_name) : column.column_name;
      const tsType = this.mapPostgreSQLToTypeScript(column);
      const optional = column.is_nullable === 'YES' || column.column_default !== null ? '?' : '';
      
      output += `  ${propName}${optional}: ${tsType};\n`;
    }

    // Validation schema
    if (includeValidation) {
      output += '\n  // Validation Schema\n';
      output += `  private static validationSchema = z.object({\n`;
      
      for (const column of table.columns) {
        const propName = camelCase ? this.toCamelCase(column.column_name) : column.column_name;
        const zodType = this.mapPostgreSQLToZod(column);
        output += `    ${propName}: ${zodType},\n`;
      }
      
      output += '  });\n\n';
      
      output += '  validate(): boolean {\n';
      output += '    try {\n';
      output += `      ${className}.validationSchema.parse(this.getAttributes());\n`;
      output += '      return true;\n';
      output += '    } catch {\n';
      output += '      return false;\n';
      output += '    }\n';
      output += '  }\n\n';
    }

    // Primary key method
    const primaryKey = table.primary_keys[0] || 'id';
    const primaryKeyProp = camelCase ? this.toCamelCase(primaryKey) : primaryKey;
    
    output += '  protected getPrimaryKeyValue(): any {\n';
    output += `    return this.${primaryKeyProp};\n`;
    output += '  }\n\n';

    // Static methods for this specific model
    output += this.generateStaticMethods(table, className, options);

    // Relations
    if (addRelations) {
      output += this.generateRelationMethods(table, options);
    }

    // Custom methods
    output += this.generateCustomMethods(table, options);

    output += '}\n';

    return output;
  }

  private generateDataMapperModel(table: DatabaseTable, options: ModelOptions): string {
    const className = this.toPascalCase(table.table_name);
    const repositoryName = `${className}Repository`;
    
    let output = this.generateHeader();
    
    // Entity class
    output += this.generateInterface(table, options);
    
    output += `export class ${className} implements I${className} {\n`;
    
    for (const column of table.columns) {
      const propName = options.camelCase ? this.toCamelCase(column.column_name) : column.column_name;
      const tsType = this.mapPostgreSQLToTypeScript(column);
      const optional = column.is_nullable === 'YES' || column.column_default !== null ? '?' : '';
      
      output += `  ${propName}${optional}: ${tsType};\n`;
    }
    
    output += '\n  constructor(data: Partial<I' + className + '> = {}) {\n';
    output += '    Object.assign(this, data);\n';
    output += '  }\n';
    output += '}\n\n';

    // Repository class
    output += this.generateRepository(table, className, options);

    return output;
  }

  private generateSimpleModel(table: DatabaseTable, options: ModelOptions): string {
    const className = this.toPascalCase(table.table_name);
    
    let output = this.generateHeader();
    
    // Interface
    output += this.generateInterface(table, options);
    
    // Simple class with just data and basic methods
    output += `export class ${className} implements I${className} {\n`;
    
    for (const column of table.columns) {
      const propName = options.camelCase ? this.toCamelCase(column.column_name) : column.column_name;
      const tsType = this.mapPostgreSQLToTypeScript(column);
      const optional = column.is_nullable === 'YES' || column.column_default !== null ? '?' : '';
      
      output += `  ${propName}${optional}: ${tsType};\n`;
    }
    
    output += '\n  constructor(data: Partial<I' + className + '> = {}) {\n';
    output += '    Object.assign(this, data);\n';
    output += '  }\n\n';
    
    output += '  toJSON(): Record<string, any> {\n';
    output += '    return { ...this };\n';
    output += '  }\n\n';
    
    output += '  static fromJSON(data: Record<string, any>): ' + className + ' {\n';
    output += '    return new ' + className + '(data);\n';
    output += '  }\n';
    
    output += '}\n';

    return output;
  }

  private generateInterface(table: DatabaseTable, options: ModelOptions): string {
    const interfaceName = `I${this.toPascalCase(table.table_name)}`;
    
    let output = `export interface ${interfaceName} {\n`;

    for (const column of table.columns) {
      const propName = options.camelCase ? this.toCamelCase(column.column_name) : column.column_name;
      const tsType = this.mapPostgreSQLToTypeScript(column);
      const optional = column.is_nullable === 'YES' || column.column_default !== null ? '?' : '';
      
      output += `  ${propName}${optional}: ${tsType};\n`;
    }

    output += '}\n\n';

    return output;
  }

  private generateStaticMethods(table: DatabaseTable, className: string, options: ModelOptions): string {
    let output = '';

    // findBy methods for common fields
    const commonFields = table.columns.filter(col => 
      col.column_name.includes('email') || 
      col.column_name.includes('name') || 
      col.column_name.includes('slug') ||
      col.is_unique
    );

    for (const field of commonFields) {
      const propName = options.camelCase ? this.toCamelCase(field.column_name) : field.column_name;
      const methodName = `findBy${this.toPascalCase(field.column_name)}`;
      
      output += `  static async ${methodName}(${propName}: ${this.mapPostgreSQLToTypeScript(field)}): Promise<${className} | null> {\n`;
      output += `    return this.findBy({ ${propName} }) as Promise<${className} | null>;\n`;
      output += '  }\n\n';
    }

    // Scopes for common queries
    if (table.columns.some(col => col.column_name.includes('active') || col.column_name.includes('enabled'))) {
      output += `  static async active(): Promise<${className}[]> {\n`;
      const activeField = table.columns.find(col => col.column_name.includes('active') || col.column_name.includes('enabled'));
      const activeProp = options.camelCase ? this.toCamelCase(activeField!.column_name) : activeField!.column_name;
      output += `    return this.findAll({ ${activeProp}: true }) as Promise<${className}[]>;\n`;
      output += '  }\n\n';
    }

    return output;
  }

  private generateRelationMethods(table: DatabaseTable, options: ModelOptions): string {
    let output = '\n  // ===== RELATIONS =====\n\n';

    // belongsTo relations (foreign keys)
    for (const fk of table.foreign_keys) {
      const relatedModel = this.toPascalCase(fk.foreign_table);
      const methodName = options.camelCase ? this.toCamelCase(fk.foreign_table) : fk.foreign_table;
      const foreignKey = options.camelCase ? this.toCamelCase(fk.column_name) : fk.column_name;
      
      output += `  async ${methodName}(): Promise<${relatedModel} | null> {\n`;
      output += `    if (!this.${foreignKey}) return null;\n`;
      output += `    return ${relatedModel}.find(this.${foreignKey});\n`;
      output += '  }\n\n';
    }

    // TODO: hasMany relations (обратные связи) - потребует анализ всех таблиц

    return output;
  }

  private generateCustomMethods(table: DatabaseTable, options: ModelOptions): string {
    let output = '\n  // ===== CUSTOM METHODS =====\n\n';

    // Soft delete если есть deleted_at
    if (table.columns.some(col => col.column_name.includes('deleted_at'))) {
      const deletedAtField = options.camelCase ? 'deletedAt' : 'deleted_at';
      
      output += '  async softDelete(): Promise<void> {\n';
      output += `    this.${deletedAtField} = new Date();\n`;
      output += '    await this.save();\n';
      output += '  }\n\n';
      
      output += '  isDeleted(): boolean {\n';
      output += `    return this.${deletedAtField} !== null;\n`;
      output += '  }\n\n';
    }

    // Timestamps methods если есть created_at/updated_at
    if (table.columns.some(col => col.column_name.includes('updated_at'))) {
      const updatedAtField = options.camelCase ? 'updatedAt' : 'updated_at';
      
      output += '  touch(): void {\n';
      output += `    this.${updatedAtField} = new Date();\n`;
      output += '    this._isDirty = true;\n';
      output += '  }\n\n';
    }

    return output;
  }

  private generateRepository(table: DatabaseTable, className: string, options: ModelOptions): string {
    const repositoryName = `${className}Repository`;
    
    let output = `export class ${repositoryName} {\n`;
    output += '  constructor(private pool: Pool) {}\n\n';
    
    // CRUD methods
    output += `  async find(id: any): Promise<${className} | null> {\n`;
    output += `    const query = 'SELECT * FROM ${table.table_name} WHERE id = $1';\n`;
    output += '    const result = await this.pool.query(query, [id]);\n';
    output += '    return result.rows.length > 0 ? new ' + className + '(result.rows[0]) : null;\n';
    output += '  }\n\n';
    
    output += `  async findAll(conditions: Partial<${className}> = {}): Promise<${className}[]> {\n`;
    output += '    let query = `SELECT * FROM ' + table.table_name + '`;\n';
    output += '    const values: any[] = [];\n';
    output += '    \n';
    output += '    if (Object.keys(conditions).length > 0) {\n';
    output += '      const keys = Object.keys(conditions);\n';
    output += '      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(\' AND \');\n';
    output += '      query += ` WHERE ${whereClause}`;\n';
    output += '      values.push(...Object.values(conditions));\n';
    output += '    }\n';
    output += '    \n';
    output += '    const result = await this.pool.query(query, values);\n';
    output += '    return result.rows.map(row => new ' + className + '(row));\n';
    output += '  }\n\n';
    
    output += `  async create(data: Partial<${className}>): Promise<${className}> {\n`;
    output += '    const keys = Object.keys(data);\n';
    output += '    const values = Object.values(data);\n';
    output += '    const placeholders = values.map((_, index) => `$${index + 1}`).join(\', \');\n';
    output += '    \n';
    output += '    const query = `INSERT INTO ' + table.table_name + ' (${keys.join(\', \')}) VALUES (${placeholders}) RETURNING *`;\n';
    output += '    const result = await this.pool.query(query, values);\n';
    output += '    return new ' + className + '(result.rows[0]);\n';
    output += '  }\n\n';
    
    output += `  async update(id: any, data: Partial<${className}>): Promise<${className} | null> {\n`;
    output += '    const keys = Object.keys(data);\n';
    output += '    const values = Object.values(data);\n';
    output += '    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(\', \');\n';
    output += '    \n';
    output += '    const query = `UPDATE ' + table.table_name + ' SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`;\n';
    output += '    const result = await this.pool.query(query, [...values, id]);\n';
    output += '    return result.rows.length > 0 ? new ' + className + '(result.rows[0]) : null;\n';
    output += '  }\n\n';
    
    output += '  async delete(id: any): Promise<boolean> {\n';
    output += '    const query = `DELETE FROM ' + table.table_name + ' WHERE id = $1`;\n';
    output += '    const result = await this.pool.query(query, [id]);\n';
    output += '    return (result.rowCount || 0) > 0;\n';
    output += '  }\n';
    
    output += '}\n';

    return output;
  }

  private generateIndexFile(models: Map<string, string>, options: ModelOptions): string {
    let output = this.generateHeader();
    
    output += '// Auto-generated exports\n\n';
    
    for (const modelName of models.keys()) {
      const fileName = options.camelCase 
        ? this.toCamelCase(modelName)
        : this.toSnakeCase(modelName);
      
      output += `export * from './${fileName}.js';\n`;
    }

    return output;
  }

  private generateHeader(): string {
    const timestamp = new Date().toISOString();
    return `/**
 * Auto-generated Model
 * Generated at: ${timestamp}
 * 
 * ⚠️  DO NOT EDIT THIS FILE MANUALLY
 * This file is automatically generated from your database schema.
 * To regenerate, run: pg-migrate generate:models
 */

`;
  }

  // Utility methods (same as in TypeGenerator)
  private mapPostgreSQLToTypeScript(column: DatabaseColumn): string {
    // Same implementation as TypeGenerator
    const { data_type, is_nullable } = column;
    let tsType: string;

    switch (data_type.toLowerCase()) {
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'decimal':
      case 'numeric':
      case 'real':
      case 'double precision':
      case 'serial':
      case 'bigserial':
        tsType = 'number';
        break;
      case 'character varying':
      case 'varchar':
      case 'character':
      case 'char':
      case 'text':
        tsType = 'string';
        break;
      case 'boolean':
        tsType = 'boolean';
        break;
      case 'timestamp':
      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'date':
      case 'time':
        tsType = 'Date | string';
        break;
      case 'json':
      case 'jsonb':
        tsType = 'Record<string, any>';
        break;
      case 'uuid':
        tsType = 'string';
        break;
      default:
        tsType = 'any';
    }

    if (is_nullable === 'YES') {
      tsType += ' | null';
    }

    return tsType;
  }

  private mapPostgreSQLToZod(column: DatabaseColumn): string {
    // Same implementation as TypeGenerator
    const { data_type, is_nullable, character_maximum_length } = column;
    let zodType: string;

    switch (data_type.toLowerCase()) {
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'serial':
      case 'bigserial':
        zodType = 'z.number().int()';
        break;
      case 'decimal':
      case 'numeric':
      case 'real':
      case 'double precision':
        zodType = 'z.number()';
        break;
      case 'character varying':
      case 'varchar':
      case 'character':
      case 'char':
      case 'text':
        zodType = 'z.string()';
        if (character_maximum_length) {
          zodType += `.max(${character_maximum_length})`;
        }
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'timestamp':
      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'date':
        zodType = 'z.string().datetime()';
        break;
      case 'json':
      case 'jsonb':
        zodType = 'z.record(z.any())';
        break;
      case 'uuid':
        zodType = 'z.string().uuid()';
        break;
      default:
        zodType = 'z.any()';
    }

    if (is_nullable === 'YES') {
      zodType += '.nullable()';
    }

    if (column.column_default !== null) {
      zodType += '.optional()';
    }

    return zodType;
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[_\s-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }
}
