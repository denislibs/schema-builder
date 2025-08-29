import { Pool } from 'pg';
import { SchemaBuilder } from '../packages/main/src';

// Пример использования SchemaBuilder с TypeScript
async function main() {
  // Создаем пул подключений к базе данных
  const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mydb',
    password: 'password',
    port: 5432,
  });

  // Создаем экземпляр SchemaBuilder
  const schema = new SchemaBuilder(pool, {
    schemaName: 'public',
    migrationsTable: 'migrations'
  });

  try {
    // Проверяем существование таблицы
    const hasUsersTable = await schema.hasTable('users');
    
    if (!hasUsersTable) {
      console.log('Создаем таблицу users...');
      
      // Создаем таблицу users
      await schema.createTable('users', (table) => {
        table.increments('id');
        table.string('name', 100).notNullable();
        table.string('email', 255).notNullable().unique();
        table.boolean('active').defaultTo(true);
        table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
        
        // Добавляем индекс
        table.index('email');
        
        // Добавляем комментарий к таблице
        table.comment('Таблица пользователей');
      });
      
      console.log('Таблица users успешно создана!');
    } else {
      console.log('Таблица users уже существует.');
      
      // Проверяем существование колонки
      const hasPhoneColumn = await schema.hasColumn('users', 'phone');
      
      if (!hasPhoneColumn) {
        console.log('Добавляем колонку phone в таблицу users...');
        
        // Изменяем таблицу users
        await schema.alterTable('users', (table) => {
          table.addString('phone', 20).nullable();
        });
        
        console.log('Колонка phone успешно добавлена!');
      }
    }
    
    // Получаем информацию о схеме таблицы
    const tableSchema = await schema.getTableSchema('users');
    console.log('Информация о таблице users:');
    console.log('Колонки:', tableSchema.columns);
    console.log('Первичный ключ:', tableSchema.primaryKey);
    console.log('Индексы:', tableSchema.indexes);
    
  } catch (error) {
    console.error('Произошла ошибка:', error);
  } finally {
    // Закрываем пул подключений
    await pool.end();
  }
}

// Запускаем пример
main().catch(console.error);