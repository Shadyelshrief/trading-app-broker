import { ColDef, ValueFormatterParams } from 'ag-grid-community';

import { directionClass } from './news-announcements.mapper';
import { NewsAnnouncementRow } from './news-announcements.models';

export function createNewsAnnouncementsColumns(): ColDef<NewsAnnouncementRow>[] {
  return [
    { headerName: 'Symbol ID', field: 'symbolId', minWidth: 120, cellClass: symbolCellClass },
    { headerName: 'Symbol Name', field: 'symbolName', minWidth: 220, cellClass: symbolCellClass },
    { headerName: 'Market Name', field: 'marketName', minWidth: 210 },
    { headerName: 'Market Short Name', field: 'marketShortName', minWidth: 160 },
    { headerName: 'Description', field: 'description', flex: 1, minWidth: 320 },
    { headerName: 'Date', field: 'date', minWidth: 120 },
    { headerName: 'Time', field: 'time', minWidth: 120 },
    {
      headerName: 'URL',
      field: 'url',
      minWidth: 220,
      valueFormatter: urlFormatter,
      cellRenderer: (params: { value?: string }) => {
        if (!params.value) {
          return '--';
        }

        const href = escapeHtml(params.value);
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">${href}</a>`;
      }
    }
  ];
}

function symbolCellClass(params: ValueFormatterParams<NewsAnnouncementRow>): string {
  return params.data ? directionClass(params.data) : '';
}

function urlFormatter(params: ValueFormatterParams<NewsAnnouncementRow, string>): string {
  return params.value ?? '--';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
