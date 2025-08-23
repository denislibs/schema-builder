import { Pool } from 'pg';
import SchemaBuilder from './SchemaBuilder';

export default abstract class BaseMigration {
  protected pool: Pool;
  protected schema: SchemaBuilder;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.schema = new SchemaBuilder(this.pool);
  }

  abstract up(): Promise<void>;
  abstract down(): Promise<void>;

  async close(): Promise<void> {
    await this.pool.end();
  }
}