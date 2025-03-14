// src/lib/db.ts
import { ensureDir } from 'fs-extra';
import { resolve } from 'path';
import envPaths from 'env-paths';
import { format, parseISO } from 'date-fns';
import Database, { Database as SQLiteDatabase } from 'better-sqlite3';
import * as crypto from 'node:crypto';
import {
  DATABASE_FILE_NAME,
  SESSIONS_TABLE_NAME,
  DATE_FORMAT,
  TIME_FORMAT,
} from './constants.js';
import type { Session } from './types.js'; // Import Session

// Module: Get the database path
export function getDatabasePath(): string {
  const dbPaths = envPaths('focus-cli', { suffix: '' });
  return resolve(dbPaths.data, DATABASE_FILE_NAME);
}

// Module: Initialize the database
export async function initializeDatabase(dbPath: string): Promise<void> {
  try {
    await ensureDir(envPaths('focus-cli', { suffix: '' }).data);
    const db = new Database(dbPath);
    createSessionsTable(db);
    db.close();
  } catch (error) {
    handleError(error, 'Failed to initialize the database.');
  }
}

// Module: Create the sessions table in the database
function createSessionsTable(db: SQLiteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${SESSIONS_TABLE_NAME} (
      id TEXT PRIMARY KEY,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER
    )
  `);
}

// Module: Fetch the last active session
export function getLastActiveSession(db: SQLiteDatabase): Session | undefined {
  try {
    const stmt = db.prepare(
      `SELECT id, start_time FROM ${SESSIONS_TABLE_NAME} WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1`
    );
    return stmt.get() as Session | undefined;
  } catch (error) {
    handleError(error, 'Failed to fetch the last active session.');
    return undefined; // Explicitly return undefined
  }
}

// Module: Start a new session
export function startSession(db: SQLiteDatabase): string {
  try {
    const startTime = new Date().toISOString();
    const id = crypto.randomUUID();
    insertNewSession(db, id, startTime);
    return id;
  } catch (error) {
    handleError(error, 'Failed to start a new session.');
    return ''; // Or throw the error, depending on desired behavior
  }
}

// Module: Insert a new session into the database
function insertNewSession(
  db: SQLiteDatabase,
  id: string,
  startTime: string
): void {
  const stmt = db.prepare(`
    INSERT INTO ${SESSIONS_TABLE_NAME} (id, start_time, end_time, duration)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, startTime, null, null);
}

// Module: Stop an active session
export function stopSession(db: SQLiteDatabase, session: Session): number {
  try {
    const endTime = new Date().toISOString();
    const duration = calculateDuration(session.start_time, endTime);

    updateSessionEndAndDuration(db, session.id, endTime, duration);
    return duration;
  } catch (error) {
    handleError(error, 'Failed to stop the session.');
    return 0; // Return a default value on error
  }
}

// Module: Calculate session duration in seconds
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.round((end.getTime() - start.getTime()) / 1000);
}

// Module: Update session's end time and duration
function updateSessionEndAndDuration(
  db: SQLiteDatabase,
  sessionId: string,
  endTime: string,
  duration: number
): void {
  const stmt = db.prepare(
    `UPDATE ${SESSIONS_TABLE_NAME} SET end_time = ?, duration = ? WHERE id = ?`
  );
  stmt.run(endTime, duration, sessionId);
}

// Module: Check for overlapping sessions
export function checkForOverlap(
  db: SQLiteDatabase,
  newStartTime: Date,
  newEndTime: Date
): boolean {
  try {
    const stmt = db.prepare(`
      SELECT id, start_time, end_time
      FROM ${SESSIONS_TABLE_NAME}
      WHERE (
        (start_time <= ? AND end_time > ?) OR
        (start_time < ? AND end_time >= ?) OR
        (start_time >= ? AND start_time < ?) OR
        (end_time > ? AND end_time <= ?)
      )
    `);

    const params = [
      newStartTime.toISOString(),
      newStartTime.toISOString(),
      newEndTime.toISOString(),
      newEndTime.toISOString(),
      newStartTime.toISOString(),
      newEndTime.toISOString(),
      newStartTime.toISOString(),
      newEndTime.toISOString(),
    ];

    const overlappingSessions = stmt.all(...params) as Session[];
    return overlappingSessions.length > 0;
  } catch (error) {
    handleError(error, 'Failed to check for overlapping sessions.');
    return false;
  }
}

// Module: Add a new session to the database
export function addSession(
  db: SQLiteDatabase,
  startTime: Date,
  endTime: Date
): string {
  try {
    validateSessionTimes(startTime, endTime);
    if (checkForOverlap(db, startTime, endTime)) {
      throw new Error('Session overlaps with an existing session.');
    }

    const durationInSeconds = calculateDuration(
      startTime.toISOString(),
      endTime.toISOString()
    );
    const id = crypto.randomUUID();

    insertNewSessionWithDuration(db, id, startTime, endTime, durationInSeconds);
    return id;
  } catch (error) {
    handleError(error, 'Failed to add a new session.');
    return ''; // Return empty string in case of error
  }
}

// Module: Validate that end time is after start time
function validateSessionTimes(startTime: Date, endTime: Date): void {
  if (endTime.getTime() <= startTime.getTime()) {
    throw new Error('End time must be after start time.');
  }
}

// Module: Insert a new session with duration into the database
function insertNewSessionWithDuration(
  db: SQLiteDatabase,
  id: string,
  startTime: Date,
  endTime: Date,
  durationInSeconds: number
): void {
  const stmt = db.prepare(`
    INSERT INTO ${SESSIONS_TABLE_NAME} (id, start_time, end_time, duration)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(
    id,
    startTime.toISOString(),
    endTime.toISOString(),
    durationInSeconds
  );
}

// Module: Find sessions by a partial ID (e.g., first 8 characters)
export function findSessionsByPartialId(
  db: SQLiteDatabase,
  partialId: string
): string[] {
  try {
    validatePartialId(partialId);

    const stmt = db.prepare(
      `SELECT id FROM ${SESSIONS_TABLE_NAME} WHERE id LIKE ?`
    );
    const matchingSessions = stmt.all(`${partialId}%`) as { id: string }[];
    return matchingSessions.map((session) => session.id);
  } catch (error) {
    handleError(error, 'Failed to find sessions by partial ID.');
    return [];
  }
}

// Module: Validate that the partial ID is exactly 8 characters long
function validatePartialId(partialId: string): void {
  if (!partialId || partialId.length !== 8) {
    throw new Error(
      'Invalid partial ID. It must be exactly 8 characters long.'
    );
  }
}

// Module: Delete a session by its full ID
export function deleteSessionById(db: SQLiteDatabase, sessionId: string): void {
  try {
    const stmt = db.prepare(`DELETE FROM ${SESSIONS_TABLE_NAME} WHERE id = ?`);
    stmt.run(sessionId);
  } catch (error) {
    handleError(error, 'Failed to delete the session.');
  }
}

// Module: Fetch all sessions from the database.
export function getAllSessions(db: SQLiteDatabase): Session[] {
  try {
    const stmt = db.prepare(
      `SELECT id, start_time, end_time, duration FROM ${SESSIONS_TABLE_NAME}`
    );
    const results = stmt.all() as Session[];
    return results.map((session) => ({
      ...session,
      duration: session.duration === null ? 0 : session.duration,
    }));
  } catch (error) {
    handleError(error, 'Failed to fetch all sessions.');
    return []; // Return empty array in case of error
  }
}

export function getFormattedSessions(db: SQLiteDatabase): {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: string;
}[] {
  const sessions = getAllSessions(db);
  return sessions.map((session) => ({
    id: session.id.slice(0, 8), // Short ID
    date: format(parseISO(session.start_time), DATE_FORMAT),
    startTime: format(parseISO(session.start_time), TIME_FORMAT),
    endTime: session.end_time
      ? format(parseISO(session.end_time), TIME_FORMAT)
      : 'N/A',
    duration: formatDurationForList(session.duration),
  }));
}

//Added function, for use by getFormattedSessions.
function formatDurationForList(durationInSeconds: number | null): string {
  if (durationInSeconds === null) return 'N/A';
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Module: Calculate summary statistics for sessions
export function calculateSummary(
  sessions: Session[],
  sortBy: string, // Still used for summary calculation
  sortOrder: 'asc' | 'desc' // Still used for summary calculation
) {
  try {
    const summaryMap = aggregateSessionData(sessions);
    const summaryArray = formatSummaryData(summaryMap);
    return sortSummaryArray(summaryArray, sortBy, sortOrder);
  } catch (error) {
    handleError(error, 'Failed to calculate the summary.');
    return []; // Return empty array in case of error
  }
}

// Module: Aggregate session data by date
function aggregateSessionData(
  sessions: Session[]
): Map<string, { total: number; count: number }> {
  const summaryMap = new Map<string, { total: number; count: number }>();

  sessions.forEach((session) => {
    const date = format(parseISO(session.start_time), DATE_FORMAT);
    const duration = session.duration ?? 0;

    if (!summaryMap.has(date)) {
      summaryMap.set(date, { total: 0, count: 0 });
    }
    const data = summaryMap.get(date)!;
    data.total += duration;
    data.count += 1;
  });

  return summaryMap;
}

// Module: Format summary data for display
function formatSummaryData(
  summaryMap: Map<string, { total: number; count: number }>
) {
  return Array.from(summaryMap.entries()).map(([date, { total, count }]) => {
    const avgSeconds = total / count;

    const avgHours = Math.floor(avgSeconds / 3600);
    const avgMinutes = Math.floor((avgSeconds % 3600) / 60);
    const formattedAvgDuration = `${String(avgHours).padStart(2, '0')}:${String(avgMinutes).padStart(2, '0')}`;

    const totalHours = Math.floor(total / 3600);
    const totalMinutes = Math.floor((total % 3600) / 60);
    const formattedTotalDuration = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`;

    return {
      date,
      avgDuration: formattedAvgDuration,
      totalDuration: formattedTotalDuration,
      totalSeconds: total,
      avgSeconds,
      goal: total >= 8 * 3600 ? '✅' : '❌',
    };
  });
}

// Module: Sort summary array based on sort criteria
function sortSummaryArray(
  summaryArray: any[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
) {
  return summaryArray
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'total') {
        comparison = a.totalSeconds - b.totalSeconds;
      } else if (sortBy === 'average') {
        comparison = a.avgSeconds - b.avgSeconds;
      } else if (sortBy === 'date') {
        comparison = a.date.localeCompare(b.date);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    })
    .map((item, index) => ({
      sl: `${index + 1}`,
      ...item,
    }));
}
// Module: Centralized error handling
function handleError(error: unknown, message: string): never {
  if (error instanceof Error) {
    console.error(`${message}: ${error.message}`);
  } else {
    console.error(`${message}: An unexpected error occurred.`);
  }
  process.exit(1); // Exit with a non-zero status code
}
