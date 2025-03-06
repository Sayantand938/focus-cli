// src/commands/delete.ts
import { Command, Args } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';

export default class Delete extends Command {
  static description = 'Deletes a session using the first 8 characters of its ID.';

  static examples = [
    `$ focus delete a1b2c3d4`,
  ];

  static args = {
    id: Args.string({ description: 'First 8 characters of the session ID', required: true }),
  };

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    // Use dependency injection for the database
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Delete);

    try {
      this.validateSessionId(args.id);
      this.deleteSession(args.id);
      this.log(`✅ Session ${args.id}... deleted successfully.`);
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private validateSessionId(id: string): void {
    if (!id || id.length !== 8) {
      throw new FocusError('Invalid session ID. Please provide the first 8 characters of the session ID.');
    }
  }

  private deleteSession(id: string): void {
    this.db.deleteSession(id);
  }

  private handleError(error: any): void {
    if (error instanceof FocusError) {
      this.error(error.message); // Handle FocusError specifically
    } else if (error instanceof Error) {
      this.error(`Failed to delete session: ${error.message}`);
    } else {
      this.error('An unexpected error occurred.');
    }
  }

  private cleanup(): void {
    this.db.close();
  }
}