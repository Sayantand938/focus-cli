import { Command, Args } from '@oclif/core';
import { v4 as uuidv4 } from 'uuid';
import { FocusDatabase } from '../utils/database.js';
import { formatDate, formatDuration } from '../utils/formatting.js';
import { isValid } from 'date-fns';
import { z } from 'zod';

// Define the Zod schema for the time range
const timeRangeSchema = z.string()
  .regex(/^(\d{1,2}:\d{2}\s*(?:AM|PM)) - (\d{1,2}:\d{2}\s*(?:AM|PM))$/i, 'Invalid time range format. Please use "HH:MM AM/PM - HH:MM AM/PM"')
  .transform((str: string) => str.split(' - '))  // Type str as string
  .refine((parts: string[]) => parts.length === 2, { message: 'Invalid time range format.' }) // Type parts as string[]
  .transform(([startTimeString, stopTimeString]: string[]) => ({ startTimeString, stopTimeString })); // Destructure with correct type: string[]

// Define Zod schema for individual times
const timeSchema = z.string()
    .regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, 'Invalid time format. Please use "HH:MM AM/PM"')
    .transform((timeString: string): Date | null => { // Type timeString and return type
        const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
        const match = timeString.trim().match(timeRegex);

        if (!match) {
            return null; // Invalid format
        }

        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();

        if (ampm === 'PM' && hours !== 12) {
            hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
            hours = 0;  // Midnight case
        }

        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return null;
        }

        const now = new Date();
        const parsedTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        return isValid(parsedTime) ? parsedTime : null;
    })
    .refine((date: Date | null): date is Date => date !== null, {message: 'Invalid Time Format'}); //check not null and add the corresponding type

export default class Add extends Command {
  static description = 'Adds a focus session with a specified time range.';

  static examples = [
    `$ focus add "08:00 AM - 10:00 AM"`,
  ];

  static args = {
    timeRange: Args.string({ description: 'Time range in the format "HH:MM AM/PM - HH:MM AM/PM"', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Add);
    const db = new FocusDatabase();

    try {
      // 1. Validate and Parse with Zod
      const parsedTimeRange = timeRangeSchema.parse(args.timeRange);
      const { startTimeString, stopTimeString } = parsedTimeRange;

      const startTime = timeSchema.parse(startTimeString);
      const stopTime = timeSchema.parse(stopTimeString);

      // 2. Business Logic Validation (after Zod)
      if (startTime >= stopTime) {
        this.error('Start time must be before stop time.');
        return;
      }

      // 3. Check for overlapping sessions
      const startTimeISO = startTime.toISOString();
      const stopTimeISO = stopTime.toISOString();
      const overlappingSessions = db.getOverlappingSessions(startTimeISO, stopTimeISO);
      if (overlappingSessions.length > 0) {
        const overlappingSession = overlappingSessions[0];
        const overlappingStartTime = formatDate(new Date(overlappingSession.start_time), 'hh:mm a');
        const overlappingStopTime = overlappingSession.stop_time ? formatDate(new Date(overlappingSession.stop_time), 'hh:mm a') : 'Ongoing';
        this.error(`Overlapping session: ${overlappingStartTime} - ${overlappingStopTime}`);
        return;
      }

      // 4. Store Session
      const sessionId = uuidv4();

      db.createSession(sessionId, startTimeISO);

      const durationInSeconds = Math.floor((stopTime.getTime() - startTime.getTime()) / 1000);
      db.stopSession(sessionId, stopTimeISO, durationInSeconds);

      this.log(`Session added: ${formatDate(startTime, 'hh:mm a')} - ${formatDate(stopTime, 'hh:mm a')} (${formatDuration(durationInSeconds)})`);

    } catch (error: any) {
      // 5.  Handle Zod Errors (and others) Gracefully
      if (error instanceof z.ZodError) {
        this.error(error.errors.map((e: z.ZodIssue) => e.message).join('\n')); // Type e as ZodIssue
      } else {
        this.error(`Failed to add session: ${error.message}`);
      }
    } finally {
      db.close();
    }
  }
}