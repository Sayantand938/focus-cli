import { Command, Flags } from '@oclif/core';
import { format, differenceInSeconds } from 'date-fns';
import { FocusDatabase } from '../utils/database.js';
import humanizeDuration from 'humanize-duration';

export default class Stop extends Command {
  static description = 'Stops the current focus session and records the stop time and duration.';

  static examples = [
    `$ focus stop`,
  ];

  async run(): Promise<void> {
    const db = new FocusDatabase();
    try {
      // Get the current time
      const now = new Date();

      // Format the stop time
      const stopTime = format(now, 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx');
      const formattedStopTime = format(now, 'MMM dd yyyy, hh:mm:ss a');

      // Get the active session from the database
      const session = db.getOpenSession();

      if (!session) {
        this.error('No active session found.');
        return;
      }

      // Calculate the session duration
      const startTime = new Date(session.start_time);
      const durationInSeconds = differenceInSeconds(now, startTime);

      // Humanize the duration
      const humanizedDuration = humanizeDuration(durationInSeconds * 1000, {
        units: ['h', 'm', 's'],
        round: true,
      });

      // Update the session in the database
      db.stopSession(session.id, stopTime, durationInSeconds);

      this.log(`Focus session stopped at ${formattedStopTime}. Duration: ${humanizedDuration}`);
    } catch (error: any) {
      this.error(`Failed to stop session: ${error.message}`);
    } finally {
      db.close();
    }
  }
}