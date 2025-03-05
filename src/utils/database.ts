// src/utils/database.ts
import Database from 'better-sqlite3';
import { Session, SummaryRow } from './types.js';
import { join } from 'path';
import { z } from 'zod';
import envPaths from 'env-paths';
import { ensureDirSync } from 'fs-extra';
import { FocusError } from './error-utils.js'; // Import FocusError
import { SortOption, getOrderByClause } from './sort-utils.js';

const paths = envPaths('focus-cli', { suffix: '' });
const dbPath = join(paths.data, 'focus-cli.db');

ensureDirSync(paths.data);

export class FocusDatabase {
    private db: InstanceType<typeof Database>;

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
    getSessions(sortOption: SortOption, filter?: { field: string; operator: string; value: number }): Session[] {
        let selectSQL = `SELECT * FROM sessions`;

        // Add WHERE clause if filter is provided
        if (filter) {
            selectSQL += ` WHERE ${filter.field} ${filter.operator} ?`;
        }

        selectSQL += ` ${getOrderByClause(sortOption, 'sessions')}`;

        // Prepare and execute the query, binding the filter value if it exists
        const stmt = this.db.prepare(selectSQL);
        const result = filter ? stmt.all(filter.value) : stmt.all();
        return result as Session[];
    }
    getSummary(sortOption: SortOption): SummaryRow[] {
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

        summarySQL += ` ${getOrderByClause(sortOption, 'summary')}`;

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