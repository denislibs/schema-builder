import { newDb, IMemoryDb, DataType } from 'pg-mem';
import { Pool } from 'pg';

/**
 * Создает in-memory базу данных для тестирования
 */
export function createTestDb(): { db: IMemoryDb; pool: Pool } {
  // Создаем in-memory базу данных
  const db = newDb();
  
  // Регистрируем расширения PostgreSQL, которые используются в проекте
  db.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
    });
  });

  // Создаем пул подключений к in-memory базе данных
  // В pg-mem 3.0.5 правильный способ получения пула:
  const { Pool: MemPool } = db.adapters.createPg();
  const pool = new MemPool() as Pool;

  // Добавляем метод end для совместимости с реальным пулом pg
  pool.end = async () => {
    // Пустая реализация для совместимости
    return Promise.resolve();
  };
  
  return { db, pool };
}

/**
 * Очищает таблицу в базе данных
 */
export async function clearTable(pool: Pool, tableName: string): Promise<void> {
  await pool.query(`DELETE FROM ${tableName}`);
}

/**
 * Проверяет существование таблицы в базе данных
 */
export async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);
  
  return result.rows.length > 0;
}

/**
 * Получает список колонок таблицы
 */
export async function getTableColumns(pool: Pool, tableName: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);
  
  return result.rows.map(row => row.column_name);
}