import { Command } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { Session } from '../utils/types.js';
import { format } from 'date-fns';
import Table from 'cli-table3';
import chalk from 'chalk';

export default class List extends Command {
  static description = 'Shows all sessions in a table (formatted times, shortened UUIDs)';

  static examples = [`$ focus list`];

  async run(): Promise<void> {
    const db = new FocusDatabase();

    try {
      const sessions: Session[] = db.getSessions();

      if (sessions.length === 0) {
        this.log('No sessions found.');
        return;
      }

      const table = new Table({
        head: [
          chalk.blue.bold('ID'),      // Bold blue headers
          chalk.blue.bold('Date'),
          chalk.blue.bold('Start Time'),
          chalk.blue.bold('Stop Time'),
          chalk.blue.bold('Duration')
        ],
        colAligns: ['center', 'center', 'center', 'center', 'center'],
        colWidths: [10, 12, 12, 12, 10],
        style: {
          head: [], // Remove default head style (we're using chalk)
          border: ['#888888'],
          compact: false,
        }
      });
      // chars option is necessary when you use custom border
      table.options.chars = {
        'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
        , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝'
        , 'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼'
        , 'right': '║' , 'right-mid': '╢' , 'middle': '│'
      }

      for (const session of sessions) {
        const hours = session.duration ? Math.floor(session.duration / 3600) : 0;
        const minutes = session.duration ? Math.floor((session.duration % 3600) / 60) : 0;
        const duration = session.duration
          ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
          : '';

        table.push([
          chalk.dim(session.id.substring(0, 8)), // Dimmed ID
          format(new Date(session.start_time), 'yyyy-MM-dd'),
          format(new Date(session.start_time), 'hh:mm a'),
          session.stop_time ? format(new Date(session.stop_time), 'hh:mm a') : chalk.gray('N/A'),
          duration,
        ]);
      }

      this.log(''); // Blank line before
      this.log(table.toString());
      this.log(''); // Blank line after
    } catch (error: any) {
      this.error(`Error: ${error.message}`);
    } finally {
      db.close();
    }
  }
}