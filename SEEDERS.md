# 🌱 Система сидов (Seeders)

Сиды позволяют заполнить базу данных тестовыми или начальными данными. Это полезно для разработки, тестирования и демонстрации приложения.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Создание сидов](#создание-сидов)
- [Базовый класс BaseSeeder](#базовый-класс-baseseeder)
- [Утилиты для генерации данных](#утилиты-для-генерации-данных)
- [Команды CLI](#команды-cli)
- [Примеры сидов](#примеры-сидов)
- [Лучшие практики](#лучшие-практики)

## 🚀 Быстрый старт

### 1. Создание первого сида

```bash
# Создание базового сида
pg-cli make:seeder users

# Создание сида для конкретной таблицы
pg-cli make:seeder products --template table

# Создание сида с генерацией fake данных
pg-cli make:seeder test_data --template faker
```

### 2. Запуск сидов

```bash
# Запуск всех сидов
pg-cli seed

# Запуск конкретного сида
pg-cli seed --file 20240829120000_users.mjs

# Fresh (очистка + миграции + сиды)
pg-cli seed --fresh
```

### 3. Управление сидами

```bash
# Статус сидов
pg-cli seed:status

# Откат последнего сида
pg-cli seed:rollback

# Откат нескольких сидов
pg-cli seed:rollback --steps 3

# Сброс всех сидов
pg-cli seed:reset
```

## 📝 Создание сидов

### Команда создания

```bash
pg-cli make:seeder <name> [options]
```

**Опции:**
- `-t, --template <type>` - Шаблон сида (basic|table|faker)

### Шаблоны сидов

#### 1. Basic (по умолчанию)
Простой шаблон для создания собственной логики:

```javascript
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class UsersSeeder extends BaseSeeder {
  async run() {
    // Ваша логика заполнения данными
  }

  async down() {
    // Логика отката (опционально)
  }
}
```

#### 2. Table
Шаблон для заполнения конкретной таблицы:

```javascript
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class ProductsSeeder extends BaseSeeder {
  async run() {
    // Проверяем, есть ли уже данные
    const count = await this.count('products');
    if (count > 0) {
      console.log('products already has data, skipping...');
      return;
    }

    const data = [
      { name: 'Product 1', price: 100 },
      { name: 'Product 2', price: 200 }
    ];

    await this.insertOrIgnore('products', data);
  }
}
```

#### 3. Faker
Шаблон с генерацией случайных данных:

```javascript
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class TestDataSeeder extends BaseSeeder {
  async run() {
    const fakeData = [];
    for (let i = 0; i < 50; i++) {
      fakeData.push({
        name: this.faker.name(),
        email: this.faker.email(),
        created_at: this.faker.date(),
        is_active: this.faker.boolean()
      });
    }

    await this.insertOrIgnore('users', fakeData);
  }
}
```

## 🔧 Базовый класс BaseSeeder

### Основные методы

#### `run()` - Обязательный
Основная логика заполнения данными:

```javascript
async run() {
  console.log('Running seeder...');
  // Ваша логика здесь
}
```

#### `down()` - Опциональный
Логика отката изменений:

```javascript
async down() {
  console.log('Rolling back seeder...');
  await this.query('DELETE FROM users WHERE email LIKE "%@test.com"');
}
```

### Утилитные методы

#### `query(sql, params)` - Выполнение SQL
```javascript
// Простой запрос
await this.query('SELECT * FROM users');

// С параметрами
await this.query('INSERT INTO users (name, email) VALUES ($1, $2)', ['John', 'john@test.com']);
```

#### `count(tableName)` - Подсчет записей
```javascript
const userCount = await this.count('users');
if (userCount === 0) {
  // Заполняем данными
}
```

#### `exists(table, condition, params)` - Проверка существования
```javascript
const adminExists = await this.exists('users', 'role = $1', ['admin']);
if (!adminExists) {
  // Создаем админа
}
```

#### `insertOrIgnore(table, data)` - Вставка с игнорированием конфликтов
```javascript
const users = [
  { email: 'john@test.com', name: 'John' },
  { email: 'jane@test.com', name: 'Jane' }
];

// Вставит только новые записи, дубли проигнорирует
await this.insertOrIgnore('users', users);
```

## 🎲 Утилиты для генерации данных

### Faker методы

```javascript
// Имена
this.faker.name() // 'John', 'Jane', 'Bob'...

// Email адреса  
this.faker.email() // 'john123@gmail.com'

// Числа
this.faker.number() // от 1 до 100
this.faker.number(10, 50) // от 10 до 50

// Булевы значения
this.faker.boolean() // true или false

// Даты
this.faker.date() // случайная дата между 2020 и сейчас
this.faker.date(new Date(2020, 0, 1), new Date(2023, 11, 31))

// Текст
this.faker.text() // случайный текст (50 символов)
this.faker.text(100) // текст длиной 100 символов
```

### Пример с faker

```javascript
export default class UsersSeeder extends BaseSeeder {
  async run() {
    const users = [];
    
    // Генерируем 100 пользователей
    for (let i = 0; i < 100; i++) {
      users.push({
        name: this.faker.name(),
        email: this.faker.email(),
        age: this.faker.number(18, 65),
        is_active: this.faker.boolean(),
        bio: this.faker.text(200),
        created_at: this.faker.date(new Date(2023, 0, 1), new Date()),
        // Случайная роль
        role: ['user', 'admin', 'moderator'][this.faker.number(0, 2)]
      });
    }
    
    await this.insertOrIgnore('users', users);
    console.log(`Created ${users.length} users`);
  }
}
```

## 📋 Команды CLI

### `make:seeder` - Создание сида

```bash
pg-cli make:seeder <name> [options]

# Примеры:
pg-cli make:seeder users
pg-cli make:seeder products --template table
pg-cli make:seeder fake_data --template faker
```

### `seed` - Запуск сидов

```bash
pg-cli seed [options]

# Опции:
# -f, --file <name>     Конкретный файл сида
# --fresh               Очистка + миграции + сиды
# -c, --connection <url> Строка подключения
# -d, --dir <directory>  Директория с сидами

# Примеры:
pg-cli seed                                    # Все сиды
pg-cli seed --file 20240829_users.mjs        # Конкретный сид
pg-cli seed --fresh                           # Fresh start
```

### `seed:status` - Статус сидов

```bash
pg-cli seed:status

# Показывает:
# ✓ Выполненные сиды (с номером batch)
# ○ Ожидающие сиды
```

### `seed:rollback` - Откат сидов

```bash
pg-cli seed:rollback [options]

# Опции:
# -s, --steps <number>  Количество сидов для отката
# --confirm            Пропустить подтверждение

# Примеры:
pg-cli seed:rollback                # Откат последнего
pg-cli seed:rollback --steps 3      # Откат 3 сидов
pg-cli seed:rollback --confirm      # Без подтверждения
```

### `seed:reset` - Сброс всех сидов

```bash
pg-cli seed:reset [--confirm]

# Откатывает ВСЕ выполненные сиды
```

## 📚 Примеры сидов

### 1. Базовые пользователи и роли

```javascript
// seeders/20240829120000_users_and_roles.mjs
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class UsersAndRolesSeeder extends BaseSeeder {
  async run() {
    // Создаем роли
    const roles = [
      { name: 'admin', description: 'Administrator' },
      { name: 'user', description: 'Regular User' },
      { name: 'moderator', description: 'Moderator' }
    ];
    
    await this.insertOrIgnore('roles', roles);
    
    // Получаем ID ролей
    const adminRole = await this.query('SELECT id FROM roles WHERE name = $1', ['admin']);
    const userRole = await this.query('SELECT id FROM roles WHERE name = $1', ['user']);
    
    // Создаем пользователей
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        role_id: adminRole.rows[0].id,
        is_active: true
      },
      {
        name: 'Test User',
        email: 'user@example.com', 
        role_id: userRole.rows[0].id,
        is_active: true
      }
    ];
    
    await this.insertOrIgnore('users', users);
    console.log('Created default users and roles');
  }

  async down() {
    // Удаляем в обратном порядке
    await this.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'admin@example.com',
      'user@example.com'
    ]);
    
    await this.query('DELETE FROM roles WHERE name IN ($1, $2, $3)', [
      'admin', 'user', 'moderator'
    ]);
  }
}
```

### 2. Иерархическая структура

```javascript
// seeders/20240829130000_categories_and_products.mjs
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class CategoriesAndProductsSeeder extends BaseSeeder {
  async run() {
    // Проверяем, есть ли уже данные
    const categoryCount = await this.count('categories');
    if (categoryCount > 0) {
      console.log('Categories already exist, skipping...');
      return;
    }

    // Создаем категории
    const categories = [
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Books', slug: 'books' },
      { name: 'Clothing', slug: 'clothing' }
    ];
    
    await this.insertOrIgnore('categories', categories);
    
    // Получаем созданные категории
    const electronicsCategory = await this.query(
      'SELECT id FROM categories WHERE slug = $1', 
      ['electronics']
    );
    
    const booksCategory = await this.query(
      'SELECT id FROM categories WHERE slug = $1', 
      ['books']
    );
    
    // Создаем продукты
    const products = [
      {
        name: 'iPhone 15',
        price: 999.99,
        category_id: electronicsCategory.rows[0].id,
        in_stock: true
      },
      {
        name: 'MacBook Pro',
        price: 2499.99,
        category_id: electronicsCategory.rows[0].id,
        in_stock: true
      },
      {
        name: 'JavaScript Guide',
        price: 29.99,
        category_id: booksCategory.rows[0].id,
        in_stock: true
      }
    ];
    
    await this.insertOrIgnore('products', products);
    console.log(`Created ${categories.length} categories and ${products.length} products`);
  }

  async down() {
    await this.query('DELETE FROM products WHERE name IN ($1, $2, $3)', [
      'iPhone 15', 'MacBook Pro', 'JavaScript Guide'
    ]);
    
    await this.query('DELETE FROM categories WHERE slug IN ($1, $2, $3)', [
      'electronics', 'books', 'clothing'
    ]);
  }
}
```

### 3. Большой объем тестовых данных

```javascript
// seeders/20240829140000_test_data.mjs  
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class TestDataSeeder extends BaseSeeder {
  async run() {
    console.log('Generating large test dataset...');
    
    // Генерируем 1000 пользователей
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push({
        name: this.faker.name(),
        email: `user${i}@test.com`, // Уникальные email
        age: this.faker.number(18, 80),
        city: ['Moscow', 'SPB', 'Kazan', 'Novosibirsk'][this.faker.number(0, 3)],
        is_active: this.faker.boolean(),
        bio: this.faker.text(150),
        created_at: this.faker.date(new Date(2023, 0, 1), new Date())
      });
    }
    
    // Вставляем батчами по 100 записей
    for (let i = 0; i < users.length; i += 100) {
      const batch = users.slice(i, i + 100);
      await this.insertOrIgnore('users', batch);
      console.log(`Inserted batch ${Math.floor(i/100) + 1}/${Math.ceil(users.length/100)}`);
    }
    
    console.log(`Generated ${users.length} test users`);
  }

  async down() {
    console.log('Removing test data...');
    await this.query('DELETE FROM users WHERE email LIKE $1', ['user%@test.com']);
  }
}
```

### 4. Условный сид с проверками

```javascript
// seeders/20240829150000_production_settings.mjs
import { BaseSeeder } from '@pg-schema-builder/migrator';

export default class ProductionSettingsSeeder extends BaseSeeder {
  async run() {
    // Проверяем окружение
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.log('Production environment detected, creating minimal data...');
      
      // Только необходимые настройки для продакшна
      const settings = [
        { key: 'site_name', value: 'My App' },
        { key: 'admin_email', value: 'admin@myapp.com' },
        { key: 'maintenance_mode', value: 'false' }
      ];
      
      await this.insertOrIgnore('settings', settings);
      
    } else {
      console.log('Development environment detected, creating test data...');
      
      // Больше данных для разработки
      const settings = [
        { key: 'site_name', value: 'My App (Dev)' },
        { key: 'admin_email', value: 'admin@localhost' },
        { key: 'debug_mode', value: 'true' },
        { key: 'log_level', value: 'debug' },
        { key: 'cache_enabled', value: 'false' }
      ];
      
      await this.insertOrIgnore('settings', settings);
      
      // Создаем тестового админа
      const adminExists = await this.exists('users', 'email = $1', ['admin@localhost']);
      if (!adminExists) {
        await this.insertOrIgnore('users', [{
          name: 'Dev Admin',
          email: 'admin@localhost',
          password: 'hashed_password_here',
          role: 'admin',
          is_active: true
        }]);
      }
    }
  }

  async down() {
    await this.query('DELETE FROM settings WHERE key IN ($1, $2, $3, $4, $5)', [
      'site_name', 'admin_email', 'maintenance_mode', 'debug_mode', 'log_level'
    ]);
    
    await this.query('DELETE FROM users WHERE email = $1', ['admin@localhost']);
  }
}
```

## 🎯 Лучшие практики

### 1. Идемпотентность
Сиды должны быть идемпотентными (безопасно запускать несколько раз):

```javascript
async run() {
  // ✅ Хорошо - проверяем существование данных
  const count = await this.count('users');
  if (count > 0) {
    console.log('Users already exist, skipping...');
    return;
  }
  
  // ✅ Хорошо - используем insertOrIgnore
  await this.insertOrIgnore('users', userData);
  
  // ❌ Плохо - может создать дубли
  // await this.query('INSERT INTO users ...');
}
```

### 2. Зависимости между сидами
Учитывайте порядок выполнения:

```javascript
// 001_roles.mjs - сначала роли
// 002_users.mjs - потом пользователи (ссылаются на роли)
// 003_posts.mjs - затем посты (ссылаются на пользователей)
```

### 3. Откат данных
Реализуйте метод `down()` для критичных сидов:

```javascript
async down() {
  // Удаляем только то, что создали
  await this.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);
  
  // Или используйте маркеры
  await this.query('DELETE FROM posts WHERE created_by_seeder = $1', [true]);
}
```

### 4. Производительность
Для больших объемов данных:

```javascript
async run() {
  const batchSize = 1000;
  const users = [/* большой массив */];
  
  // Вставляем батчами
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await this.insertOrIgnore('users', batch);
    console.log(`Progress: ${i + batch.length}/${users.length}`);
  }
}
```

### 5. Окружения
Разные данные для разных окружений:

```javascript
async run() {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      await this.seedProductionData();
      break;
    case 'staging':
      await this.seedStagingData();
      break;
    default:
      await this.seedDevelopmentData();
  }
}
```

### 6. Логирование
Информативные сообщения:

```javascript
async run() {
  console.log('🌱 Starting users seeder...');
  
  const startTime = Date.now();
  await this.insertOrIgnore('users', userData);
  const duration = Date.now() - startTime;
  
  console.log(`✅ Created ${userData.length} users in ${duration}ms`);
}
```

### 7. Валидация данных
Проверяйте данные перед вставкой:

```javascript
async run() {
  const users = this.generateUsers();
  
  // Валидация
  const validUsers = users.filter(user => {
    if (!user.email || !user.email.includes('@')) {
      console.warn(`Invalid email: ${user.email}`);
      return false;
    }
    return true;
  });
  
  await this.insertOrIgnore('users', validUsers);
}
```

## 🔄 Интеграция с миграциями

### Fresh start
```bash
# Удаляет все таблицы, запускает миграции и сиды
pg-cli seed --fresh
```

### Типичный workflow разработки
```bash
# 1. Разработка
pg-cli create add_users_table
pg-cli migrate

# 2. Создание сидов
pg-cli make:seeder users --template table
# Редактируем сид...

# 3. Тестирование
pg-cli seed

# 4. При изменениях в схеме
pg-cli seed --fresh
```

## 🚨 Безопасность

### В продакшне
- Не запускайте тестовые сиды в продакшне
- Используйте переменные окружения для чувствительных данных
- Ограничьте объем данных в продакшн-сидах

```javascript
async run() {
  if (process.env.NODE_ENV === 'production') {
    // Только критичные данные
    return;
  }
  
  // Тестовые данные только для dev/staging
}
```

---

## 📞 Помощь

Если у вас возникли вопросы:

1. Проверьте статус: `pg-cli seed:status`
2. Посмотрите логи выполнения
3. Убедитесь в правильности строки подключения
4. Проверьте права доступа к БД

**Удачного сидинга! 🌱**
