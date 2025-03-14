import chalk from 'chalk';
import {
  getDatabasePath,
  addSession,
  checkForOverlap,
  initializeDatabase,
} from '../lib/db.js';
import { executeDbCommand, parseTimeString } from '../lib/utils.js';
import Database from 'better-sqlite3'; // Import for types

export async function addCommand(timeRange: string) {
  const dbPath = getDatabasePath();
  await initializeDatabase(dbPath); // Initialize outside executeDbCommand

  await executeDbCommand(
    dbPath,
    (db) => {
      const { startTime, endTime } = parseTimeRange(timeRange);
      validateTimeRange(startTime, endTime);
      ensureNoOverlap(db, startTime, endTime);
      const sessionId = addSessionToDatabase(db, startTime, endTime);
      logSuccess(sessionId);
    },
    'Failed to add the session.'
  );
}

function parseTimeRange(timeRange: string): { startTime: Date; endTime: Date } {
  const [startTimeString, endTimeString] = timeRange
    .split('-')
    .map((s) => s.trim());

  if (!startTimeString || !endTimeString) {
    throw new Error(
      'Invalid time range format. Use "HH:MM AM/PM - HH:MM AM/PM".'
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set time to 00:00:00 for accurate comparison

  const startTime = parseTimeString(startTimeString, today);
  const endTime = parseTimeString(endTimeString, today);

  return { startTime, endTime };
}

function validateTimeRange(startTime: Date, endTime: Date): void {
  if (endTime.getTime() <= startTime.getTime()) {
    throw new Error('End time must be after start time.');
  }
}

function ensureNoOverlap(
  db: Database.Database,
  startTime: Date,
  endTime: Date
): void {
  if (checkForOverlap(db, startTime, endTime)) {
    throw new Error('Session overlaps with an existing session.');
  }
}

function addSessionToDatabase(
  db: Database.Database,
  startTime: Date,
  endTime: Date
): string {
  return addSession(db, startTime, endTime);
}

function logSuccess(sessionId: string): void {
  console.log(
    chalk.green(
      `✅ Session added successfully with ID: ${sessionId.slice(0, 8)}`
    )
  );
}
