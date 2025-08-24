import { Pool } from 'pg';
import SchemaBuilder from './SchemaBuilder';

export default class BaseMigration {
  protected pool: Pool;
  protected schema: SchemaBuilder;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.schema = new SchemaBuilder(this.pool);
  }

  public up() {
    throw new Error('Method up is not implemented');
  }
  public down() {
    throw new Error('Method down is not implemented');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}