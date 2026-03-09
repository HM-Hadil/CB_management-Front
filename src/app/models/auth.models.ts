export enum Role {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
  RECEPTIONIST = 'RECEPTIONIST',
  CLIENT = 'CLIENT'
}

export enum Specialite {
  SOINS = 'SOINS',
  COIFFEUSE = 'COIFFEUSE',
  ESTHETICIENNE = 'ESTHETICIENNE',
  ONGLERIE = 'ONGLERIE',
  MAQUILLEUSE = 'MAQUILLEUSE'
}

export enum TypeService {
  SOIN_VISAGE = 'SOIN_VISAGE',
  SOIN_PIED = 'SOIN_PIED',
  SOIN_MAIN = 'SOIN_MAIN',
  HYDRAFACIALE = 'HYDRAFACIALE',
  COUPE = 'COUPE',
  PROTEINE = 'PROTEINE',
  COLORATION_SIMPLE = 'COLORATION_SIMPLE',
  BALAYAGE = 'BALAYAGE',
  SOIN_CAPILLAIRE = 'SOIN_CAPILLAIRE',
  BRUSHING = 'BRUSHING',
  EPILATION_VISAGE = 'EPILATION_VISAGE',
  EPILATION_MOUSTACHE = 'EPILATION_MOUSTACHE',
  EPILATION_SOURCILS = 'EPILATION_SOURCILS',
  VERNIS_PERMANENT_MAIN = 'VERNIS_PERMANENT_MAIN',
  VERNIS_PERMANENT_PIED = 'VERNIS_PERMANENT_PIED',
  GEL_SUR_ONGLE_NATURELLE = 'GEL_SUR_ONGLE_NATURELLE',
  GEL_CAPSULE = 'GEL_CAPSULE',
  DEPOSE_VERNIS = 'DEPOSE_VERNIS',
  MAQUILLAGE = 'MAQUILLAGE'
}

export enum TypeClient {
  NORMAL = 'NORMAL',
  MARIAGE = 'MARIAGE'
}

export enum StatutRendezVous {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRME = 'CONFIRME',
  ANNULE = 'ANNULE',
  TERMINE = 'TERMINE'
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

export interface ServiceRendezVousRequest {
  employeeId: number | null;
  typeService: TypeService;
}

export interface ServiceRendezVousDto {
  id: number;
  employeeId: number;
  employeeNom: string;
  employeePrenom: string;
  employeeSpecialite: Specialite;
  typeService: TypeService;
}

export interface RendezVousRequest {
  nomClient: string;
  prenomClient: string;
  telephoneClient?: string;
  typeClient: TypeClient;
  dateDebut: string;
  nbHeures: number;
  services: ServiceRendezVousRequest[];
}

export interface RendezVousResponse {
  id: number;
  nomClient: string;
  prenomClient: string;
  telephoneClient?: string;
  typeClient: TypeClient;
  dateDebut: string;
  dateFin: string;
  nbHeures: number;
  statut: StatutRendezVous;
  createdById: number;
  createdByNom: string;
  createdByPrenom: string;
  services: ServiceRendezVousDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TypeServiceGroupeDto {
  specialite: Specialite;
  services: TypeService[];
}
