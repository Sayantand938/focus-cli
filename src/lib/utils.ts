// src/lib/utils.ts
import Database from 'better-sqlite3';
import chalk from 'chalk';
import { parse, isValid } from 'date-fns';
import Table from 'cli-table3';

export function parseTimeString(timeString: string, baseDate: Date): Date {
  try {
    const parsedTime = parse(timeString, 'hh:mm a', baseDate);
    if (!isValid(parsedTime)) {
      throw new Error(`Invalid time format: ${timeString}`);
    }
    return parsedTime;
  } catch (error) {
    throw new Error(`Failed to parse the time string: ${timeString}`);
  }
}

export function formatDuration(durationInSeconds: number | null): string {
  if (durationInSeconds === null) return 'N/A';

  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export async function executeDbCommand<T>(
  dbPath: string,
  command: (db: Database.Database) => T,
  errorMessage: string
): Promise<T | void> {
  // Change the return type here
  let db: Database.Database | undefined;
  try {
    db = new Database(dbPath);
    return command(db);
  } catch (error) {
    handleError(error, errorMessage);
    throw error;
  } finally {
    if (db) {
      db.close();
    }
  }
}

// Module: Centralized error handling - Keep consistent with other files
export function handleError(error: unknown, message: string): never {
  if (error instanceof Error) {
    console.error(chalk.red(`${message}: ${error.message}`));
  } else {
    console.error(chalk.red(`${message}: An unexpected error occurred.`));
  }
  process.exit(1); // Exit with a non-zero status code
}

export function createStyledTable(
  head: string[],
  colWidths?: number[]
): Table.Table {
  const tableOptions: Table.TableConstructorOptions = {
    style: { head: [], border: [] },
    chars: {
      top: '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      bottom: '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      left: '║',
      right: '║',
      'left-mid': '╟',
      'mid-mid': '┼',
      'right-mid': '╢',
      middle: '│',
    },
    head: head.map((h) => chalk.blue.bold(h)),
  };

  if (colWidths) tableOptions.colWidths = colWidths;

  return new Table(tableOptions);
}
