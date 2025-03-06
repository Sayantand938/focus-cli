// src/commands/stop.ts
import { Command } from '@oclif/core';
import { differenceInSeconds } from 'date-fns';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { formatDate, formatDuration } from '../utils/formatting-utils.js';

export default class Stop extends Command {
  static description = 'Stops the current focus session and records the stop time and duration.';

  static examples = [
    `$ focus stop`,
  ];

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    // Use dependency injection for the database
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    try {
      const now = this.getCurrentTime();
      const session = this.getActiveSession();

      const { id, start_time: startTimeStr } = session;
      const startTime = new Date(startTimeStr);
      const durationInSeconds = this.calculateDuration(startTime, now);

      this.stopSession(id, now, durationInSeconds);
      this.logSuccessMessage(now, durationInSeconds);

    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private getCurrentTime(): Date {
    return new Date();
  }

  private getActiveSession(): any {
    const session = this.db.getOpenSession();
    if (!session) {
      throw new FocusError('No active session found.');
    }
    return session;
  }

  private calculateDuration(startTime: Date, stopTime: Date): number {
    return differenceInSeconds(stopTime, startTime);
  }

  private stopSession(sessionId: string, stopTime: Date, durationInSeconds: number): void {
    this.db.stopSession(sessionId, stopTime.toISOString(), durationInSeconds);
  }

  private logSuccessMessage(stopTime: Date, durationInSeconds: number): void {
    this.log(
      `Focus session stopped at ${formatDate(stopTime, 'MMM dd yyyy, hh:mm:ss a')}. Duration: ${formatDuration(durationInSeconds)}`
    );
  }

  private handleError(error: any): void {
    if (error instanceof FocusError) {
      this.error(error.message);
    } else if (error instanceof Error) {
      this.error(`Failed to stop session: ${error.message}`);
    } else {
      this.error('An unexpected error occurred.');
    }
  }

  private cleanup(): void {
    this.db.close();
  }
}