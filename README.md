# SchemaBuilder Documentation

SchemaBuilder - это инструмент для управления схемой базы данных PostgreSQL в Node.js с поддержкой TypeScript. Он предоставляет удобный API для создания, изменения и удаления таблиц, колонок, индексов и других объектов базы данных.

## Содержание

1. [Установка и настройка](#установка-и-настройка)
2. [Создание таблиц](#создание-таблиц)
3. [Типы данных](#типы-данных)
4. [Модификаторы колонок](#модификаторы-колонок)
5. [Изменение таблиц](#изменение-таблиц)
6. [Индексы](#индексы)
7. [Внешние ключи](#внешние-ключи)
8. [Миграции](#миграции)
9. [Транзакции](#транзакции)
10. [Представления и материализованные представления](#представления-и-материализованные-представления)
11. [Функции и триггеры](#функции-и-триггеры)
12. [Генерация моделей](#генерация-моделей)
13. [Дополнительные возможности](#дополнительные-возможности)
14. [TypeScript и система сборки](#typescript-и-система-сборки)

## Установка и настройка

Для использования SchemaBuilder необходимо создать экземпляр класса, передав ему объект подключения к базе данных PostgreSQL:

```javascript
import { Pool } from 'pg';
import SchemaBuilder from './schema/SchemaBuilder.js';

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
  schemaName: 'public', // Имя схемы (по умолчанию 'public')
  migrationsTable: 'migrations' // Имя таблицы миграций (по умолчанию 'migrations')
});
```

## Создание таблиц

Для создания таблицы используется метод createTable:

```javascript
await schema.createTable('users', (table) => {
  table.increments('id'); // Создает колонку id типа SERIAL с PRIMARY KEY
  table.string('name', 100).notNullable();
  table.string('email', 255).notNullable().unique();
  table.string('password', 255).notNullable();
  table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
});
```

## Типы данных

SchemaBuilder поддерживает следующие типы данных:

### Основные типы
```javascript
table.increments('id');           // SERIAL PRIMARY KEY
table.integer('count');           // INTEGER
table.string('name', 255);        // VARCHAR(255)
table.text('description');        // TEXT
table.timestamp('created_at');    // TIMESTAMP WITH TIME ZONE
table.boolean('is_active');       // BOOLEAN
table.json('metadata');           // JSONB
table.date('birth_date');         // DATE
```

### Дополнительные типы
```javascript
table.uuid('id');                 // UUID
table.decimal('price', 8, 2);     // DECIMAL(8,2)
table.float('rate');              // FLOAT
table.double('amount');           // DOUBLE PRECISION
table.bigInteger('big_number');   // BIGINT
table.smallInteger('small_number'); // SMALLINT
table.time('meeting_time');       // TIME
table.array('tags', 'text');      // TEXT[]
table.jsonType('data');           // JSON (не JSONB)
table.enum('status', ['active', 'inactive', 'pending']); // TEXT с CHECK ограничением
```

## Модификаторы колонок
Для колонок можно указать различные модификаторы:

```javascript
table.string('username')
  .notNullable()                  // NOT NULL
  .unique()                       // UNIQUE
  .defaultTo('guest')             // DEFAULT 'guest'
  .primary();                     // PRIMARY KEY

// Для внешних ключей
table.integer('user_id')
  .references('id')               // REFERENCES users(id)
  .inTable('users')
  .onDelete('CASCADE')            // ON DELETE CASCADE
  .onUpdate('CASCADE');           // ON UPDATE CASCADE
```

## Изменение таблиц
Для изменения существующей таблицы используется метод alterTable:

```javascript
await schema.alterTable('users', (table) => {
  // Добавление новой колонки
  table.addString('phone', 20);
  
  // Добавление колонки с ограничениями
  table.addInteger('role_id')
    .notNullable()
    .defaultTo(1)
    .references('id')
    .inTable('roles')
    .onDelete('CASCADE');
  
  // Удаление колонки
  table.dropColumn('old_column');
  
  // Переименование колонки
  table.renameColumn('old_name', 'new_name');
});
```

## Индексы
Для создания индексов можно использовать методы index и uniqueIndex :

```javascript
// При создании таблицы
await schema.createTable('users', (table) => {
  table.increments('id');
  table.string('email', 255).notNullable();
  table.string('username', 100).notNullable();
  
  // Создание индекса
  table.index('email');
  
  // Создание индекса с указанием имени
  table.index('username', 'idx_username');
  
  // Создание составного индекса
  table.index(['email', 'username']);
  
  // Создание уникального индекса
  table.uniqueIndex('email', 'uniq_email');
});

// Или отдельно после создания таблицы
await schema.createIndexIfNotExists('idx_users_email', 'users', 'email');
```

## Внешние ключи
Внешние ключи можно создавать как при создании таблицы, так и при ее изменении:

```javascript
// При создании таблицы
await schema.createTable('posts', (table) => {
  table.increments('id');
  table.string('title', 255).notNullable();
  table.text('content');
  table.integer('user_id').notNullable()
    .references('id')
    .inTable('users')
    .onDelete('CASCADE')
    .onUpdate('CASCADE');
});

// При изменении таблицы
await schema.alterTable('comments', (table) => {
  table.foreign('post_id', 'posts', 'id')
    .onDelete('CASCADE')
    .onUpdate('CASCADE');
});
```

## Миграции
SchemaBuilder поддерживает систему миграций для управления изменениями схемы базы данных:

```javascript
// Пример файла миграции
// 20240101000001_create_users_table.js
export default {
  name: '20240101000001_create_users_table',
  
  async up(schema) {
    await schema.createTable('users', (table) => {
      table.increments('id');
      table.string('name', 100).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
      table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
    });
  },
  
  async down(schema) {
    await schema.dropTable('users');
  }
};
```
Для выполнения миграций используются методы:

```javascript
// Создание таблицы миграций, если она не существует
await schema.createMigrationsTable();

// Получение списка выполненных миграций
const migrations = await schema.getMigrations();

// Выполнение миграции
await schema.runMigration(migration, batch);

// Откат миграции
await schema.rollbackMigration(migration);
```

## Транзакции

Для выполнения операций в транзакции используется метод transaction :

```javascript
await schema.transaction(async (client) => {
  // Создаем временный SchemaBuilder с клиентом транзакции
  const transactionSchema = new SchemaBuilder(client);
  
  // Выполняем операции
  await transactionSchema.createTable('users', (table) => {
    table.increments('id');
    table.string('name', 100).notNullable();
  });
  
  await transactionSchema.createTable('posts', (table) => {
    table.increments('id');
    table.string('title', 255).notNullable();
    table.integer('user_id').notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });
});
```
## Представления и материализованные представления

Для создания представлений и материализованных представлений используются методы createView и createMaterializedView:

```javascript
// Создание представления
await schema.createView('active_users', `
  SELECT * FROM users WHERE is_active = true
`);

// Создание материализованного представления
await schema.createMaterializedView('user_statistics', `
  SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_users,
    SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_users
  FROM users
`);
```

## Функции и триггеры
Для создания функций и триггеров используются методы createFunction и createTrigger :

```javascript
// Создание функции
await schema.createFunction(
  'update_updated_at',
  [],
  'trigger',
  `
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
  `
);

// Создание триггера
await schema.createTrigger(
  'users_updated_at_trigger',
  'users',
  'BEFORE',
  'UPDATE',
  'update_updated_at'
);
```

## Генерация моделей

SchemaBuilder может генерировать код моделей на основе существующих таблиц:

```javascript
// Генерация модели для таблицы users
const userModelCode = await schema.generateModel('users', 'User');
console.log(userModelCode);
```

## Дополнительные возможности

### Проверка существования таблицы и колонки
```javascript
// Проверка существования таблицы
const tableExists = await schema.hasTable('users');

// Проверка существования колонки в таблице
const columnExists = await schema.hasColumn('users', 'email');
```

### Выполнение произвольных SQL-запросов
```javascript
// Выполнение произвольного SQL-запроса
await schema.raw(`
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
`);
```

### Создание последовательностей
```javascript
// Создание последовательности
await schema.createSequence('my_sequence', {
  start: 1000,
  increment: 10,
  minValue: 1000,
  maxValue: 9999999,
  cache: 10,
  cycle: true
});
```

### Получение информации о схеме таблицы
```javascript
// Получение информации о схеме таблицы
const tableSchema = await schema.getTableSchema('users');
console.log(tableSchema.columns);
console.log(tableSchema.primaryKey);
console.log(tableSchema.foreignKeys);
console.log(tableSchema.indexes);
```

### Кэширование запросов
```javascript
// Выполнение запроса с кэшированием
const result = await schema.query('SELECT * FROM users WHERE id = $1', [1], true);

// Очистка кэша запросов
schema.clearCache();
```

## TypeScript и система сборки

Начиная с версии 1.0.0, SchemaBuilder полностью поддерживает TypeScript, что обеспечивает статическую типизацию и улучшенную поддержку IDE.

### Использование с TypeScript

```typescript
import { Pool } from 'pg';
import { SchemaBuilder, TableBuilder } from 'schema-builder';

// Создаем пул подключений к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mydb',
  password: 'password',
  port: 5432,
});

// Создаем экземпляр SchemaBuilder с типизированными опциями
const schema = new SchemaBuilder(pool, {
  schemaName: 'public',
  migrationsTable: 'migrations'
});

// Типизированные методы и параметры
async function createUsersTable() {
  await schema.createTable('users', (table: TableBuilder) => {
    table.increments('id');
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  });
}
```

### Форматы сборки

Библиотека поставляется в нескольких форматах:

- **CommonJS** - для использования с `require()` в Node.js
- **ESM** - для использования с `import` в современных проектах
- **TypeScript типы** - `.d.ts` файлы для статической типизации

### Установка и сборка из исходного кода

Если вы хотите собрать библиотеку из исходного кода:

```bash
# Клонирование репозитория
git clone https://github.com/your-username/schema-builder.git
cd schema-builder

# Установка зависимостей
npm install

# Сборка библиотеки
npm run build
```

Команда `npm run build` выполнит следующие действия:

1. Очистит директорию `dist`
2. Скомпилирует TypeScript в JavaScript для ESM формата
3. Скомпилирует TypeScript в JavaScript для CommonJS формата
4. Сгенерирует файлы типов TypeScript (`.d.ts`)

### Структура проекта

```
schema-builder/
├── dist/               # Скомпилированные файлы
│   ├── cjs/           # CommonJS формат
│   ├── esm/           # ESM формат
│   └── types/         # TypeScript типы
├── src/               # Исходный код
│   ├── AlterTableBuilder.ts
│   ├── ColumnBuilder.ts
│   ├── SchemaBuilder.ts
│   ├── TableBuilder.ts
│   └── index.ts       # Точка входа
├── package.json       # Метаданные пакета
├── tsconfig.json      # Базовая конфигурация TypeScript
├── tsconfig.cjs.json  # Конфигурация для CommonJS
├── tsconfig.esm.json  # Конфигурация для ESM
└── tsconfig.types.json # Конфигурация для типов
```
```

## Примеры использования
### Пример 1: Создание базы данных для блога
```javascript
// Создание таблицы пользователей
await schema.createTable('users', (table) => {
  table.increments('id');
  table.string('name', 100).notNullable();
  table.string('email', 255).notNullable().unique();
  table.string('password', 255).notNullable();
  table.boolean('is_admin').defaultTo(false);
  table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
});

// Создание таблицы категорий
await schema.createTable('categories', (table) => {
  table.increments('id');
  table.string('name', 100).notNullable().unique();
  table.string('slug', 100).notNullable().unique();
  table.text('description');
});

// Создание таблицы статей
await schema.createTable('posts', (table) => {
  table.increments('id');
  table.string('title', 255).notNullable();
  table.string('slug', 255).notNullable().unique();
  table.text('content').notNullable();
  table.integer('user_id').notNullable()
    .references('id')
    .inTable('users')
    .onDelete('CASCADE');
  table.integer('category_id')
    .references('id')
    .inTable('categories')
    .onDelete('SET NULL');
  table.boolean('is_published').defaultTo(false);
  table.timestamp('published_at');
  table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
  
  // Создание индексов
  table.index('user_id');
  table.index('category_id');
  table.index('published_at');
});

// Создание таблицы комментариев
await schema.createTable('comments', (table) => {
  table.increments('id');
  table.text('content').notNullable();
  table.integer('post_id').notNullable()
    .references('id')
    .inTable('posts')
    .onDelete('CASCADE');
  table.integer('user_id').notNullable()
    .references('id')
    .inTable('users')
    .onDelete('CASCADE');
  table.integer('parent_id')
    .references('id')
    .inTable('comments')
    .onDelete('CASCADE');
  table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
  table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
  
  // Создание индексов
  table.index('post_id');
  table.index('user_id');
  table.index('parent_id');
});

// Создание таблицы тегов
await schema.createTable('tags', (table) => {
  table.increments('id');
  table.string('name', 50).notNullable().unique();
  table.string('slug', 50).notNullable().unique();
});

// Создание связующей таблицы между статьями и тегами
await schema.createTable('post_tags', (table) => {
  table.integer('post_id').notNullable()
    .references('id')
    .inTable('posts')
    .onDelete('CASCADE');
  table.integer('tag_id').notNullable()
    .references('id')
    .inTable('tags')
    .onDelete('CASCADE');
  
  // Создание составного первичного ключа
  table.primary(['post_id', 'tag_id']);
  
  // Создание индексов
  table.index('post_id');
  table.index('tag_id');
});
```

### Пример 2: Изменение существующей схемы
```javascript
// Добавление новых колонок в таблицу пользователей
await schema.alterTable('users', (table) => {
  table.addString('phone', 20);
  table.addString('avatar', 255);
  table.addJson('settings');
});

// Добавление статистики просмотров для статей
await schema.alterTable('posts', (table) => {
  table.addInteger('views').notNullable().defaultTo(0);
});

// Создание таблицы для отслеживания просмотров статей
await schema.createTable('post_views', (table) => {
  table.increments('id');
  table.integer('post_id').notNullable()
    .references('id')
    .inTable('posts')
    .onDelete('CASCADE');
  table.string('ip_address', 45).notNullable();
  table.string('user_agent', 255);
  table.timestamp('viewed_at').defaultTo('CURRENT_TIMESTAMP');
  
  // Создание индексов
  table.index('post_id');
  table.index('ip_address');
  table.index('viewed_at');
});

// Создание функции для обновления счетчика просмотров
await schema.createFunction(
  'increment_post_views',
  [],
  'trigger',
  `
    UPDATE posts
    SET views = views + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  `
);

// Создание триггера для автоматического обновления счетчика просмотров
await schema.createTrigger(
  'post_views_increment_trigger',
  'post_views',
  'AFTER',
  'INSERT',
  'increment_post_views'
);
```

### Пример 3: Использование транзакций
```javascript
// Перенос данных из одной таблицы в другую с использованием транзакции
await schema.transaction(async (client) => {
  const transactionSchema = new SchemaBuilder(client);
  
  // Создание новой таблицы
  await transactionSchema.createTable('users_new', (table) => {
    table.increments('id');
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('phone', 20);
    table.timestamp('created_at').defaultTo('CURRENT_TIMESTAMP');
    table.timestamp('updated_at').defaultTo('CURRENT_TIMESTAMP');
  });
  
  // Копирование данных
  await transactionSchema.raw(`
    INSERT INTO users_new (id, name, email, password, created_at, updated_at)
    SELECT id, name, email, password, created_at, updated_at
    FROM users
  `);
  
  // Удаление старой таблицы
  await transactionSchema.dropTable('users');
  
  // Переименование новой таблицы
  await transactionSchema.raw(`ALTER TABLE users_new RENAME TO users`);
  
  // Восстановление индексов
  await transactionSchema.raw(`
    CREATE INDEX idx_users_email ON users(email)
  `);
});
```

Заключение

SchemaBuilder предоставляет мощный и гибкий API для управления схемой базы данных PostgreSQL. Он позволяет создавать, изменять и удалять таблицы, колонки, индексы и другие объекты базы данных с помощью удобного и интуитивно понятного синтаксиса.

Для получения дополнительной информации о возможностях SchemaBuilder обратитесь к исходному коду и комментариям в файлах:

- SchemaBuilder.js
- TableBuilder.js
- ColumnBuilder.js
- AlterTableBuilder.js