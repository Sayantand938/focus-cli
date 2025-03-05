// src/commands/delete.ts
import { Command, Args } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js'; // Corrected import

export default class Delete extends Command {
  static description = 'Deletes a session using first 8 characters of its ID.';

  static examples = [
    `$ focus delete a1b2c3d4`,
  ];

  static args = {
    id: Args.string({ description: 'First 8 characters of the session ID', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Delete);
    const db = new FocusDatabase();

    try {
      db.deleteSession(args.id);
      this.log(`✅ Session ${args.id}... deleted successfully.`);
    } catch (error: any) {
      if (error instanceof FocusError) {
          this.error(error.message);  // Consistent error handling
      } else {
          this.error(`Failed to delete session: ${error.message}`);
      }
    } finally {
      db.close();
    }
  }
}