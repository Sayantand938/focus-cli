// src/commands/list.ts
import { getDatabasePath, getFormattedSessions } from '../lib/db.js';
import { executeDbCommand, createStyledTable } from '../lib/utils.js';
import chalk from 'chalk';

export async function listCommand() {
  const dbPath = getDatabasePath();

  await executeDbCommand(
    dbPath,
    (db) => {
      const sessions = getFormattedSessions(db);
      displaySessionsTable(sessions);
    },
    'Failed to list sessions.'
  );
}

function displaySessionsTable(
  sessions: {
    id: string;
    date: string;
    startTime: string;
    endTime: string | null;
    duration: string;
  }[]
): void {
  console.log();
  if (sessions.length > 0) {
    const table = createStyledTable(
      ['ID', 'Date', 'Start Time', 'End Time', 'Duration'],
      [12, 12, 12, 12, 12]
    );
    sessions.forEach((session) => {
      table.push([
        chalk.dim(session.id),
        session.date,
        session.startTime,
        session.endTime,
        session.duration,
      ]);
    });

    console.log(table.toString());
  } else {
    console.log(chalk.yellow('No sessions found.'));
  }

  console.log();
}
