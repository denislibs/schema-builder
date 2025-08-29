#!/usr/bin/env node
// @ts-ignore
import { Command } from 'commander';

// @ts-ignore
import chalk from 'chalk';

// @ts-ignore
import boxen from 'boxen';

// @ts-ignore
import ora from 'ora';
// @ts-ignore
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { MigrationManager } from './MigrationManager.js';
import { ConfigManager } from './ConfigManager.js';
import { createMigration } from './createMigration.js';
import { Pool } from 'pg';
import { SeederManager } from './SeederManager.js';
import { createSeeder } from './createSeeder.js';

const program = new Command();

// Красивый заголовок
function showHeader() {
  const title = chalk.bold.cyan('🚀 PostgreSQL Migrator');
  const subtitle = chalk.gray('Beautiful database migrations for PostgreSQL');
  
  console.log(boxen(`${title}\n${subtitle}`, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    align: 'center'
  }));
}

// Утилиты для красивого вывода
const log = {
  success: (message: string) => console.log(chalk.green('✓'), message),
  error: (message: string) => console.log(chalk.red('✗'), message),
  warning: (message: string) => console.log(chalk.yellow('⚠'), message),
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  title: (message: string) => console.log(chalk.bold.cyan(message)),
  subtitle: (message: string) => console.log(chalk.gray(message))
};

async function handleError(error: any) {
  console.log();
  log.error('An error occurred:');
  console.log(chalk.red(error.message));
  
  if (error.stack && process.env.DEBUG) {
    console.log(chalk.gray('\nStack trace:'));
    console.log(chalk.gray(error.stack));
  }
  
  process.exit(1);
}

// Команды
program
  .name('pg-migrate')
  .description('Beautiful PostgreSQL migration tool')
  .version('1.0.0')
  .hook('preAction', () => {
    if (process.argv.length > 2) {
      showHeader();
    }
  });

program
  .command('init')
  .description('Initialize migration configuration')
  .option('-t, --type <type>', 'Config type (js|json|package)', 'js')
  .option('-d, --dir <directory>', 'Migrations directory', './migrations')
  .action(async (options) => {
    const spinner = ora('Initializing migration configuration...').start();
    
    try {
      const configManager = new ConfigManager();
      await configManager.init({
        type: options.type,
        migrationsDir: options.dir
      });
      
      spinner.succeed('Configuration initialized successfully!');
      log.info(`Migrations directory: ${chalk.cyan(options.dir)}`);
      log.info(`Config type: ${chalk.cyan(options.type)}`);
    } catch (error) {
      spinner.fail('Failed to initialize configuration');
      await handleError(error);
    }
  });

program
  .command('create <name>')
  .description('Create a new migration')
  .option('-t, --template <template>', 'Migration template (table|alter|raw)', 'raw')
  .action(async (name: string, options) => {
    const spinner = ora('Creating migration...').start();
    
    try {
      const config = await ConfigManager.load();
      const filename = await createMigration(name, {
        template: options.template,
        migrationsDir: config.migrationsDir
      });
      
      spinner.succeed('Migration created successfully!');
      log.info(`File: ${chalk.cyan(filename)}`);
      log.info(`Template: ${chalk.cyan(options.template)}`);
    } catch (error) {
      spinner.fail('Failed to create migration');
      await handleError(error);
    }
  });

program
  .command('migrate')
  .description('Run pending migrations')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Migrations directory')
  .option('--dry-run', 'Show what would be migrated without executing')
  .action(async (options) => {
    try {
      const config = await ConfigManager.load();
      const connectionString = options.connection || config.connectionString || process.env.DATABASE_URL;
      console.log(config)
      if (!connectionString) {
        log.error('Database connection string is required!');
        log.info('Provide it via:');
        console.log('  • --connection flag');
        console.log('  • DATABASE_URL environment variable');
        console.log('  • Configuration file');
        process.exit(1);
      }
      const pool = new Pool({ connectionString });
      const manager = new MigrationManager(pool, options.dir || config.migrationsDir);

      if (options.dryRun) {
        const pending = await manager.getPendingMigrations();
        
        if (pending.length === 0) {
          log.info('No pending migrations');
          return;
        }
        
        log.title('Pending migrations (dry run):');
        pending.forEach((migration, index) => {
          console.log(`  ${index + 1}. ${chalk.cyan(migration)}`);
        });
        return;
      }
      
      const spinner = ora('Running migrations...').start();
      
      try {
        await manager.runMigrations();
        spinner.succeed('All migrations completed successfully!');
      } catch (error) {
        spinner.fail('Migration failed');
        throw error;
      } finally {
        await manager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('rollback')
  .description('Rollback migrations')
  .option('-s, --steps <number>', 'Number of migrations to rollback', '1')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Migrations directory')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const config = await ConfigManager.load();
      const connectionString = options.connection || config.connectionString || process.env.DATABASE_URL;
      
      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }
      
      const steps = parseInt(options.steps);
      
      if (!options.confirm) {
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: `Are you sure you want to rollback ${steps} migration(s)?`,
          default: false
        }]);
        
        if (!confirmed) {
          log.info('Rollback cancelled');
          return;
        }
      }
      const pool = new Pool({ connectionString });
      const manager = new MigrationManager(pool, options.dir || config.migrationsDir);
      const spinner = ora(`Rolling back ${steps} migration(s)...`).start();
      
      try {
        await manager.rollbackMigrations(steps);
        spinner.succeed(`Successfully rolled back ${steps} migration(s)!`);
      } catch (error) {
        spinner.fail('Rollback failed');
        throw error;
      } finally {
        await manager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('status')
  .description('Show migration status')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Migrations directory')
  .action(async (options) => {
    try {
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }
      const pool = new Pool({ connectionString });
      const manager = new MigrationManager(pool, options.dir || config.migrationsDir);
      const spinner = ora('Loading migration status...').start();
      
      try {
        const executed = await manager.getExecutedMigrations();
        const pending = await manager.getPendingMigrations();
        
        spinner.stop();
        
        // Таблица выполненных миграций
        if (executed.length > 0) {
          log.title('📋 Executed Migrations');
          
          const executedTable = new Table({
            head: ['Migration', 'Batch', 'Status'],
            colWidths: [50, 8, 12]
          });
          
          executed.forEach(migration => {
            executedTable.push([
              chalk.green(migration.version),
              migration.batch.toString(),
              chalk.green('✓ Done')
            ]);
          });
          
          console.log(executedTable.toString());
        }
        
        // Таблица ожидающих миграций
        if (pending.length > 0) {
          log.title('⏳ Pending Migrations');
          
          const pendingTable = new Table({
            head: ['Migration', 'Status'],
            colWidths: [50, 15]
          });
          
          pending.forEach(migration => {
            pendingTable.push([
              chalk.yellow(migration),
              chalk.yellow('○ Pending')
            ]);
          });
          
          console.log(pendingTable.toString());
        }
        
        // Сводка
        console.log();
        log.info(`Total executed: ${chalk.green(executed.length)}`);
        log.info(`Total pending: ${chalk.yellow(pending.length)}`);
        
        if (pending.length === 0) {
          log.success('Database is up to date! 🎉');
        }
        
      } finally {
        await manager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('fresh')
  .description('Drop all tables and re-run migrations')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Migrations directory')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        log.warning('This will DROP ALL TABLES and re-run migrations!');
        
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you absolutely sure?',
          default: false
        }]);
        
        if (!confirmed) {
          log.info('Fresh migration cancelled');
          return;
        }
      }
      
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }
      const pool = new Pool({ connectionString });
      const manager = new MigrationManager(pool, options.dir || config.migrationsDir);
      const spinner = ora('Dropping all tables and re-running migrations...').start();
      
      try {
        await manager.fresh();
        spinner.succeed('Fresh migration completed successfully!');
      } catch (error) {
        spinner.fail('Fresh migration failed');
        throw error;
      } finally {
        await manager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('reset')
  .description('Rollback all migrations')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Migrations directory')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: 'This will rollback ALL migrations. Are you sure?',
          default: false
        }]);
        
        if (!confirmed) {
          log.info('Reset cancelled');
          return;
        }
      }
      
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }
      const pool = new Pool({ connectionString });
      const manager = new MigrationManager(pool, options.dir || config.migrationsDir);
      const spinner = ora('Rolling back all migrations...').start();
      
      try {
        await manager.reset();
        spinner.succeed('All migrations rolled back successfully!');
      } catch (error) {
        spinner.fail('Reset failed');
        throw error;
      } finally {
        await manager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('make:seeder <name>')
  .description('Create a new seeder')
  .option('-t, --template <template>', 'Seeder template (basic|table|faker)', 'basic')
  .action(async (name: string, options) => {
    const spinner = ora('Creating seeder...').start();
    
    try {
      const config = await ConfigManager.load();
      const filename = await createSeeder(name, {
        template: options.template,
        seedersDir: config.seedersDir || './seeders'
      });
      
      spinner.succeed('Seeder created successfully!');
      log.info(`File: ${chalk.cyan(filename)}`);
      log.info(`Template: ${chalk.cyan(options.template)}`);
    } catch (error) {
      spinner.fail('Failed to create seeder');
      await handleError(error);
    }
  });

program
  .command('seed')
  .description('Run database seeders')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Seeders directory')
  .option('-f, --file <name>', 'Specific seeder file to run')
  .option('--fresh', 'Drop tables, migrate and seed')
  .action(async (options) => {
    try {
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }

      if (options.fresh) {
        log.warning('This will DROP ALL TABLES, re-run migrations and seeders!');
        
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: 'Are you absolutely sure?',
          default: false
        }]);
        
        if (!confirmed) {
          log.info('Fresh seed cancelled');
          return;
        }

        // Выполняем fresh migration
        const pool = new Pool({ connectionString });
        const migrationManager = new MigrationManager(pool, options.dir || config.migrationsDir);
        
        const spinner = ora('Dropping tables, running migrations and seeders...').start();
        
        try {
          await migrationManager.fresh();
          spinner.text = 'Running seeders...';
          
          const seederManager = new SeederManager(pool, config.seedersDir || './seeders');
          await seederManager.runSeeders();
          
          spinner.succeed('Fresh migration and seeding completed successfully!');
        } finally {
          await migrationManager.close();
        }
        
        return;
      }

      const pool = new Pool({ connectionString });
      const seederManager = new SeederManager(pool, config.seedersDir || './seeders');
      
      const spinner = ora('Running seeders...').start();
      
      try {
        await seederManager.runSeeders(options.file);
        spinner.succeed('All seeders completed successfully!');
      } catch (error) {
        spinner.fail('Seeding failed');
        throw error;
      } finally {
        await seederManager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('seed:rollback')
  .description('Rollback seeders')
  .option('-s, --steps <number>', 'Number of seeders to rollback', '1')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Seeders directory')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }
      
      const steps = parseInt(options.steps);
      
      if (!options.confirm) {
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: `Are you sure you want to rollback ${steps} seeder(s)?`,
          default: false
        }]);
        
        if (!confirmed) {
          log.info('Seeder rollback cancelled');
          return;
        }
      }

      const pool = new Pool({ connectionString });
      const seederManager = new SeederManager(pool, config.seedersDir || './seeders');
      const spinner = ora(`Rolling back ${steps} seeder(s)...`).start();
      
      try {
        await seederManager.rollbackSeeders(steps);
        spinner.succeed(`Successfully rolled back ${steps} seeder(s)!`);
      } catch (error) {
        spinner.fail('Seeder rollback failed');
        throw error;
      } finally {
        await seederManager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('seed:status')
  .description('Show seeder status')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Seeders directory')
  .action(async (options) => {
    try {
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }

      const pool = new Pool({ connectionString });
      const seederManager = new SeederManager(pool, config.seedersDir || './seeders');
      const spinner = ora('Loading seeder status...').start();
      
      try {
        spinner.stop();
        await seederManager.status();
      } finally {
        await seederManager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

program
  .command('seed:reset')
  .description('Rollback all seeders')
  .option('-c, --connection <url>', 'Database connection string')
  .option('-d, --dir <directory>', 'Seeders directory')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.confirm) {
        const { confirmed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirmed',
          message: 'This will rollback ALL seeders. Are you sure?',
          default: false
        }]);
        
        if (!confirmed) {
          log.info('Seeder reset cancelled');
          return;
        }
      }
      
      const config = await ConfigManager.load();
      const connectionString: string = options.connection || config.connectionString || process.env.DATABASE_URL;

      if (!connectionString) {
        log.error('Database connection string is required!');
        process.exit(1);
      }

      const pool = new Pool({ connectionString });
      const seederManager = new SeederManager(pool, config.seedersDir || './seeders');
      const spinner = ora('Rolling back all seeders...').start();
      
      try {
        await seederManager.reset();
        spinner.succeed('All seeders rolled back successfully!');
      } catch (error) {
        spinner.fail('Seeder reset failed');
        throw error;
      } finally {
        await seederManager.close();
      }
    } catch (error) {
      await handleError(error);
    }
  });

// Обработка ошибок
process.on('unhandledRejection', async (error) => {
  await handleError(error);
});

process.on('uncaughtException', async (error) => {
  await handleError(error);
});

// Если нет команд, показываем help
if (process.argv.length === 2) {
  showHeader();
  program.help();
}

program.parse();