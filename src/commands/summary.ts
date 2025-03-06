// src/commands/summary.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { parseSortString, SortFlag, SortOption } from '../utils/sort-utils.js';
import { FocusError } from '../utils/error-utils.js';
import { generateAndDisplayTable } from '../utils/table-utils.js';
import { parseDurationStringToSeconds } from '../utils/duration-parser.js';
import { parseFilterString, summaryFilterSchema, FilterOption, parseAndValidateFilter } from '../utils/filter-utils.js'; // Import from filter-utils

interface SummaryFlags {
  sort: SortOption;
  filter: string | undefined;
}

export default class Summary extends Command {
    static description = 'Shows total & average focus time per day with ✅ or ❌';
    static flags = {
      sort: SortFlag({
        char: 's',
        description: 'Sort by total, average, or date (e.g., total:asc, date:desc)',
      }),
      filter: Flags.string({
        char: 'f',
        description: 'Filter summary (e.g., total>=1h, average<=30m)',
        parse: async (input) => parseFilterString(input, summaryFilterSchema),  // Use parseFilterString
      })
    };

    static examples = [
      `$ focus summary`,
      `$ focus summary --sort total:asc`,
      `$ focus summary --sort date:desc`,
      `$ focus summary --filter="total>=2h"`,
      `$ focus summary --filter="average<=45m"`,
    ];

    async run(): Promise<void> {
      const {flags} = await this.parse(Summary);
      const {sort, filter} = flags as SummaryFlags;
      const db = new FocusDatabase();

      try {
          let parsedFilter: FilterOption = undefined;
          if(filter) {
            parsedFilter = parseAndValidateFilter(filter, summaryFilterSchema);
          }
        const summaryData = db.getSummary(sort, parsedFilter);

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