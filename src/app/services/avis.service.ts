import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AvisClienteDto, AvisClienteRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AvisService {

  private readonly BASE_URL = 'http://localhost:9091/api/receptionist/avis';

  constructor(private http: HttpClient) {}

  listerTous(): Observable<AvisClienteDto[]> {
    return this.http.get<AvisClienteDto[]>(this.BASE_URL);
  }

  creer(rendezVousId: number, request: AvisClienteRequest): Observable<AvisClienteDto> {
    return this.http.post<AvisClienteDto>(`${this.BASE_URL}/${rendezVousId}`, request);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }
}
