/**
 * Пример использования статических методов ColumnBuilder для создания колонок разных типов
 */
import { ColumnBuilder } from '../packages/main/src';

// Пример создания таблицы пользователей с использованием нового API
const createUsersTable = () => {
  // Создание колонок с использованием статических методов
  const idColumn = ColumnBuilder.Serial('id').primary();
  const usernameColumn = ColumnBuilder.Varchar('username', 100).notNullable().unique();
  const emailColumn = ColumnBuilder.Varchar('email', 255).notNullable().unique();
  const passwordColumn = ColumnBuilder.Varchar('password', 255).notNullable();
  const createdAtColumn = ColumnBuilder.Timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  const userUuidColumn = ColumnBuilder.UUID('uuid').notNullable().unique();
  const userSettingsColumn = ColumnBuilder.JSONB('settings').defaultTo('{}');
  const lastLoginIpColumn = ColumnBuilder.INET('last_login_ip');
  const tagsColumn = ColumnBuilder.Array('tags', 'TEXT');
  const macAddressColumn = ColumnBuilder.MACADDR('mac_address');
  
  // Вывод SQL определений колонок
  console.log('Колонки таблицы users:');
  console.log(idColumn.toString());
  console.log(usernameColumn.toString());
  console.log(emailColumn.toString());
  console.log(passwordColumn.toString());
  console.log(createdAtColumn.toString());
  console.log(userUuidColumn.toString());
  console.log(userSettingsColumn.toString());
  console.log(lastLoginIpColumn.toString());
  console.log(tagsColumn.toString());
  console.log(macAddressColumn.toString());
};

// Пример создания таблицы постов с внешним ключом на таблицу пользователей
const createPostsTable = () => {
  // Создание колонок с использованием статических методов
  const idColumn = ColumnBuilder.Serial('id').primary();
  const titleColumn = ColumnBuilder.Varchar('title', 200).notNullable();
  const contentColumn = ColumnBuilder.Text('content').notNullable();
  const userIdColumn = ColumnBuilder.Integer('user_id').notNullable()
    .references('id').inTable('users').onDelete('CASCADE');
  const publishedColumn = ColumnBuilder.Boolean('published').defaultTo(false);
  const createdAtColumn = ColumnBuilder.Timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  
  // Вывод SQL определений колонок
  console.log('\nКолонки таблицы posts:');
  console.log(idColumn.toString());
  console.log(titleColumn.toString());
  console.log(contentColumn.toString());
  console.log(userIdColumn.toString());
  console.log(publishedColumn.toString());
  console.log(createdAtColumn.toString());
};

// Запуск примеров
createUsersTable();
createPostsTable();