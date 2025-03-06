// src/utils/database.ts
import Database from 'better-sqlite3';
import { join } from 'path';
import envPaths from 'env-paths';
import { ensureDirSync } from 'fs-extra';
import { FocusError } from './error-utils.js';
import {
  FilterOption,
  getWhereClause,
  getHavingClause,
} from './filter-utils.js';
import {
  SortOption,
  getOrderByClause,
} from './sort-utils.js'; // Import SortOption and getOrderByClause from sort-utils
import { ListTable, SummaryTable } from './types.js';

export class FocusDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || this.getDatabasePath();
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.createSessionsTable();
  }

  private getDatabasePath(): string {
    const paths = envPaths('focus-cli', { suffix: '' });
    const dbPath = join(paths.data, 'focus-cli.db');
    ensureDirSync(paths.data);
    return dbPath;
  }

  private createSessionsTable(): void {
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

  createSession(id: string, startTime: string): void {
    const insertSQL = `INSERT INTO sessions (id, start_time) VALUES (?, ?)`;
    this.db.prepare(insertSQL).run(id, startTime);
  }

  getSession(id: string): ListTable | undefined {
    const selectSQL = `SELECT * FROM sessions WHERE id LIKE ? || '%'`;
    return this.db.prepare(selectSQL).get(id) as ListTable | undefined;
  }

  getOpenSession(): ListTable | undefined {
    const selectSQL = `SELECT * FROM sessions WHERE stop_time IS NULL`;
    return this.db.prepare(selectSQL).get() as ListTable | undefined;
  }

  stopSession(id: string, stopTime: string, duration: number): void {
    const updateSQL = `UPDATE sessions SET stop_time = ?, duration = ? WHERE id = ?`;
    this.db.prepare(updateSQL).run(stopTime, duration, id);
  }

  getSessions(sortOption: SortOption, filter?: FilterOption): ListTable[] {
    let selectSQL = `SELECT * FROM sessions`;
    selectSQL += ` ${getWhereClause(filter)}`;
    selectSQL += ` ${getOrderByClause(sortOption, 'sessions')}`;

    const stmt = this.db.prepare(selectSQL);
    const result = filter ? stmt.all(filter.value) : stmt.all();
    return result as ListTable[];
  }

  getSummary(sortOption: SortOption, filter?: FilterOption): SummaryTable[] {
    let summarySQL = `
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
    `;

    summarySQL += ` ${getHavingClause(filter)}`;
    summarySQL += ` ${getOrderByClause(sortOption, 'summary')}`;

    const stmt = this.db.prepare(summarySQL);
    const result = filter ? stmt.all(filter.value) : stmt.all();
    return result as SummaryTable[];
  }

  getOverlappingSessions(startTime: string, stopTime: string): ListTable[] {
    const selectSQL = `
      SELECT * FROM sessions
      WHERE (start_time < ? AND stop_time > ?)
         OR (start_time > ? AND start_time < ?)
         OR (stop_time > ? AND stop_time < ?)
    `;
    return this.db
      .prepare(selectSQL)
      .all(stopTime, startTime, startTime, stopTime, startTime, stopTime) as ListTable[];
  }

  getOverlappingSessionsWithStartTime(startTime: string): ListTable[] {
    const selectSQL = `SELECT * FROM sessions WHERE start_time = ?`;
    return this.db.prepare(selectSQL).all(startTime) as ListTable[];
  }

  updateDuration(id: string, duration: number): void {
    const updateSQL = `UPDATE sessions SET duration = ? WHERE id = ?`;
    this.db.prepare(updateSQL).run(duration, id);
  }

  updateSession(id: string, startTime?: string, stopTime?: string): void {
    let updateSQL = `UPDATE sessions SET `;
    const params: (string | number)[] = [];

    if (startTime) {
      updateSQL += `start_time = ?, `;
      params.push(startTime);
    }
    if (stopTime) {
      updateSQL += `stop_time = ?, `;
      params.push(stopTime);
    }

    updateSQL = updateSQL.slice(0, -2); // Remove trailing comma and space
    updateSQL += ` WHERE id = ?`;
    params.push(id);

    this.db.prepare(updateSQL).run(...params);
  }

  deleteSession(id: string): void {
    const deleteSQL = `DELETE FROM sessions WHERE id LIKE ? || '%'`;
    const result = this.db.prepare(deleteSQL).run(id);
    if (result.changes === 0) {
      throw new FocusError('No session found with that ID.');
    }
  }

  close(): void {
    this.db.close();
  }
}