import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  buildNewsAnnouncementsParams,
  mapNewsAnnouncementsResponse
} from './news-announcements.mapper';
import {
  NewsAnnouncementRow,
  NewsAnnouncementsFilters
} from './news-announcements.models';

@Injectable({ providedIn: 'root' })
export class NewsAnnouncementsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/market/news-announcements`;

  getNewsAnnouncements(filters: NewsAnnouncementsFilters): Observable<NewsAnnouncementRow[]> {
    const params = buildNewsAnnouncementsParams(filters);

    return this.http
      .get<unknown>(this.base, { params })
      .pipe(map((response) => mapNewsAnnouncementsResponse(response)));
    // TODO: Confirm final backend endpoint and response contract with the news/announcements API.
  }
}
