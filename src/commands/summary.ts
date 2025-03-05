import { Command } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { Session, SummaryRow } from '../utils/types.js';
import { format } from 'date-fns';
import Table from 'cli-table3';
import chalk from 'chalk';

export default class Summary extends Command {
  static description = 'Shows total & average focus time per day with ✅ or ❌';

  static examples = [`$ focus summary`];

  async run(): Promise<void> {
    const db = new FocusDatabase();

    try {
      const summaryData: SummaryRow[] = db.getSummary();

      if (summaryData.length === 0) {
        this.log('No sessions found.');
        return;
      }

      const table = new Table({
        head: [
          chalk.blue.bold('SL'),      // Bold blue headers
          chalk.blue.bold('Date'),
          chalk.blue.bold('Average'),
          chalk.blue.bold('Total'),
          chalk.blue.bold('Status')
        ],
        colAligns: ['center', 'center', 'center', 'center', 'center'],
        colWidths: [5, 12, 10, 10, 8],
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