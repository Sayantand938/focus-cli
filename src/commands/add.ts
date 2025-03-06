// src/commands/add.ts
import { Command, Args } from '@oclif/core';
import { v4 as uuidv4 } from 'uuid';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js'; // Corrected import
import { formatDate, formatDuration, parseTimeStringToDate } from '../utils/formatting-utils.js';
import { isValid, parse } from 'date-fns';
import { z } from 'zod';

const timeSchema = z.string()
    .regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, 'Invalid time format. Please use "HH:MM AM/PM"')
    .transform((timeString: string): Date => {
        return parseTimeStringToDate(timeString);
    });

const timeRangeSchema = z.string()
  .regex(/^(\d{1,2}:\d{2}\s*(?:AM|PM)) - (\d{1,2}:\d{2}\s*(?:AM|PM))$/i, 'Invalid time range format. Please use "HH:MM AM/PM - HH:MM AM/PM"')
  .transform((str) => str.split(' - '))
  .refine((parts) => parts.length === 2, { message: 'Invalid time range format.' })
  .transform(([startTimeString, stopTimeString]) => ({ startTimeString, stopTimeString }));

export default class Add extends Command {
  static description = 'Adds a focus session with a specified time range.';

  static examples = [
    `$ focus add "08:00 AM - 10:00 AM"`,
    `$ focus add "12:00 PM - 01:30 PM"`, // Added example
  ];

  static args = {
    timeRange: Args.string({ description: 'Time range in the format "HH:MM AM/PM - HH:MM AM/PM"', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Add);
    const db = new FocusDatabase();

    try {
      const parsedTimeRange = timeRangeSchema.parse(args.timeRange);
      const { startTimeString, stopTimeString } = parsedTimeRange;

      const startTime = timeSchema.parse(startTimeString);
      const stopTime = timeSchema.parse(stopTimeString);

      if (startTime >= stopTime) {
        throw new FocusError('Start time must be before stop time.'); // Use FocusError
      }

      const startTimeISO = startTime.toISOString();
      const stopTimeISO = stopTime.toISOString();
      if (db.getOverlappingSessions(startTimeISO, stopTimeISO).length > 0) {
        throw new FocusError('A session overlaps with this time range.'); // More concise error
      }

      const sessionId = uuidv4();
      db.createSession(sessionId, startTimeISO);
      const durationInSeconds = Math.floor((stopTime.getTime() - startTime.getTime()) / 1000);
      db.stopSession(sessionId, stopTimeISO, durationInSeconds);

      this.log(`Session added: ${formatDate(startTime, 'hh:mm a')} - ${formatDate(stopTime, 'hh:mm a')} (${formatDuration(durationInSeconds)})`);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        this.error(error.errors.map((e) => e.message).join('\n'));
      } else if (error instanceof FocusError) {
        this.error(error.message); // Handle FocusError specifically
      } else {
        this.error(`Failed to add session: ${error.message}`);
      }
    } finally {
      db.close();
    }
  }
}