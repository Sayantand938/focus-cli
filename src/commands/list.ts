import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { Session } from '../utils/types.js';
import { z } from 'zod';
import Table from 'cli-table3';
import chalk from 'chalk';
import { formatDate, getDurationParts, formatDurationParts } from '../utils/formatting.js';

export default class List extends Command {
  static description = 'Shows all sessions in a table (formatted times, shortened UUIDs)';

  static examples = [`$ focus list`];

  static flags = {
    sort: Flags.string({
      char: 's',
      description: 'Sort by date or duration (e.g., date:asc, duration:desc)',
      parse: async (input: string) => {
        const sortSchema = z.string().regex(/^(date|duration)(:(asc|desc))?$/);
        try {
          sortSchema.parse(input);
          return input;
        } catch (error: any) {
          throw new Error('Invalid sort format. Use date:asc, duration:desc, or date/duration.');
        }
      },
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(List);
    const { sort } = flags;
    const db = new FocusDatabase();

    try {
      const sessions: Session[] = db.getSessions(sort);

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
        const { hours, minutes } = getDurationParts(session.duration);
        const duration = session.duration
          ? formatDurationParts(hours, minutes)
          : '';

        table.push([
          chalk.dim(session.id.substring(0, 8)), // Dimmed ID
          formatDate(new Date(session.start_time), 'yyyy-MM-dd'),
          formatDate(new Date(session.start_time), 'hh:mm a'),
          session.stop_time ? formatDate(new Date(session.stop_time), 'hh:mm a') : chalk.gray('N/A'),
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