import type { Pool } from 'pg';

export abstract class BaseSeeder {

  constructor(protected pool: Pool) {}

  /**
   * Выполняет заполнение данными
   */
  abstract run(): Promise<void>;

  /**
   * Откатывает изменения сидера (опционально)
   */
  async down?(): Promise<void>;

  /**
   * Закрывает соединение с базой данных
   */
  async close(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
      }
    } catch (error) {
      console.error('Error closing seeder connection:', error);
    }
  }

  /**
   * Выполняет SQL запрос
   */
  protected async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  /**
   * Получает количество записей в таблице
   */
  protected async count(tableName: string): Promise<number> {
    const result = await this.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  }

  /**
   * Проверяет существование записи
   */
  protected async exists(tableName: string, condition: string, params?: any[]): Promise<boolean> {
    const result = await this.query(
      `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE ${condition})`,
      params
    );
    return result.rows[0].exists;
  }

  /**
   * Вставляет данные с возможностью конфликтов
   */
  protected async insertOrIgnore(tableName: string, data: Record<string, any>[]): Promise<void> {
    if (data.length === 0) return;

    const columns = Object.keys(data[0]);
    const values = data.map(row => 
      columns.map(col => row[col])
    );

    const placeholders = data.map((_, rowIndex) => 
      `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
    ).join(', ');

    const flatValues = values.flat();
    
    await this.query(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      flatValues
    );
  }

  /**
   * Генерирует fake данные (простые утилиты)
   */
  protected faker = {
    name: () => {
      const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
      return names[Math.floor(Math.random() * names.length)];
    },
    
    email: () => {
      const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'test.com'];
      const name = this.faker.name().toLowerCase();
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return `${name}${Math.floor(Math.random() * 1000)}@${domain}`;
    },
    
    number: (min: number = 1, max: number = 100) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    boolean: () => Math.random() > 0.5,
    
    date: (start: Date = new Date(2020, 0, 1), end: Date = new Date()) => {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    },
    
    text: (length: number = 50) => {
      const chars = 'abcdefghijklmnopqrstuvwxyz ';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result.trim();
    }
  };
}