// src/commands/summary.ts

import chalk from 'chalk';
import {
  getDatabasePath,
  getAllSessions,
  calculateSummary,
} from '../lib/db.js';
import { executeDbCommand, createStyledTable } from '../lib/utils.js';

// Main summary command function
export async function summaryCommand() {
  const dbPath = getDatabasePath();

  await executeDbCommand(
    dbPath,
    (db) => {
      const sessions = getAllSessions(db);
      const summaryData = calculateSummary(sessions, 'date', 'asc');
      displaySummaryTable(summaryData);
    },
    'Failed to display the summary.'
  );
}

// Module: Display the summary in a formatted table or handle empty data
function displaySummaryTable(summaryData: any[]): void {
  if (summaryData.length > 0) {
    const table = createStyledTable(
      ['SL', 'Date', 'Avg Duration', 'Total Duration', 'Goal'],
      [6, 12, 16, 16, 8]
    );

    summaryData.forEach(({ sl, date, avgDuration, totalDuration, goal }) => {
      table.push([chalk.dim(sl), date, avgDuration, totalDuration, goal]);
    });

    console.log();
    console.log(table.toString());
    console.log();
  } else {
    console.log(chalk.yellow('No session data available.'));
  }
}
