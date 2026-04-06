import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StatsRdvEmployeeDto, StatsPresenceEmployeeDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class StatsService {

  private readonly BASE_URL = 'http://localhost:9091/api/admin/stats';

  constructor(private http: HttpClient) {}

  getRdvParEmployeeParMois(annee: number): Observable<StatsRdvEmployeeDto[]> {
    const params = new HttpParams().set('annee', annee.toString());
    return this.http.get<StatsRdvEmployeeDto[]>(`${this.BASE_URL}/rdv`, { params });
  }

  getPresenceParEmployeeParMois(mois: number, annee: number): Observable<StatsPresenceEmployeeDto[]> {
    const params = new HttpParams()
      .set('mois', mois.toString())
      .set('annee', annee.toString());
    return this.http.get<StatsPresenceEmployeeDto[]>(`${this.BASE_URL}/presence`, { params });
  }
}
