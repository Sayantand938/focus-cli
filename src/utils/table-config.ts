import { HorizontalAlignment } from 'cli-table3';

export const tableConfig = {
  head: [
    'ID',
    'Date',
    'Start Time',
    'Stop Time',
    'Duration'
  ],
  colAligns: ['center' as HorizontalAlignment, 'center' as HorizontalAlignment, 'center' as HorizontalAlignment, 'center' as HorizontalAlignment, 'center' as HorizontalAlignment],
  colWidths: [10, 12, 12, 12, 10],
  style: {
    head: [],
    border: ['#888888'],
    compact: false,
  },
  chars: {
    'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
    , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝'
    , 'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼'
    , 'right': '║' , 'right-mid': '╢' , 'middle': '│'
  }
};

export const summaryTableConfig = {
  head: [
    'SL',
    'Date',
    'Average',
    'Total',
    'Status'
  ],
  colAligns: ['center' as HorizontalAlignment, 'center' as HorizontalAlignment, 'center' as HorizontalAlignment, 'center' as HorizontalAlignment, 'center' as HorizontalAlignment],
  colWidths: [5, 12, 10, 10, 8],
  style: {
    head: [],
    border: ['#888888'],
    compact: false,
  }
};