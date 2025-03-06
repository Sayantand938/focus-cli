// src/utils/table-utils.ts
import Table from 'cli-table3';
import chalk from 'chalk';
import { formatDate, formatDurationParts, getDurationParts } from './formatting-utils.js';
import { ListTable, SummaryTable } from './types.js';
import { Command } from '@oclif/core';

function createBaseTable(head: string[]): Table.Table {
    return new Table({
        head: head.map(h => chalk.blue.bold(h)), // Apply bold styling to headers
        colAligns: ['center', 'center', 'center', 'center', 'center'],
        colWidths: [10, 12, 12, 12, 10],
        style: {
            head: [], // Remove default head style
            border: ['#888888'],
            compact: false,
        },
        chars: {
            'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
            'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
            'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
            'right': '║', 'right-mid': '╢', 'middle': '│'
        }
    });
}

function formatSessionRow(session: ListTable): string[] {
    const { hours, minutes } = getDurationParts(session.duration);
    const duration = session.duration
        ? formatDurationParts(hours, minutes)
        : '';

    return [
        chalk.dim(session.id.substring(0, 8)),
        formatDate(new Date(session.start_time), 'yyyy-MM-dd'),
        formatDate(new Date(session.start_time), 'hh:mm a'),
        session.stop_time ? formatDate(new Date(session.stop_time), 'hh:mm a') : chalk.gray('N/A'),
        duration,
    ];
}

function formatSummaryRow(index: number, row: SummaryTable): string[] {
    return [
        chalk.dim(String(index + 1)),
        row.Date,
        row.Average,
        row.Total,
        row.Status,
    ];
}

function generateAndDisplayTable(command: Command, data: ListTable[] | SummaryTable[], tableType: 'sessions' | 'summary'): void {
    const head = tableType === 'sessions'
        ? ['ID', 'Date', 'Start Time', 'Stop Time', 'Duration']
        : ['SL', 'Date', 'Average', 'Total', 'Goal'];

    const table = createBaseTable(head);

    if (tableType === 'sessions') {
        for (const session of data as ListTable[]) {
            table.push(formatSessionRow(session));
        }
    } else {
        for (const [index, row] of (data as SummaryTable[]).entries()) {
            table.push(formatSummaryRow(index, row));
        }
    }

    command.log(''); // Blank line before
    command.log(table.toString());
    command.log(''); // Blank line after
}

export { createBaseTable, formatSessionRow, formatSummaryRow, generateAndDisplayTable };