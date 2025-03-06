// src/commands/edit.ts
import { Command, Args, Flags } from '@oclif/core';
import { FocusDatabase } from '../utils/database.js';
import { FocusError } from '../utils/error-utils.js';
import { formatDate, parseTimeStringToDate } from '../utils/formatting-utils.js';
import { isValid, parse, parseISO } from 'date-fns';
import { z } from 'zod';

const timeSchema = z.string()
    .regex(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i, 'Invalid time format. Please use "HH:MM AM/PM"')
    .transform((timeString: string): Date => {
        return parseTimeStringToDate(timeString);
    });

const dateSchema = z.string()
    .refine(str => isValid(parse(str, 'yyyy-MM-dd', new Date())), {
        message: 'Invalid date format.  Please use yyyy-MM-dd',
    });
export default class Edit extends Command {
    static description = 'Edits an existing focus session.';

    static examples = [
        `$ focus edit 2e54ebd4 --start_time "12:20 AM"`,
        `$ focus edit 2e54ebd4 --stop_time "02:00 PM"`,
        `$ focus edit 2e54ebd4 --date 2024-03-15 --start_time "09:00 AM" --stop_time "10:30 AM"`,
        `$ focus edit 2e54ebd4 --date 2024-03-10`,
    ];

    static args = {
        id: Args.string({ description: 'First 8 characters of the session ID', required: true }),
    };

    static flags = {
        start_time: Flags.string({
            description: 'New start time in HH:MM AM/PM format',
            exclusive: ['date']

        }),
        stop_time: Flags.string({
            description: 'New stop time in HH:MM AM/PM format',
            exclusive: ['date']
        }),
        date: Flags.string({
            description: 'New date in yyyy-MM-dd format',
        }),
    };

    async run(): Promise<void> {
        const { args, flags } = await this.parse(Edit);
        const db = new FocusDatabase();

        try {
            const session = db.getSession(args.id);
            if (!session) {
                throw new FocusError(`Session with ID ${args.id}... not found.`);
            }

            let newStartTime: Date | undefined;
            let newStopTime: Date | undefined;
            let newDate: string | undefined = flags.date;
            let startTimeISO: string | undefined;
            let stopTimeISO: string | undefined;


            // Validate and parse Date
            if(flags.date){
                try {
                    dateSchema.parse(flags.date);
                    newDate = flags.date;
                } catch (error: any) {
                    if (error instanceof z.ZodError) {
                        this.error(error.errors.map((e) => e.message).join('\n'));
                    } else {
                        this.error(`Failed to parse date: ${error.message}`);
                    }
                    return; // Exit after error
                }
            }

            // Validate and parse Start Time
            if (flags.start_time) {
                try {
                    newStartTime = timeSchema.parse(flags.start_time);
                } catch (error: any) {
                    if (error instanceof z.ZodError) {
                        this.error(error.errors.map((e) => e.message).join('\n'));
                    }  else {
                        this.error(`Failed to parse start time: ${error.message}`);
                    }
                    return; // Exit after error
                }
            }
            // Validate and parse Stop Time
            if (flags.stop_time) {
                try {
                    newStopTime = timeSchema.parse(flags.stop_time);
                } catch (error: any) {
                    if (error instanceof z.ZodError) {
                        this.error(error.errors.map((e) => e.message).join('\n'));
                    } else {
                        this.error(`Failed to parse stop time: ${error.message}`);
                    }
                    return; // Exit after error
                }
            }

            // if only date is changed
            if(newDate && !flags.start_time && !flags.stop_time) {
                const originalStartDate = parseISO(session.start_time);
                const combinedStartDateTime = new Date(
                    `${newDate}T${formatDate(originalStartDate, 'HH:mm:ss.SSSxxx')}`
                );
                startTimeISO = combinedStartDateTime.toISOString();

                if(session.stop_time) {
                    const originalStopDate = parseISO(session.stop_time);
                    const combinedStopDateTime = new Date(
                        `${newDate}T${formatDate(originalStopDate, 'HH:mm:ss.SSSxxx')}`
                    );

                    stopTimeISO = combinedStopDateTime.toISOString();
                    if(combinedStartDateTime >= combinedStopDateTime){
                        throw new FocusError('Start time must be before stop time.');
                    }
                }
            }

            // Combine date and time if the date is changed
            if(newDate && newStartTime) {
                const combinedStartDateTime = new Date(
                    `${newDate}T${formatDate(newStartTime, 'HH:mm:ss.SSSxxx')}`
                );
                startTimeISO = combinedStartDateTime.toISOString();
            }
            // start time change only
             else if (newStartTime) {
                const originalStartDate = parseISO(session.start_time); // Parse the original date
                startTimeISO = new Date(originalStartDate.getFullYear(), originalStartDate.getMonth(), originalStartDate.getDate(), newStartTime.getHours(), newStartTime.getMinutes()).toISOString();
            }

            // Combine date and time of the stop time if the date is changed
            if(newDate && newStopTime) {
                const combinedStopDateTime = new Date(
                    `${newDate}T${formatDate(newStopTime, 'HH:mm:ss.SSSxxx')}`
                );
                stopTimeISO = combinedStopDateTime.toISOString();
            }
            // stop time change only
            else if(newStopTime) {
                // if stop time given and session.stop_time is null throw error
                if(!session.stop_time) {
                    throw new FocusError(`Stop time cannot be set for the sessions which is not stopped yet`);
                }
                const originalStopDate = parseISO(session.stop_time);
                stopTimeISO = new Date(originalStopDate.getFullYear(), originalStopDate.getMonth(), originalStopDate.getDate(), newStopTime.getHours(), newStopTime.getMinutes()).toISOString();
            }

            // if startTimeISO and session has no stop time, stopTimeISO will be current time
            if(startTimeISO && !session.stop_time) {
                stopTimeISO = new Date().toISOString();
            }

            // start time should be less than stop time
            if(startTimeISO && stopTimeISO){
                if(new Date(startTimeISO) >= new Date(stopTimeISO)){
                    throw new FocusError('Start time must be before stop time.');
                }
            }

            // Check for overlaps *after* determining the new times.
            if (startTimeISO && stopTimeISO) {
                const overlappingSessions = db.getOverlappingSessions(startTimeISO, stopTimeISO)
                    .filter(overlap => overlap.id !== session.id); // Exclude the current session
                if (overlappingSessions.length > 0) {
                    throw new FocusError('The updated session overlaps with another session.');
                }
            } else if(startTimeISO && !stopTimeISO) {
                // if new start time given check overlapping with other sessions
                const overlappingSessions = db.getOverlappingSessionsWithStartTime(startTimeISO)
                .filter(overlap => overlap.id !== session.id); // Exclude the current session
                if (overlappingSessions.length > 0) {
                    throw new FocusError('The updated Start Time overlaps with another session.');
                }
            }

            // Now, perform the update.  Handle cases where only one of start/stop is updated.
            db.updateSession(session.id, startTimeISO, stopTimeISO);

            // Calculate and update duration based on updated values
            if (startTimeISO && stopTimeISO) {
                const durationInSeconds = Math.floor((new Date(stopTimeISO).getTime() - new Date(startTimeISO).getTime()) / 1000);
                db.updateDuration(session.id, durationInSeconds);
            } else if (startTimeISO && session.stop_time) {
                // Start time changed, but stop time exists
                const durationInSeconds = Math.floor((new Date(session.stop_time).getTime() - new Date(startTimeISO).getTime()) / 1000);
                db.updateDuration(session.id, durationInSeconds);

            } else if (stopTimeISO && startTimeISO) {
                // Stop time changed
                const durationInSeconds = Math.floor((new Date(stopTimeISO).getTime() - new Date(startTimeISO).getTime()) / 1000);
                db.updateDuration(session.id, durationInSeconds);
            }


            // --- Concise Success Message ---
            const updatedParts = [];
            if (startTimeISO) {
                updatedParts.push(`Start: ${formatDate(new Date(startTimeISO), 'yyyy-MM-dd hh:mm a')}`);
            }
            if (stopTimeISO) {
                updatedParts.push(`Stop: ${formatDate(new Date(stopTimeISO), 'yyyy-MM-dd hh:mm a')}`);
            }

            this.log(`✅ Session ${args.id}... updated. ${updatedParts.join(', ')}`);



        } catch (error: any) {
            if (error instanceof FocusError) {
                this.error(error.message);
            } else if (error instanceof z.ZodError) {
                this.error(error.errors.map((e) => e.message).join('\n'));
            }
             else {
                this.error(`Failed to edit session: ${error.message}`);
            }
        } finally {
            db.close();
        }
    }
}