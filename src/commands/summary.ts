// src/commands/summary.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { parseSortString, SortFlag, SortOption } from '../utils/sort-utils.js'; // Import SortFlag
import { FocusError } from '../utils/error-utils.js';
import { generateAndDisplayTable } from '../utils/table-utils.js';

interface SummaryFlags {
  sort: SortOption;
}

export default class Summary extends Command {
    static description = 'Shows total & average focus time per day with ✅ or ❌';
    static flags = {
      sort: SortFlag({ // Use the custom SortFlag
        char: 's',
        description: 'Sort by total, average, or date (e.g., total:asc, date:desc)',
      }),
    };

    static examples = [
      `$ focus summary`,
      `$ focus summary --sort total:asc`,
      `$ focus summary --sort date:desc`,
    ];

    async run(): Promise<void> {
      const {flags} = await this.parse(Summary);
      const {sort} = flags as SummaryFlags; // Cast
      const db = new FocusDatabase();

      try {
        const summaryData = db.getSummary(sort);

        if (summaryData.length === 0) {
          this.log('No sessions found.');
          return;
        }
        generateAndDisplayTable(this, summaryData, 'summary');

      } catch (error: any) {
          if(error instanceof FocusError){
            this.error(error.message);
          } else {
            this.error(`Error: ${error.message}`);
          }
      } finally {
        db.close();
      }
    }
}