// src/commands/summary.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { SummaryRow } from '../utils/types.js';
import Table from 'cli-table3';
import chalk from 'chalk';
import { z } from 'zod';

export default class Summary extends Command {
  static description = 'Shows total & average focus time per day with ✅ or ❌';
  static flags = {
    sort: Flags.string({
      char: 's',
      description: 'Sort by total, average, or date (e.g., total:asc, date:desc)',
      options: ['total:asc', 'total:desc', 'average:asc', 'average:desc', 'date:asc', 'date:desc'],
      parse: async (input: string) => {
        const sortSchema = z.string().regex(/^(total|average|date)(:(asc|desc))?$/);
        try {
          sortSchema.parse(input);
          return input;
        } catch (error: any) {
          throw new Error('Invalid sort format. Use total:asc, date:desc, average:asc, or total/date/average.');
        }
      },
    }),
  };

  static examples = [
    `$ focus summary`,
    `$ focus summary --sort total:asc`,
    `$ focus summary --sort date:desc`,
  ];

  async run(): Promise<void> {
    const { flags } = await this.parse(Summary);
    const { sort } = flags;
    const db = new FocusDatabase();

    try {
      const summaryData: SummaryRow[] = db.getSummary(sort);

      if (summaryData.length === 0) {
        this.log('No sessions found.');
        return;
      }

      const table = new Table({
        head: [
          chalk.blue.bold('SL'),
          chalk.blue.bold('Date'),
          chalk.blue.bold('Average'),
          chalk.blue.bold('Total'),
          chalk.blue.bold('Status')
        ],
        colAligns: ['center', 'center', 'center', 'center', 'center'],
        colWidths: [5, 12, 10, 10, 8],
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

      summaryData.forEach((row: SummaryRow) => {
        table.push([
          row.SL,
          row.Date,
          row.Average,
          row.Total,
          row.Status,
        ]);
      });

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