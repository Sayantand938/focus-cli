// src/utils/database.ts
import Database from 'better-sqlite3';
import { Session, SummaryRow } from './types.js';
import { join } from 'path';
import { z } from 'zod';
import envPaths from 'env-paths';
import { ensureDirSync } from 'fs-extra';

const paths = envPaths('focus-cli', { suffix: '' });
const dbPath = join(paths.data, 'focus-cli.db');

ensureDirSync(paths.data);

// Custom error class
export class FocusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FocusError';
  }
}

export class FocusDatabase {
  private db: InstanceType<typeof Database>; // Corrected line

  constructor() {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createSessionsTable();
  }

  private createSessionsTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        stop_time TEXT,
        duration INTEGER
      )
    `;
    this.db.exec(createTableSQL);
  }

  createSession(id: string, startTime: string) {
    const insertSQL = `INSERT INTO sessions (id, start_time) VALUES (?, ?)`;
    this.db.prepare(insertSQL).run(id, startTime);
  }

  getSession(id: string): Session | undefined {
    const selectSQL = `SELECT * FROM sessions WHERE id LIKE ? || '%'`;
    return this.db.prepare(selectSQL).get(id) as Session | undefined;
  }

  getOpenSession(): Session | undefined {
    const selectSQL = `SELECT * FROM sessions WHERE stop_time IS NULL`;
    return this.db.prepare(selectSQL).get() as Session | undefined;
  }

  stopSession(id: string, stopTime: string, duration: number) {
    const updateSQL = `UPDATE sessions SET stop_time = ?, duration = ? WHERE id = ?`;
    this.db.prepare(updateSQL).run(stopTime, duration, id);
  }
    getSessions(sort?: string): Session[] {
      let selectSQL = `SELECT * FROM sessions`;

      const sortSchema = z.string().regex(/^(date|duration)(:(asc|desc))?$/).optional();

      if (sort) {
          sortSchema.parse(sort); // No need to check the result, just parse

        const [field, order] = sort.split(':');
        const sortBy = field;
        const sortOrder = order || 'desc'; // Default to descending

        const validSortFields = ['date', 'duration'];
        if (!validSortFields.includes(sortBy)) {
          throw new FocusError(`Invalid sort field: ${sortBy}`); // Use FocusError
        }

        const sortColumn = sortBy === 'date' ? 'start_time' : sortBy;
        const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

        selectSQL += ` ORDER BY ${sortColumn} ${orderDirection}`;
      } else {
        selectSQL += ` ORDER BY start_time DESC`; // Default sort
      }

      return this.db.prepare(selectSQL).all() as Session[];
    }
  getSummary() {
    const summarySQL = `
      SELECT
        ROW_NUMBER() OVER () AS SL,
        DATE(start_time) AS Date,
        strftime('%H:%M', AVG(duration), 'unixepoch') AS Average,
        strftime('%H:%M', SUM(duration), 'unixepoch') AS Total,
        CASE
          WHEN SUM(duration) >= 28800 THEN '✅'
          ELSE '❌'
        END AS Status
      FROM sessions
      WHERE stop_time IS NOT NULL
      GROUP BY DATE(start_time)
      ORDER BY Date DESC;
    `;
    return this.db.prepare(summarySQL).all() as SummaryRow[];
  }

  getOverlappingSessions(startTime: string, stopTime: string): Session[] {
        const selectSQL = `
            SELECT * FROM sessions
            WHERE (start_time < ? AND stop_time > ?)
            OR (start_time > ? AND start_time < ?)
            OR (stop_time > ? AND stop_time < ?)
        `;
        return this.db.prepare(selectSQL).all(stopTime, startTime, startTime, stopTime, startTime, stopTime) as Session[];
    }

  deleteSession(id: string): void {
    const deleteSQL = `DELETE FROM sessions WHERE id LIKE ? || '%'`;
    const result = this.db.prepare(deleteSQL).run(id);
    if (result.changes === 0) {
      throw new FocusError('No session found with that ID.'); // Use FocusError
    }
  }

  close() {
    this.db.close();
  }
}