# 🎯 Code Generation System

## Overview

PostgreSQL Schema Builder поддерживает автоматическую генерацию TypeScript типов и моделей из схемы базы данных. Эта система анализирует вашу PostgreSQL базу данных и создает типизированный код для использования в TypeScript проектах.

## 🔧 Installation & Setup

### 1. Установка зависимостей

```bash
npm install zod  # Для валидации (опционально)
```

### 2. Конфигурация

Убедитесь, что ваш `pg-migrate.config.js` содержит настройки подключения к базе данных:

```javascript
export default {
  database: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password'
  },
  // или используйте connection string
  connectionString: 'postgresql://user:password@localhost:5432/database'
};
```

## 📊 Type Generation

### Основные команды

```bash
# Генерация только типов
pg-migrate generate:types

# Генерация только моделей
pg-migrate generate:models

# Генерация типов и моделей
pg-migrate generate:all
```

### Опции генерации типов

```bash
pg-migrate generate:types [опции]

Options:
  -o, --output <path>      Путь к выходному файлу (default: "./src/types/database.ts")
  -s, --schema <name>      Имя схемы базы данных (default: "public")
  -f, --format <type>      Формат вывода: interface|type|zod (default: "interface")
  --camel-case             Конвертировать в camelCase (default: false)
  --prefix <string>        Добавить префикс к именам типов
  --suffix <string>        Добавить суффикс к именам типов
```

### Примеры использования

#### Базовая генерация типов

```bash
pg-migrate generate:types -o ./src/types/db.ts
```

#### С настройками форматирования

```bash
pg-migrate generate:types \\
  --format interface \\
  --camel-case \\
  --prefix "DB" \\
  --suffix "Type"
```

#### Генерация Zod схем

```bash
pg-migrate generate:types --format zod -o ./src/schemas/database.ts
```

## 🏗️ Model Generation

### Опции генерации моделей

```bash
pg-migrate generate:models [опции]

Options:
  -o, --output <path>         Выходная директория (default: "./src/models")
  -s, --schema <name>         Имя схемы БД (default: "public")
  --style <type>              Стиль моделей: active-record|data-mapper|simple (default: "active-record")
  --camel-case                Конвертировать в camelCase (default: false)
  --validation                Включить Zod валидацию (default: false)
  --relations                 Включить методы связей (default: true)
  --base-class <name>         Имя базового класса (default: "BaseModel")
```

### Стили моделей

#### 1. Active Record
Модели содержат методы для работы с данными:

```typescript
const user = await User.find(1);
user.name = 'New Name';
await user.save();
```

#### 2. Data Mapper
Разделение данных и логики работы с ними:

```typescript
const userRepo = new UserRepository(pool);
const user = await userRepo.find(1);
```

#### 3. Simple
Простые классы данных без ORM логики:

```typescript
const user = new User({ name: 'John', email: 'john@example.com' });
```

### Примеры генерации моделей

```bash
# Active Record с валидацией
pg-migrate generate:models \\
  --style active-record \\
  --validation \\
  --camel-case

# Data Mapper стиль
pg-migrate generate:models \\
  --style data-mapper \\
  -o ./src/repositories

# Простые модели
pg-migrate generate:models \\
  --style simple \\
  --camel-case \\
  -o ./src/entities
```

## 🔄 Generated Code Examples

### Database Schema
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');
```

### Generated Types

#### Interface Format
```typescript
export interface User {
  id: number;
  email: string;
  name: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string | null;
}

export enum UserStatus {
  Active = 'active',
  Inactive = 'inactive',
  Banned = 'banned'
}
```

#### Zod Schema Format
```typescript
export const UserSchema = z.object({
  id: z.number().int(),
  email: z.string().max(255),
  name: z.string().max(100),
  isActive: z.boolean().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().nullable().optional()
});

export type User = z.infer<typeof UserSchema>;
```

### Generated Models

#### Active Record Model
```typescript
export class User extends BaseModel implements IUser {
  protected static override tableName = 'users';

  id?: number;
  email: string;
  name: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string | null;

  // Static methods
  static async findByEmail(email: string): Promise<User | null> {
    return this.findBy({ email }) as Promise<User | null>;
  }

  static async active(): Promise<User[]> {
    return this.findAll({ isActive: true }) as Promise<User[]>;
  }

  // Instance methods
  protected getPrimaryKeyValue(): any {
    return this.id;
  }

  async softDelete(): Promise<void> {
    this.deletedAt = new Date();
    await this.save();
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
```

## ⚙️ Advanced Configuration

### Custom Type Mappings

Система автоматически мапит PostgreSQL типы в TypeScript:

| PostgreSQL Type | TypeScript Type |
|----------------|-----------------|
| integer, bigint, serial | number |
| varchar, text, char | string |
| boolean | boolean |
| timestamp, date | Date \\| string |
| json, jsonb | Record<string, any> |
| uuid | string |
| enum | string enum |

### Utility Types

Генератор создает полезные utility типы:

```typescript
// Тип для создания записи (без автогенерируемых полей)
export type CreateUser = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;

// Тип для обновления записи (все поля опциональны)
export type UpdateUser = Partial<Omit<User, 'id'>>;

// Тип для фильтрации
export type UserFilters = Partial<Pick<User, 'email' | 'isActive'>>;
```

### Relations

При включении связей генерируются методы для работы с внешними ключами:

```typescript
export class Post extends BaseModel {
  authorId: number;
  
  // Генерируется автоматически для внешних ключей
  async author(): Promise<User | null> {
    if (!this.authorId) return null;
    return User.find(this.authorId);
  }
}
```

## 🔄 Workflow Integration

### 1. Development Workflow

```bash
# После изменений в схеме БД
pg-migrate migrate:up

# Регенерируем типы и модели
pg-migrate generate:all --camel-case

# Компилируем TypeScript
npm run build
```

### 2. CI/CD Integration

```yaml
# .github/workflows/codegen.yml
name: Code Generation
on:
  push:
    paths:
      - 'migrations/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Install dependencies
        run: npm install
        
      - name: Setup test database
        run: |
          docker run -d -p 5432:5432 \\
            -e POSTGRES_PASSWORD=test \\
            -e POSTGRES_DB=testdb \\
            postgres:15
            
      - name: Run migrations
        run: npm run migrate:up
        
      - name: Generate code
        run: npm run generate:all
        
      - name: Commit generated files
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add src/types/ src/models/
          git commit -m "Auto-generate types and models" || exit 0
          git push
```

### 3. Package.json Scripts

```json
{
  "scripts": {
    "generate:types": "pg-migrate generate:types --camel-case",
    "generate:models": "pg-migrate generate:models --style active-record --validation",
    "generate:all": "pg-migrate generate:all --camel-case --validation",
    "db:sync": "npm run migrate:up && npm run generate:all"
  }
}
```

## 🚀 Best Practices

### 1. Naming Conventions

- **Tables**: Используйте snake_case (`user_profiles`, `order_items`)
- **Columns**: Используйте snake_case (`created_at`, `is_active`)
- **Enums**: Используйте snake_case для имени, lowercase для значений

### 2. Schema Organization

```sql
-- ✅ Good
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ Avoid
CREATE TABLE UserProfiles (
  ID SERIAL PRIMARY KEY,
  UserID INTEGER NOT NULL,
  FirstName VARCHAR(50) NOT NULL
);
```

### 3. Regeneration Strategy

- ✅ Регенерируйте после каждой миграции
- ✅ Используйте CI/CD для автоматической генерации
- ✅ Коммитьте сгенерированные файлы в git
- ❌ Не редактируйте сгенерированные файлы вручную

### 4. Type Safety

```typescript
// ✅ Good - используйте сгенерированные типы
const createUser = (data: CreateUser): Promise<User> => {
  return User.create(data);
};

// ❌ Avoid - ручные типы
const createUser = (data: any): Promise<any> => {
  return User.create(data);
};
```

## 🛠️ Troubleshooting

### Частые проблемы

#### 1. Ошибка подключения к БД
```bash
Error: Failed to connect to database
```
**Решение**: Проверьте настройки подключения в `pg-migrate.config.js`

#### 2. Неизвестный тип данных
```bash
Warning: Unknown PostgreSQL type 'custom_type'
```
**Решение**: Тип будет замаплен как `any`. Добавьте кастомный маппинг в код генератора.

#### 3. Конфликт имен файлов
```bash
Error: Cannot write to file, already exists
```
**Решение**: Используйте `--force` флаг или удалите существующие файлы

### Debug режим

```bash
# Включить детальный вывод
DEBUG=pg-migrate:* pg-migrate generate:all

# Или установить переменную окружения
export DEBUG=pg-migrate:*
pg-migrate generate:types
```

## 📚 Examples Repository

Посмотрите полные примеры в директории `examples/`:

- `examples/basic-usage.ts` - Базовое использование
- `examples/advanced-types.ts` - Продвинутые типы
- `examples/model-patterns.ts` - Паттерны моделей

---

**🎉 Готово!** Теперь у вас есть мощная система генерации кода для PostgreSQL проектов.
