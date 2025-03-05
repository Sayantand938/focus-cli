// src/commands/list.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase, FocusError } from '../utils/database.js';
import { Session } from '../utils/types.js';
import { z } from 'zod';
import Table from 'cli-table3';
import chalk from 'chalk';
import { formatDate, getDurationParts, formatDurationParts } from '../utils/formatting.js';
import { parseDurationStringToSeconds } from '../utils/duration-parser.js';

// Zod schema for the filter flag
const filterSchema = z.object({
    field: z.literal('duration'),  // Only allow 'duration' for now.
    operator: z.enum(['>=', '<=', '=', '>', '<']), // Supported operators
    value: z.string().refine(value => {
        try {
          parseDurationStringToSeconds(value); // Check if we can parse the duration.
          return true;
        } catch {
          return false
        }
    }, { message: "Invalid duration format.  Examples: 1h, 30m, 1h30m" })
});

export default class List extends Command {
  static description = 'Shows all sessions in a table (formatted times, shortened UUIDs)';

  static examples = [
      `$ focus list`,
      `$ focus list --sort=date:asc`,
      `$ focus list --filter="duration>=1h"`, // Example with filter
      `$ focus list --filter="duration<=30m"`
  ];

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
    filter: Flags.string({
        char: 'f',
        description: 'Filter sessions (e.g., duration>=1h30m)',
        parse: async (input) => {
            try {
                const match = input.match(/^(duration)\s*([>=<!]=?)\s*(.+)$/);
                if (!match) {
                    throw new FocusError("Invalid filter format");
                }
                const [, field, operator, value] = match;

                const parsedFilter = filterSchema.parse({ field, operator, value });
                return input;
            } catch (error) {
                if (error instanceof z.ZodError) {
                    throw new FocusError(error.errors.map((e) => e.message).join('\n'));
                } else if (error instanceof FocusError) {
                    throw error;
                } else if (error instanceof Error) { // Check if it's an Error object
                    throw new FocusError(`Invalid filter: ${error.message}`);
                } else {
                    // Handle cases where it's not an Error object (very unlikely, but good practice)
                    throw new FocusError(`Invalid filter: An unexpected error occurred.`);
                }
            }
        }
    })
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(List);
    const { sort, filter } = flags;
    const db = new FocusDatabase();

    try {
        let parsedFilter = undefined;

        if(filter){
            const match = filter.match(/^(duration)\s*([>=<!]=?)\s*(.+)$/);
            if(match) {
              const [, field, operator, valueString] = match;
              const value = parseDurationStringToSeconds(valueString);
              parsedFilter = { field, operator, value };
            }
        }


      const sessions: Session[] = db.getSessions(sort, parsedFilter);  // Pass filter to getSessions

      if (sessions.length === 0) {
        this.log('No sessions found.');
        return;
      }

      const table = new Table({
        head: [
          chalk.blue.bold('ID'),
          chalk.blue.bold('Date'),
          chalk.blue.bold('Start Time'),
          chalk.blue.bold('Stop Time'),
          chalk.blue.bold('Duration')
        ],
        colAligns: ['center', 'center', 'center', 'center', 'center'],
        colWidths: [10, 12, 12, 12, 10],
        style: {
          head: [], // Remove default head style
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
          chalk.dim(session.id.substring(0, 8)),
          formatDate(new Date(session.start_time), 'yyyy-MM-dd'),
          formatDate(new Date(session.start_time), 'hh:mm a'),
          session.stop_time ? formatDate(new Date(session.stop_time), 'hh:mm a') : chalk.gray('N/A'),
          duration,
        ]);
      }

      this.log(''); // Blank line before
      this.log(table.toString());
      this.log(''); // Blank line after
    } catch (error) {
      if(error instanceof FocusError){
        this.error(error.message);
      } else if (error instanceof Error){
        this.error(`Error: ${error.message}`);
      } else {
        this.error(`An unexpected error occurred.`);
      }
    } finally {
      db.close();
    }
  }
}