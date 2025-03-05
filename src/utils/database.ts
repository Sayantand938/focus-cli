import Database from 'better-sqlite3';
import { Session, SummaryRow } from './types.js';
import { join } from 'path';
import envPaths from 'env-paths';
import { ensureDirSync } from 'fs-extra';

const paths = envPaths('focus-cli', { suffix: '' });
const dbPath = join(paths.data, 'focus-cli.db');

ensureDirSync(paths.data);

export class FocusDatabase {
  private db: InstanceType<typeof Database>; // Extract the type of the Database instance

  constructor() {
    this.db = new Database(dbPath); // Create an instance of the Database
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
    const insertSQL = `
      INSERT INTO sessions (id, start_time) VALUES (?, ?)
    `;
    this.db.prepare(insertSQL).run(id, startTime);
  }

  getSession(id: string): Session | undefined {
    const selectSQL = `
      SELECT * FROM sessions WHERE id LIKE ? || '%'
    `;
    return this.db.prepare(selectSQL).get(id) as Session | undefined;
  }

  getOpenSession(): Session | undefined {
    const selectSQL = `
      SELECT * FROM sessions WHERE stop_time IS NULL
    `;
    return this.db.prepare(selectSQL).get() as Session | undefined;
  }

  stopSession(id: string, stopTime: string, duration: number) {
    const updateSQL = `
      UPDATE sessions SET stop_time = ?, duration = ? WHERE id LIKE ? || '%'
    `;
    this.db.prepare(updateSQL).run(stopTime, duration, id);
  }

  close() {
    this.db.close();
  }

  getSessions(): Session[] {
    const selectSQL = `
      SELECT * FROM sessions
    `;
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
      WHERE (start_time <= ? AND (stop_time IS NULL OR stop_time >= ?))
         OR (start_time >= ? AND stop_time <= ?)
         OR (start_time <= ? AND (stop_time IS NULL OR stop_time >= ?)) AND start_time >= ? AND stop_time <= ?
    `;
    return this.db.prepare(selectSQL).all(startTime, stopTime, startTime, stopTime, startTime, stopTime, startTime, stopTime) as Session[];
  }

  deleteSession(id: string): string | undefined {
    const deleteSQL = `
      DELETE FROM sessions
      WHERE id LIKE ? || '%'
      RETURNING id;
    `;
    const result = this.db.prepare(deleteSQL).get(id) as { id: string } | undefined;
    if (!result) {
      throw new Error('NotFoundError');
    }
    return result.id;
  }
}