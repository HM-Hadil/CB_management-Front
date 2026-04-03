import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProduitStockDto, ProduitStockRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class StockService {

  private readonly BASE_URL = 'http://localhost:9091/api/receptionist/stock';

  constructor(private http: HttpClient) {}

  getAllProduits(): Observable<ProduitStockDto[]> {
    return this.http.get<ProduitStockDto[]>(this.BASE_URL);
  }

  getProduitsEnAlerte(): Observable<ProduitStockDto[]> {
    return this.http.get<ProduitStockDto[]>(`${this.BASE_URL}/alertes`);
  }

  creer(request: ProduitStockRequest): Observable<ProduitStockDto> {
    return this.http.post<ProduitStockDto>(this.BASE_URL, request);
  }

  modifier(id: number, request: ProduitStockRequest): Observable<ProduitStockDto> {
    return this.http.put<ProduitStockDto>(`${this.BASE_URL}/${id}`, request);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

  // ── Employee endpoints ────────────────────────────────────────
  private readonly EMPLOYEE_URL = 'http://localhost:9091/api/employee/stock';

  getAllProduitsEmployee(): Observable<ProduitStockDto[]> {
    return this.http.get<ProduitStockDto[]>(this.EMPLOYEE_URL);
  }

  decrementeQuantite(id: number): Observable<ProduitStockDto> {
    return this.http.patch<ProduitStockDto>(`${this.EMPLOYEE_URL}/${id}/decrementer`, {});
  }

  utiliserProduits(items: { produitId: number; quantite: number }[]): Observable<ProduitStockDto[]> {
    return this.http.post<ProduitStockDto[]>(`${this.EMPLOYEE_URL}/utiliser`, items);
  }
}
