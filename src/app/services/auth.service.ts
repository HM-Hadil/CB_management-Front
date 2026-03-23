import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, Role } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API_URL = 'http://localhost:9090/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  currentUser = signal<AuthResponse | null>(this.getUserFromStorage());
  isAuthenticated = signal<boolean>(!!this.getToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, request).pipe(
      tap(response => this.saveSession(response)),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAdmin(): boolean { return this.currentUser()?.role === Role.ADMIN; }
  isReceptionist(): boolean { return this.currentUser()?.role === Role.RECEPTIONIST; }
  isEmployee(): boolean { return this.currentUser()?.role === Role.EMPLOYEE; }

  private saveSession(response: AuthResponse): void {
    if (response.token) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
    }
    localStorage.setItem(this.USER_KEY, JSON.stringify(response));
    this.currentUser.set(response);
    this.isAuthenticated.set(true);
  }

  private getUserFromStorage(): AuthResponse | null {
    const stored = localStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  private handleError(error: HttpErrorResponse) {
    let message = 'Une erreur est survenue. Veuillez réessayer.';
    if (error.status === 0) {
      message = 'Impossible de contacter le serveur.';
    } else if (error.status === 401) {
      message = 'Email ou mot de passe incorrect.';
    } else if (error.status === 403) {
      message = 'Accès refusé.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Données invalides.';
    } else if (error.status === 409) {
      message = 'Un compte avec cet email existe déjà.';
    } else if (error.status >= 500) {
      message = 'Erreur serveur. Réessayez plus tard.';
    }
    return throwError(() => new Error(message));
  }
}
