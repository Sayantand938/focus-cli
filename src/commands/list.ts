// src/commands/list.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { parseDurationStringToSeconds } from '../utils/duration-parser.js';
import { parseSortString, SortFlag, SortOption } from '../utils/sort-utils.js';
import { generateAndDisplayTable } from '../utils/table-utils.js';
import { parseFilterString, sessionFilterSchema, FilterOption } from '../utils/filter-utils.js'; // Import from filter-utils


interface ListFlags {
    sort: SortOption;
    filter: string | undefined;
}
export default class List extends Command {
    static description = 'Shows all sessions in a table (formatted times, shortened UUIDs)';

    static examples = [
        `$ focus list`,
        `$ focus list --sort=date:asc`,
        `$ focus list --filter="duration>=1h"`,
        `$ focus list --filter="duration<=30m"`
    ];

    static flags = {
        sort: SortFlag({
            char: 's',
            description: 'Sort by date or duration (e.g., date:asc, duration:desc)',
        }),
        filter: Flags.string({
            char: 'f',
            description: 'Filter sessions (e.g., duration>=1h30m)',
            parse: async (input) => parseFilterString(input, sessionFilterSchema), // Use parseFilterString
        })
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(List);
        const { sort, filter } = flags as ListFlags;
        const db = new FocusDatabase();

        try {
            let parsedFilter: FilterOption = undefined;

            if (filter) {
                const match = filter.match(/^(duration)\s*([>=<!]=?)\s*(.+)$/);
                if (match) {
                    const [, field, operator, valueString] = match;
                    const value = parseDurationStringToSeconds(valueString);
                    parsedFilter = { field, operator, value };
                }
            }

            const sessions = db.getSessions(sort, parsedFilter);

            if (sessions.length === 0) {
                this.log('No sessions found.');
                return;
            }
            generateAndDisplayTable(this, sessions, 'sessions');

        } catch (error) {
            if (error instanceof FocusError) {
                this.error(error.message);
            } else if (error instanceof Error) {
                this.error(`Error: ${error.message}`);
            } else {
                this.error(`An unexpected error occurred.`);
            }
        } finally {
            db.close();
        }
    }
}