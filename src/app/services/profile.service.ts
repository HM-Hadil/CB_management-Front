import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UpdateProfileRequest, UserDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private readonly API_URL = 'http://localhost:9090/api/profile';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserDto> {
    return this.http.get<UserDto>(this.API_URL);
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserDto> {
    return this.http.put<UserDto>(this.API_URL, request);
  }
}
