// src/utils/duration-parser.ts

import { FocusError } from "./error-utils.js"; // Corrected import

/**
 * Parses a duration string into seconds.
 * Supported formats: Examples include "1h", "30m", "1h30m", "2h15m30s".
 * 
 * @param durationString - The duration string to parse.
 * @returns The total duration in seconds.
 * @throws {FocusError} If the input format is invalid or contains non-numeric values.
 */
export function parseDurationStringToSeconds(durationString: string): number {
    const regex = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
    const match = durationString.match(regex);

    if (!match) {
        throw new FocusError("Invalid duration format. Examples: 1h, 30m, 1h30m, 2h15m30s");
    }

    const [, hoursStr, minutesStr, secondsStr] = match;
    const hours = hoursStr ? parseInt(hoursStr, 10) : 0;
    const minutes = minutesStr ? parseInt(minutesStr, 10) : 0;
    const seconds = secondsStr ? parseInt(secondsStr, 10) : 0;

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
        throw new FocusError("Invalid duration format. Numeric values are required for hours, minutes, and seconds.");
    }

    return hours * 3600 + minutes * 60 + seconds;
}