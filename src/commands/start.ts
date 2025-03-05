// src/commands/start.ts
import { Command } from '@oclif/core';
import { v4 as uuidv4 } from 'uuid';
import { FocusDatabase, FocusError } from '../utils/database.js'; // Import FocusError
import { formatDate } from '../utils/formatting.js'; // Use formatDate utility

export default class Start extends Command {
  static description = 'Starts a focus session and logs the start time.';

  static examples = [
    `$ focus start`,
  ];

  async run(): Promise<void> {
    const db = new FocusDatabase();
    try {
      const sessionId = uuidv4();
      const now = new Date();
      const startTime = now.toISOString(); // Store as ISO string

      const existingSession = db.getOpenSession();
      if (existingSession) {
        throw new FocusError(`There is already an active session (ID: ${existingSession.id.substring(0,8)}).  Stop it first.`); // Use FocusError
      }

      db.createSession(sessionId, startTime);
      this.log(`Focus session started at ${formatDate(now, 'MMM dd yyyy, hh:mm:ss a')} with ID: ${sessionId.substring(0, 8)}`); // Use formatDate

    } catch (error: any) {
      if (error instanceof FocusError) {
        this.error(error.message);
      } else {
        this.error(`Failed to start session: ${error.message}`);
      }
    } finally {
      db.close();
    }
  }
}