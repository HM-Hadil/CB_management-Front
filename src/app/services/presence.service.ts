import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PresenceResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class PresenceService {

  private readonly BASE_URL = 'http://localhost:9091/api/receptionist';

  constructor(private http: HttpClient) {}

  getPresenceForDate(date: string): Observable<PresenceResponse[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<PresenceResponse[]>(`${this.BASE_URL}/presence`, { params });
  }

  marquerArrivee(employeeId: number): Observable<PresenceResponse> {
    return this.http.post<PresenceResponse>(`${this.BASE_URL}/presence/${employeeId}/arrivee`, {});
  }

  marquerDepart(employeeId: number): Observable<PresenceResponse> {
    return this.http.post<PresenceResponse>(`${this.BASE_URL}/presence/${employeeId}/depart`, {});
  }

  terminer(employeeId: number): Observable<PresenceResponse> {
    return this.http.post<PresenceResponse>(`${this.BASE_URL}/presence/${employeeId}/terminer`, {});
  }
}
