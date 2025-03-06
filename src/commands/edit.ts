// src/commands/edit.ts
import { Command, Args, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { formatDate, parseTimeStringToDate } from '../utils/formatting-utils.js';
import { isValid, parse, parseISO } from 'date-fns';
import { z } from 'zod';

// Validation Schemas
const timeSchema = z
  .string()
  .regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, 'Invalid time format. Use "HH:MM AM/PM".')
  .transform((timeString: string): Date => parseTimeStringToDate(timeString));

const dateSchema = z.string().refine(
  (str) => isValid(parse(str, 'yyyy-MM-dd', new Date())),
  { message: 'Invalid date format. Use yyyy-MM-dd.' }
);

interface SessionTimes {
  startTimeISO?: string;
  stopTimeISO?: string;
}

interface ParsedFlags {
  date?: string;
  startTime?: Date;
  stopTime?: Date;
}

interface FocusSession {
  id: string;
  start_time: string;
  stop_time: string | null;
}

export default class Edit extends Command {
  static description = 'Edits an existing focus session.';

  static examples = [
    `$ focus edit 2e54ebd4 --start_time "12:20 AM"`,
    `$ focus edit 2e54ebd4 --stop_time "02:00 PM"`,
    `$ focus edit 2e54ebd4 --date 2024-03-15 --start_time "09:00 AM" --stop_time "10:30 AM"`,
    `$ focus edit 2e54ebd4 --date 2024-03-10`,
  ];

  static args = {
    id: Args.string({ description: 'First 8 characters of the session ID', required: true }),
  };

  static flags = {
    start_time: Flags.string({
      description: 'New start time in HH:MM AM/PM format',
      exclusive: ['date'],
    }),
    stop_time: Flags.string({
      description: 'New stop time in HH:MM AM/PM format',
      exclusive: ['date'],
    }),
    date: Flags.string({
      description: 'New date in yyyy-MM-dd format',
    }),
  };

  private db: FocusDatabase;

  constructor(argv: string[], config: any, db?: FocusDatabase) {
    super(argv, config);
    this.db = db || new FocusDatabase();
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Edit);

    try {
      const session = this.getSession(args.id);
      const parsedFlags = this.validateAndParseFlags(flags);
      const sessionTimes = this.calculateSessionTimes(session, parsedFlags);

      this.validateSessionTimes(session, sessionTimes);
      this.checkForOverlaps(session.id, sessionTimes);

      this.updateSession(session.id, sessionTimes);
      this.logSuccess(args.id, sessionTimes);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.cleanup();
    }
  }

  private getSession(id: string): FocusSession {
    const session = this.db.getSession(id);
    if (!session) {
      throw new FocusError(`Session with ID ${id}... not found.`);
    }
    return session as FocusSession;
  }

  private validateAndParseFlags(flags: Record<string, string | undefined>): ParsedFlags {
    const result: ParsedFlags = {};

    if (flags.date) {
      result.date = this.parseDate(flags.date);
    }
    if (flags.start_time) {
      result.startTime = this.parseTime(flags.start_time);
    }
    if (flags.stop_time) {
      result.stopTime = this.parseTime(flags.stop_time);
    }

    return result;
  }

  private parseDate(date: string): string {
    return dateSchema.parse(date);
  }

  private parseTime(time: string): Date {
    return timeSchema.parse(time);
  }

  private calculateSessionTimes(session: FocusSession, flags: ParsedFlags): SessionTimes {
    const { date, startTime, stopTime } = flags;
    const result: SessionTimes = {};

    if (date && !startTime && !stopTime) {
      return this.updateDateOnly(session, date);
    }

    if (startTime) {
      result.startTimeISO = this.combineDateTime(
        date ? parseISO(date) : parseISO(session.start_time),
        startTime
      ).toISOString();
    }

    if (stopTime) {
      if (!session.stop_time) {
        throw new FocusError('Stop time cannot be set for sessions not yet stopped.');
      }
      result.stopTimeISO = this.combineDateTime(
        date ? parseISO(date) : parseISO(session.stop_time),
        stopTime
      ).toISOString();
    }

    if (result.startTimeISO && !session.stop_time && !result.stopTimeISO) {
      result.stopTimeISO = new Date().toISOString();
    }

    return result;
  }

  private updateDateOnly(session: FocusSession, newDate: string): SessionTimes {
    const startDate = parseISO(session.start_time);
    const result: SessionTimes = {
      startTimeISO: new Date(`${newDate}T${formatDate(startDate, 'HH:mm:ss.SSSxxx')}`).toISOString(),
    };

    if (session.stop_time) {
      const stopDate = parseISO(session.stop_time);
      result.stopTimeISO = new Date(`${newDate}T${formatDate(stopDate, 'HH:mm:ss.SSSxxx')}`).toISOString();
    }

    return result;
  }

  private combineDateTime(date: Date, time: Date): Date {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes()
    );
  }

  private validateSessionTimes(session: FocusSession, times: SessionTimes): void {
    const { startTimeISO, stopTimeISO } = times;

    if (startTimeISO && stopTimeISO && new Date(startTimeISO) >= new Date(stopTimeISO)) {
      throw new FocusError('Start time must be before stop time.');
    }
  }

  private checkForOverlaps(sessionId: string, times: SessionTimes): void {
    const { startTimeISO, stopTimeISO } = times;

    if (startTimeISO && stopTimeISO) {
      const overlaps = this.db.getOverlappingSessions(startTimeISO, stopTimeISO)
        .filter((overlap) => overlap.id !== sessionId);
      if (overlaps.length > 0) {
        throw new FocusError('The updated session overlaps with another session.');
      }
    } else if (startTimeISO) {
      const overlaps = this.db.getOverlappingSessionsWithStartTime(startTimeISO)
        .filter((overlap) => overlap.id !== sessionId);
      if (overlaps.length > 0) {
        throw new FocusError('The updated Start Time overlaps with another session.');
      }
    }
  }

  private updateSession(sessionId: string, times: SessionTimes): void {
    const { startTimeISO, stopTimeISO } = times;
    this.db.updateSession(sessionId, startTimeISO, stopTimeISO);

    if (startTimeISO || stopTimeISO) {
      const session = this.getSession(sessionId);
      const start = startTimeISO ? new Date(startTimeISO) : new Date(session.start_time);
      const stop = stopTimeISO ? new Date(stopTimeISO) : (session.stop_time ? new Date(session.stop_time) : null);

      if (stop) {
        const durationInSeconds = Math.floor((stop.getTime() - start.getTime()) / 1000);
        this.db.updateDuration(sessionId, durationInSeconds);
      }
    }
  }

  private logSuccess(id: string, times: SessionTimes): void {
    const updatedParts = [];
    if (times.startTimeISO) {
      updatedParts.push(`Start: ${formatDate(new Date(times.startTimeISO), 'yyyy-MM-dd hh:mm a')}`);
    }
    if (times.stopTimeISO) {
      updatedParts.push(`Stop: ${formatDate(new Date(times.stopTimeISO), 'yyyy-MM-dd hh:mm a')}`);
    }
    this.log(`✅ Session ${id}... updated. ${updatedParts.join(', ')}`);
  }

  private handleError(error: unknown): void {
    if (error instanceof FocusError) {
      this.error(error.message);
    } else if (error instanceof z.ZodError) {
      this.error(error.errors.map((e) => e.message).join('\n'));
    } else {
      this.error(`Failed to edit session: ${(error as Error).message}`);
    }
  }

  private cleanup(): void {
    this.db.close();
  }
}