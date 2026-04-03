import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RendezVousRequest,
  RendezVousResponse,
  UserDto,
  TypeServiceGroupeDto,
  TypeService,
  StatutRendezVous,
  StatutService,
  Specialite
} from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class RendezVousService {

  private readonly BASE_URL      = 'http://localhost:9091/api/receptionist';
  private readonly EMPLOYEE_URL  = 'http://localhost:9091/api/employee';

  constructor(private http: HttpClient) {}

  // ── Réceptionniste / Admin ────────────────────────────────────
  creer(request: RendezVousRequest): Observable<RendezVousResponse> {
    return this.http.post<RendezVousResponse>(`${this.BASE_URL}/rendez-vous`, request);
  }

  listerTous(): Observable<RendezVousResponse[]> {
    return this.http.get<RendezVousResponse[]>(`${this.BASE_URL}/rendez-vous`);
  }

  getById(id: number): Observable<RendezVousResponse> {
    return this.http.get<RendezVousResponse>(`${this.BASE_URL}/rendez-vous/${id}`);
  }

  modifier(id: number, request: RendezVousRequest): Observable<RendezVousResponse> {
    return this.http.put<RendezVousResponse>(`${this.BASE_URL}/rendez-vous/${id}`, request);
  }

  changerStatut(id: number, statut: StatutRendezVous): Observable<RendezVousResponse> {
    return this.http.patch<RendezVousResponse>(
      `${this.BASE_URL}/rendez-vous/${id}/statut`,
      { statut }
    );
  }

  changerStatutService(serviceId: number, statut: StatutService): Observable<RendezVousResponse> {
    return this.http.patch<RendezVousResponse>(
      `${this.BASE_URL}/services/${serviceId}/statut`,
      { statut }
    );
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/rendez-vous/${id}`);
  }

  getEmployesDisponiblesParService(
    typeService: TypeService,
    dateDebut: string,
    dureeMinutes: number
  ): Observable<UserDto[]> {
    const params = new HttpParams()
      .set('typeService', typeService)
      .set('dateDebut', dateDebut)
      .set('dureeMinutes', dureeMinutes.toString());
    return this.http.get<UserDto[]>(
      `${this.BASE_URL}/employees/disponibles/par-service`,
      { params }
    );
  }

  getEmployesParSpecialite(specialite: Specialite): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.BASE_URL}/employees/specialite/${specialite}`);
  }

  getServicesGroupes(): Observable<TypeServiceGroupeDto[]> {
    return this.http.get<TypeServiceGroupeDto[]>(`${this.BASE_URL}/enums/services`);
  }

  // ── Employé (consultation uniquement) ────────────────────────
  getMesRendezVous(): Observable<RendezVousResponse[]> {
    return this.http.get<RendezVousResponse[]>(`${this.EMPLOYEE_URL}/mes-rendez-vous`);
  }

  getMesRendezVousParStatut(statut: StatutRendezVous): Observable<RendezVousResponse[]> {
    return this.http.get<RendezVousResponse[]>(
      `${this.EMPLOYEE_URL}/mes-rendez-vous/statut/${statut}`
    );
  }

  getMesRendezVousById(id: number): Observable<RendezVousResponse> {
    return this.http.get<RendezVousResponse>(`${this.EMPLOYEE_URL}/mes-rendez-vous/${id}`);
  }

  commencerRendezVous(id: number): Observable<RendezVousResponse> {
    return this.http.patch<RendezVousResponse>(
      `${this.EMPLOYEE_URL}/mes-rendez-vous/${id}/commencer`,
      {}
    );
  }

  terminerRendezVous(id: number): Observable<RendezVousResponse> {
    return this.http.patch<RendezVousResponse>(
      `${this.EMPLOYEE_URL}/mes-rendez-vous/${id}/terminer`,
      {}
    );
  }

  commencerService(serviceId: number): Observable<RendezVousResponse> {
    return this.http.patch<RendezVousResponse>(
      `${this.EMPLOYEE_URL}/mes-services/${serviceId}/commencer`,
      {}
    );
  }

  terminerService(serviceId: number): Observable<RendezVousResponse> {
    return this.http.patch<RendezVousResponse>(
      `${this.EMPLOYEE_URL}/mes-services/${serviceId}/terminer`,
      {}
    );
  }
}
