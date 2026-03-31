import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClienteFideliteDto, TypeOffre } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class FideliteService {

  private readonly BASE_URL = 'http://localhost:9091/api/receptionist/fidelite';

  constructor(private http: HttpClient) {}

  getClientesFidelite(): Observable<ClienteFideliteDto[]> {
    return this.http.get<ClienteFideliteDto[]>(`${this.BASE_URL}/clientes`);
  }

  utiliserOffre(telephone: string, typeOffre: TypeOffre): Observable<ClienteFideliteDto> {
    return this.http.post<ClienteFideliteDto>(
      `${this.BASE_URL}/utiliser/${telephone}`,
      { typeOffre }
    );
  }
}
