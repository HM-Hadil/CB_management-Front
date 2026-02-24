export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  RECEPTIONIST = 'RECEPTIONIST',
  CLIENT = 'CLIENT'
}

export interface RegisterRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  password: string;
  role: Role;
  specialite?: string;
  nombresExperiences?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  nom: string;
  prenom: string;
  role: Role;
  activated: boolean;
  specialite?: string;
  nombresExperiences?: number;
  message: string;
}

export interface UserDto {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  activated: boolean;
  specialite?: string;
  nombresExperiences?: number;
}

export interface UpdateUserRequest {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  password?: string;
  role?: Role;
  specialite?: string;
  nombresExperiences?: number;
}

export interface UpdateProfileRequest {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  specialite?: string;
  nombresExperiences?: number;
  currentPassword?: string;
  newPassword?: string;
}
