import Database from 'better-sqlite3';
import chalk from 'chalk';
import { getDatabasePath, findSessionsByPartialId } from '../lib/db.js';
import { executeDbCommand, parseTimeString } from '../lib/utils.js';
import type { Session, EditOptions } from '../lib/types.js'; // Import EditOptions

// Main edit command function
export async function editCommand(shortId: string, options: EditOptions) {
  const dbPath = getDatabasePath();

  await executeDbCommand(
    dbPath,
    (db) => {
      const sessionId = findUniqueSession(db, shortId);
      const updatedFields = updateSessionFields(db, sessionId, options);
      logUpdateResult(updatedFields);
    },
    'Failed to edit the session.'
  );
}

function validatePartialId(shortId: string): void {
  if (!shortId || shortId.length !== 8) {
    throw new Error(
      'Invalid partial ID. It must be exactly 8 characters long.'
    );
  }
}

function findUniqueSession(db: Database.Database, shortId: string): string {
  const matchingSessionIds = findSessionsByPartialId(db, shortId);

  if (matchingSessionIds.length === 0) {
    console.log(
      chalk.yellow(`No session found with ID starting with '${shortId}'.`)
    );
    process.exit(0); // Exit gracefully
  } else if (matchingSessionIds.length > 1) {
    console.log(
      chalk.yellow(
        `Multiple sessions found with ID starting with '${shortId}'. Please use the full ID.`
      )
    );
    process.exit(0); // Exit gracefully
  }

  return matchingSessionIds[0];
}

function updateSessionFields(
  db: Database.Database,
  sessionId: string,
  options: EditOptions
): string[] {
  const updates: string[] = [];
  const updateValues: any[] = [];

  const stmt = db.prepare(
    `SELECT start_time, end_time FROM sessions WHERE id = ?`
  );
  const session: Session | undefined = stmt.get(sessionId) as
    | Session
    | undefined;

  if (!session) {
    throw new Error('Session not found.');
  }

  let startTime = new Date(session.start_time);
  let endTime = session.end_time ? new Date(session.end_time) : null;

  let updateQuery = 'UPDATE sessions SET ';
  const conditions: string[] = [];

  if (options.startTime) {
    const newStartTime = parseTimeOption(options.startTime, startTime);
    startTime = newStartTime; // Update startTime
    conditions.push(`start_time = ?`);
    updateValues.push(startTime.toISOString());
    updates.push('start time');
  }

  if (options.endTime) {
    const newEndTime = parseTimeOption(options.endTime, endTime || startTime); // Use startTime as base if endTime is null
    endTime = newEndTime;
    conditions.push(`end_time = ?`);
    updateValues.push(endTime.toISOString());
    updates.push('end time');
  }

  if (options.date) {
    const parsedDate = new Date(options.date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(
        `Invalid date format: ${options.date}. Use "YYYY-MM-DD".`
      );
    }

    // Update the date part of startTime
    startTime.setFullYear(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate()
    );
    conditions.push(`start_time = ?`);
    updateValues.push(startTime.toISOString());

    // If endTime exists, update its date part as well
    if (endTime) {
      endTime.setFullYear(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate()
      );
      conditions.push(`end_time = ?`);
      updateValues.push(endTime.toISOString());
    }

    updates.push('date');
  }

  // Recalculate and update duration, handling null endTime correctly
  let durationInSeconds = null;
  if (endTime) {
    // Only calculate if endTime is not null
    if (startTime > endTime) {
      throw new Error('End time must be after start time.');
    }
    durationInSeconds = Math.round(
      (endTime.getTime() - startTime.getTime()) / 1000
    );
  }
  conditions.push('duration = ?');
  updateValues.push(durationInSeconds);
  updates.push('duration');

  if (conditions.length === 0) {
    return [];
  }

  updateQuery += conditions.join(', ') + ' WHERE id = ?';
  updateValues.push(sessionId);
  const updateStmt = db.prepare(updateQuery);
  updateStmt.run(...updateValues);

  return updates;
}

function parseTimeOption(timeString: string, baseDate: Date): Date {
  const today = new Date(baseDate); // Use provided baseDate
  today.setHours(0, 0, 0, 0);
  return parseTimeString(timeString, today); // Use the imported function
}

function logUpdateResult(updatedFields: string[]): void {
  if (updatedFields.length === 0) {
    console.log(chalk.yellow('No changes were made to the session.'));
  } else {
    console.log(
      chalk.green(
        `✅ Session updated successfully (${updatedFields.join(', ')})`
      )
    );
  }
}
