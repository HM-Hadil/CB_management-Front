import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteFideliteDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class FideliteService {

  private readonly BASE_URL = 'http://localhost:9090/api/receptionist/fidelite';

  constructor(private http: HttpClient) {}

  getClientesFidelite(): Observable<ClienteFideliteDto[]> {
    return this.http.get<ClienteFideliteDto[]>(`${this.BASE_URL}/clientes`);
  }

  utiliserOffre(telephone: string): Observable<ClienteFideliteDto> {
    return this.http.post<ClienteFideliteDto>(`${this.BASE_URL}/utiliser/${telephone}`, {});
  }
}
