#!/usr/bin/env node
// src/cli.ts

import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { summaryCommand } from './commands/summary.js';
import { addCommand } from './commands/add.js';
import { editCommand } from './commands/edit.js';

function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  } else {
    console.error('An unexpected error occurred.');
  }
  process.exit(1);
}

const program = new Command();

program
  .name('focus-cli')
  .description('A lightweight CLI tool to manage focus sessions')
  .version('1.0.0');

program
  .command('start')
  .description('Starts a new focus session')
  .action(startCommand);

program
  .command('stop')
  .description('Stops the current focus session')
  .action(stopCommand);

program
  .command('add <timeRange>')
  .description(
    'Add a new session with a specified time range (e.g., "08:00 AM - 10:00 AM")'
  )
  .action(addCommand);

program
  .command('edit <shortId>')
  .description('Edit an existing session by its first 8 characters of the ID')
  .option('--startTime <time>', 'Update the start time (e.g., "02:00 AM")')
  .option('--endTime <time>', 'Update the end time (e.g., "04:00 PM")')
  .option('--date <date>', 'Update the session date (e.g., "2025-03-12")')
  .action(editCommand);

program
  .command('list')
  .description('List all focus sessions')
  .action(listCommand);

program
  .command('delete <shortId>')
  .description('Delete a session by its first 8 characters of the ID')
  .action(deleteCommand);

program
  .command('summary')
  .description('Display a summary of all sessions')
  .action(summaryCommand);

program.parse(process.argv);
