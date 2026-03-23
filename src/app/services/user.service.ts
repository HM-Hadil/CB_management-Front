import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse, RegisterRequest, UpdateUserRequest, UserDto } from '../models/auth.models';
import { Role } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class UserService {

  private readonly ADMIN_URL = 'http://localhost:9090/api/admin';

  constructor(private http: HttpClient) {}

  createUser(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.ADMIN_URL}/users`, request);
  }

  getAllStaff(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.ADMIN_URL}/users`);
  }

  getByRole(role: Role): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.ADMIN_URL}/users/role/${role}`);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.ADMIN_URL}/users/${id}`, request);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ADMIN_URL}/users/${id}`);
  }

  toggleActivation(id: number): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.ADMIN_URL}/users/${id}/toggle-activation`, {});
  }

  
  
}
