// src/commands/stop.ts
import { Command } from '@oclif/core';
import { differenceInSeconds } from 'date-fns';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js'; // Corrected import
import { formatDate, formatDuration } from '../utils/formatting.js';

export default class Stop extends Command {
  static description = 'Stops the current focus session and records the stop time and duration.';

  static examples = [
    `$ focus stop`,
  ];

  async run(): Promise<void> {
    const db = new FocusDatabase();
    try {
      const now = new Date();
      const stopTime = now.toISOString(); // Store as ISO string

      const session = db.getOpenSession();
      if (!session) {
        throw new FocusError('No active session found.'); // Use FocusError
      }

      const { start_time: startTimeStr, id } = session; // Destructure here
      const startTime = new Date(startTimeStr);
      const durationInSeconds = differenceInSeconds(now, startTime);

      db.stopSession(id, stopTime, durationInSeconds);
      this.log(`Focus session stopped at ${formatDate(now, 'MMM dd yyyy, hh:mm:ss a')}. Duration: ${formatDuration(durationInSeconds)}`); // Use formatDate and formatDuration

    } catch (error: any) {
      if (error instanceof FocusError) {
          this.error(error.message);
      }
      else if (error instanceof Error) {
        this.error(`Failed to stop session: ${error.message}`);
      } else {
          this.error(`An unexpected error occurred`);
      }
    } finally {
      db.close();
    }
  }
}