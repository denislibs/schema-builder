# Миграции в pg-schema-builder

pg-schema-builder предоставляет мощную систему миграций для управления схемой базы данных PostgreSQL. Миграции позволяют версионировать изменения схемы базы данных и легко применять или откатывать их.

## Установка и настройка

### Установка пакета

```bash
npm install pg-schema-builder
```

### Настройка подключения к базе данных

Есть несколько способов настроить подключение к базе данных:

#### 1. Переменная окружения
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
npx pg-schema migrate
```

#### 2. Аргументы командной строки
```bash
npx pg-schema migrate --connection "postgresql://user:password@localhost:5432/mydb" --migrationsDir "./database/migrations"
```

#### 3. Файл конфигурации schema-builder.config.js
```javascript
// schema-builder.config.js
module.exports = {
  connectionString: 'postgresql://user:password@localhost:5432/mydb',
  migrationsDir: './database/migrations'
};
```

#### 4. Секция в package.json
```json
{
  "name": "my-app",
  "schemaBuilder": {
    "connectionString": "postgresql://user:password@localhost:5432/mydb",
    "migrationsDir": "./database/migrations"
  }
}
```

## Команды CLI

### Создание миграции

Создание новой миграции:

```bash
npx pg-schema create --name create_users_table
```

Эта команда создаст файл миграции в папке `migrations` (по умолчанию) с именем вида `20240823120000_create_users_table.ts`.

### Структура файла миграции

Каждая миграция должна экспортировать класс, наследующий от `BaseMigration`:

```typescript
import { BaseMigration } from 'pg-schema-builder';

export default class CreateUsersTable extends BaseMigration {
  async up(): Promise<void> {
    // Код для применения миграции
    await this.schema.createTable('users', (table) => {
      table.increments('id');
      table.string('email', 255).notNullable().unique();
      table.string('name', 100).notNullable();
      table.string('password_hash', 255).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps();
    });
  }

  async down(): Promise<void> {
    // Код для отката миграции
    await this.schema.dropTable('users');
  }
}
```

### Применение миграций

Применить все ожидающие миграции:

```bash
npx pg-schema migrate
```

### Откат миграций

Откатить последнюю миграцию:

```bash
npx pg-schema rollback
```

Откатить несколько миграций:

```bash
npx pg-schema rollback --steps 3
```

### Статус миграций

Посмотреть статус всех миграций:

```bash
npx pg-schema status
```

Выведет что-то вроде:
```
=== Migration Status ===

Executed migrations:
  ✓ 20240823120000 (batch 1)
  ✓ 20240823130000 (batch 1)

Pending migrations:
  ○ 20240823140000_add_posts_table.ts

========================
```

### Полная перезагрузка

Удалить все таблицы и заново применить все миграции:

```bash
npx pg-schema fresh
```

**⚠️ Внимание**: Эта команда удалит ВСЕ данные в базе!

### Полный откат

Откатить все миграции:

```bash
npx pg-schema reset
```

## Примеры миграций

### Создание таблицы

```typescript
import { BaseMigration } from 'pg-schema-builder';

export default class CreatePostsTable extends BaseMigration {
  async up(): Promise<void> {
    await this.schema.createTable('posts', (table) => {
      table.increments('id');
      table.string('title', 255).notNullable();
      table.text('content');
      table.integer('user_id').notNullable();
      table.string('status', 20).defaultTo('draft');
      table.timestamps();
      
      // Внешний ключ
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      
      // Индексы
      table.index('user_id');
      table.index('status');
    });
  }

  async down(): Promise<void> {
    await this.schema.dropTable('posts');
  }
}
```

### Изменение таблицы

```typescript
import { BaseMigration } from 'pg-schema-builder';

export default class AddSlugToPosts extends BaseMigration {
  async up(): Promise<void> {
    await this.schema.alterTable('posts', (table) => {
      table.string('slug', 255).unique();
      table.index('slug');
    });
  }

  async down(): Promise<void> {
    await this.schema.alterTable('posts', (table) => {
      table.dropIndex('slug');
      table.dropColumn('slug');
    });
  }
}
```

### Создание индекса

```typescript
import { BaseMigration } from 'pg-schema-builder';

export default class AddIndexToUserEmail extends BaseMigration {
  async up(): Promise<void> {
    await this.schema.createIndex('users', 'email', 'idx_users_email');
  }

  async down(): Promise<void> {
    await this.schema.dropIndex('users', 'idx_users_email');
  }
}
```

## Система батчей

pg-schema-builder использует систему батчей для группировки миграций. Все миграции, выполненные за одну команду `migrate`, получают одинаковый номер батча. Это позволяет:

- Откатывать только последний батч миграций
- Отслеживать, какие миграции были применены вместе
- Безопасно работать в команде

## Лучшие практики

### 1. Именование миграций
Используйте описательные имена:
- `create_users_table`
- `add_email_index_to_users`
- `remove_unused_columns_from_posts`

### 2. Обязательный откат
Всегда реализуйте метод `down()` для возможности отката миграций.

### 3. Безопасные изменения
Избегайте операций, которые могут привести к потере данных:
```typescript
// ❌ Плохо - может привести к потере данных
table.dropColumn('important_data');

// ✅ Хорошо - сначала создайте новую колонку, затем перенесите данные
table.string('new_important_data');
```

### 4. Тестирование миграций
Всегда тестируйте миграции на копии продакшн данных:
```bash
# Применить миграции
npx pg-schema migrate

# Проверить результат
npx pg-schema status

# Если что-то не так, откатить
npx pg-schema rollback
```

### 5. Транзакции
Все миграции выполняются в транзакциях. Если миграция падает, все изменения откатываются.

## Устранение проблем

### Миграция упала
Если миграция упала с ошибкой:
1. Исправьте проблему в коде миграции
2. Убедитесь, что база в консистентном состоянии
3. Запустите миграцию снова

### Ручное изменение схемы
Если кто-то вручную изменил схему базы:
1. Создайте миграцию, отражающую эти изменения
2. Вручную добавьте запись в таблицу `migrations`
3. Или используйте `pg-schema fresh` для полной перезагрузки

### Конфликты миграций
При работе в команде могут возникнуть конфликты:
1. Синхронизируйте изменения из репозитория
2. Запустите `pg-schema status` для проверки
3. Примените недостающие миграции

## API для программного использования

Вы также можете использовать MigrationManager программно:

```typescript
import { MigrationManager } from 'pg-schema-builder';

const manager = new MigrationManager(
  'postgresql://user:password@localhost:5432/mydb',
  './migrations'
);

// Применить миграции
await manager.runMigrations();

// Получить статус
await manager.status();

// Откатить последнюю миграцию
await manager.rollbackMigrations(1);

// Закрыть соединение