// src/commands/start.ts
import {
  getDatabasePath,
  initializeDatabase,
  getLastActiveSession,
  startSession,
} from '../lib/db.js';
import { executeDbCommand } from '../lib/utils.js';
import Database from 'better-sqlite3'; // Import for types

export async function startCommand() {
  const dbPath = getDatabasePath();
  await initializeDatabase(dbPath); // Initialize outside executeDbCommand

  await executeDbCommand(
    dbPath,
    (db) => {
      const activeSession = checkForActiveSession(db);
      if (activeSession) {
        console.log('An active session is already running.');
        return;
      }
      const sessionId = startNewSession(db);
      logSessionStart(sessionId);
    },
    'Failed to start the session.'
  );
}

function checkForActiveSession(db: Database.Database): boolean {
  const activeSession = getLastActiveSession(db);
  return !!activeSession;
}

function startNewSession(db: Database.Database): string {
  return startSession(db);
}

function logSessionStart(sessionId: string): void {
  const startTime = new Date();
  const formattedTime = startTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  console.log(
    `✅ Focus session started at ${formattedTime} (Session ID: ${sessionId.substring(0, 8)})`
  );
}
