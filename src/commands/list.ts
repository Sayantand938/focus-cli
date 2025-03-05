// src/commands/list.ts
import { Command, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js'; // Corrected import
import { z } from 'zod';
import { parseDurationStringToSeconds } from '../utils/duration-parser.js';
import { parseSortString, SortFlag, SortOption } from '../utils/sort-utils.js'; // Import SortFlag
import { generateAndDisplayTable } from '../utils/table-utils.js';

const filterSchema = z.object({
    field: z.literal('duration'),
    operator: z.enum(['>=', '<=', '=', '>', '<']),
    value: z.string().refine(value => {
        try {
            parseDurationStringToSeconds(value);
            return true;
        } catch {
            return false;
        }
    }, { message: "Invalid duration format.  Examples: 1h, 30m, 1h30m" })
});

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
        sort: SortFlag({  // Use the custom SortFlag
            char: 's',
            description: 'Sort by date or duration (e.g., date:asc, duration:desc)',
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
                    return input; // Return the *original* input string, not the parsed object
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        throw new FocusError(error.errors.map((e) => e.message).join('\n'));
                    } else if (error instanceof FocusError) {
                        throw error;
                    } else if (error instanceof Error) {
                        throw new FocusError(`Invalid filter: ${error.message}`);
                    } else {
                        throw new FocusError(`Invalid filter: An unexpected error occurred.`);
                    }
                }
            }
        })
    };

    async run(): Promise<void> {
        const { flags } = await this.parse(List);
        const { sort, filter } = flags as ListFlags; // Cast to the ListFlags interface
        const db = new FocusDatabase();

        try {
            let parsedFilter = undefined;

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