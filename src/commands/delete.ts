// src/commands/delete.ts

import {
  getDatabasePath,
  findSessionsByPartialId,
  deleteSessionById,
} from '../lib/db.js';
import { executeDbCommand } from '../lib/utils.js';
import Database from 'better-sqlite3';
import chalk from 'chalk';

export async function deleteCommand(shortId: string) {
  const dbPath = getDatabasePath();

  await executeDbCommand(
    dbPath,
    (db) => {
      validatePartialId(shortId);
      const matchingSessionIds = findMatchingSessions(db, shortId);
      handleSessionDeletion(db, matchingSessionIds, shortId);
    },
    'Failed to delete the session.'
  );
}

function validatePartialId(shortId: string): void {
  if (!shortId || shortId.length !== 8) {
    throw new Error(
      'Invalid partial ID. It must be exactly 8 characters long.'
    );
  }
}

function findMatchingSessions(
  db: Database.Database,
  shortId: string
): string[] {
  return findSessionsByPartialId(db, shortId);
}

function handleSessionDeletion(
  db: Database.Database,
  matchingSessionIds: string[],
  shortId: string
): void {
  if (matchingSessionIds.length === 0) {
    console.log(
      chalk.yellow(`No session found with ID starting with '${shortId}'.`)
    );
  } else if (matchingSessionIds.length > 1) {
    console.log(
      chalk.yellow(
        `Multiple sessions found with ID starting with '${shortId}'. Please use the full ID.`
      )
    );
  } else {
    deleteSessionById(db, matchingSessionIds[0]);
    console.log(
      chalk.green(`✅ Successfully deleted session: ${matchingSessionIds[0]}`)
    );
  }
}
