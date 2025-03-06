// src/commands/add.ts
import { Command, Args } from '@oclif/core';
import { v4 as uuidv4 } from 'uuid';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { formatDate, formatDuration, parseTimeStringToDate } from '../utils/formatting-utils.js';
import { z } from 'zod';

// Validation schemas
const timeSchema = z.string()
  .regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, 'Invalid time format. Use "HH:MM AM/PM".')
  .transform((timeString: string): Date => parseTimeStringToDate(timeString));

const timeRangeSchema = z.string()
  .regex(/^(\d{1,2}:\d{2}\s*(?:AM|PM)) - (\d{1,2}:\d{2}\s*(?:AM|PM))$/i, 'Invalid time range format. Use "HH:MM AM/PM - HH:MM AM/PM".')
  .transform((str) => str.split(' - '))
  .refine((parts) => parts.length === 2, { message: 'Invalid time range format.' })
  .transform(([startTimeString, stopTimeString]) => ({ startTimeString, stopTimeString }));

export default class Add extends Command {
  static description = 'Adds a focus session with a specified time range.';
  static examples = [
    `$ focus add "08:00 AM - 10:00 AM"`,
    `$ focus add "12:00 PM - 01:30 PM"`,
  ];
  static args = {
    timeRange: Args.string({ description: 'Time range in the format "HH:MM AM/PM - HH:MM AM/PM"', required: true }),
  };

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Add);

    try {
      const parsedTimeRange = this.validateTimeRange(args.timeRange);
      const sessionId = this.generateSessionId();
      const { startTimeISO, stopTimeISO, durationInSeconds } = this.calculateSessionDetails(parsedTimeRange);

      this.validateNoOverlappingSessions(startTimeISO, stopTimeISO);
      this.createAndLogSession(sessionId, startTimeISO, stopTimeISO, durationInSeconds);
    } catch (error: any) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private validateTimeRange(timeRange: string): { startTimeString: string; stopTimeString: string } {
    return timeRangeSchema.parse(timeRange);
  }

  private generateSessionId(): string {
    return uuidv4();
  }

  private calculateSessionDetails(parsedTimeRange: { startTimeString: string; stopTimeString: string }): {
    startTimeISO: string;
    stopTimeISO: string;
    durationInSeconds: number;
  } {
    const startTime = timeSchema.parse(parsedTimeRange.startTimeString);
    const stopTime = timeSchema.parse(parsedTimeRange.stopTimeString);

    if (startTime >= stopTime) {
      throw new FocusError('Start time must be before stop time.');
    }

    return {
      startTimeISO: startTime.toISOString(),
      stopTimeISO: stopTime.toISOString(),
      durationInSeconds: Math.floor((stopTime.getTime() - startTime.getTime()) / 1000),
    };
  }

  private validateNoOverlappingSessions(startTimeISO: string, stopTimeISO: string): void {
    const overlappingSessions = this.db.getOverlappingSessions(startTimeISO, stopTimeISO);
    if (overlappingSessions.length > 0) {
      throw new FocusError('A session overlaps with this time range.');
    }
  }

  private createAndLogSession(
    sessionId: string,
    startTimeISO: string,
    stopTimeISO: string,
    durationInSeconds: number
  ): void {
    this.db.createSession(sessionId, startTimeISO);
    this.db.stopSession(sessionId, stopTimeISO, durationInSeconds);

    const startTime = new Date(startTimeISO);
    const stopTime = new Date(stopTimeISO);
    this.log(
      `Session added: ${formatDate(startTime, 'hh:mm a')} - ${formatDate(stopTime, 'hh:mm a')} (${formatDuration(durationInSeconds)})`
    );
  }

  private handleError(error: any): void {
    if (error instanceof z.ZodError) {
      this.error(error.errors.map((e) => e.message).join('\n'));
    } else if (error instanceof FocusError) {
      this.error(error.message);
    } else {
      this.error(`Failed to add session: ${error.message}`);
    }
  }

  private cleanup(): void {
    this.db.close();
  }
}