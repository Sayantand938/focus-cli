// src/commands/stop.ts
import {
  getDatabasePath,
  getLastActiveSession,
  stopSession,
} from '../lib/db.js';
import { executeDbCommand } from '../lib/utils.js';
import Database from 'better-sqlite3';
import type { Session } from '../lib/types.js'; // Import Session

export async function stopCommand() {
  const dbPath = getDatabasePath();
  await executeDbCommand(
    dbPath,
    (db) => {
      const lastSession = fetchLastActiveSession(db);
      if (!lastSession) {
        console.log('No active session found to stop.');
        return;
      }
      const duration = stopActiveSession(db, lastSession);
      logSessionStop(lastSession, duration);
    },
    'Failed to stop the session.'
  );
}

function fetchLastActiveSession(db: Database.Database): Session | null {
  return getLastActiveSession(db) || null;
}

function stopActiveSession(
  db: Database.Database,
  lastSession: Session
): number {
  return stopSession(db, lastSession);
}

function logSessionStop(lastSession: Session, duration: number): void {
  const endTime = new Date();
  const formattedTime = endTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  console.log(
    `✅ Focus session stopped at ${formattedTime} (Session ID: ${lastSession.id.substring(0, 8)})`
  );
  console.log(`⏳ Duration: ${duration} seconds`);
}
