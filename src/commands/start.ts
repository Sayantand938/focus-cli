import { Command, Flags } from '@oclif/core';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { FocusDatabase } from '../utils/database.js';

export default class Start extends Command {
  static description = 'Starts a focus session and logs the start time.';

  static examples = [
    `$ focus start`,
  ];

  async run(): Promise<void> {
    const db = new FocusDatabase();
    try {
      // Generate a unique session ID
      const sessionId = uuidv4();

      // Get the current time
      const now = new Date();

      // Format the start time
      const startTime = format(now, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx');
      const formattedStartTime = format(now, 'MMM dd yyyy, hh:mm:ss a');

      // Check for existing sessions with a null stop time
      const existingSession = db.getOpenSession();
      if (existingSession) {
        this.log('There is already an active session.');
        this.log(`Session ID: ${existingSession.id}`);
        return;
      }

      // Insert the new session into the database
      db.createSession(sessionId, startTime);

      this.log(`Focus session started at ${formattedStartTime} with ID: ${sessionId.substring(0, 8)}`);
    } catch (error: any) {
      this.error(`Failed to start session: ${error.message}`);
    } finally {
      db.close();
    }
  }
}