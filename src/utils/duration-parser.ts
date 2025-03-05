// src/utils/duration-parser.ts

import { FocusError } from "./error-utils.js"; // Corrected import

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
        throw new FocusError("Invalid duration format.  Numeric values are required for hours, minutes, and seconds.");
    }

    return hours * 3600 + minutes * 60 + seconds;
}