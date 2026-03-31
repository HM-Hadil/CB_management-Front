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
  // ── Soins – Soin Visage ─────────────────────────────────────
  SOIN_VISAGE_BASIQUE = 'SOIN_VISAGE_BASIQUE',
  SOIN_VISAGE_BASIQUE_FILORGA = 'SOIN_VISAGE_BASIQUE_FILORGA',
  SOIN_VISAGE_BASIQUE_MARIA_GALLAND = 'SOIN_VISAGE_BASIQUE_MARIA_GALLAND',
  SOIN_VISAGE_BASIQUE_CAUDALIE = 'SOIN_VISAGE_BASIQUE_CAUDALIE',
  SOIN_VISAGE_SPECIFIQUE = 'SOIN_VISAGE_SPECIFIQUE',
  SOIN_VISAGE_SPECIFIQUE_FILORGA = 'SOIN_VISAGE_SPECIFIQUE_FILORGA',
  SOIN_VISAGE_SPECIFIQUE_MARIA_GALLAND = 'SOIN_VISAGE_SPECIFIQUE_MARIA_GALLAND',
  SOIN_VISAGE_VIP_MARIA_GALLAND = 'SOIN_VISAGE_VIP_MARIA_GALLAND',
  SOIN_VISAGE_SPECIFIQUE_CAUDALIE = 'SOIN_VISAGE_SPECIFIQUE_CAUDALIE',
  // ── Soins – Soin Pied ───────────────────────────────────────
  SOIN_PIED_BASIQUE = 'SOIN_PIED_BASIQUE',
  SOIN_PIED_SPECIFIQUE = 'SOIN_PIED_SPECIFIQUE',
  // ── Soins – Soin Main ───────────────────────────────────────
  SOIN_MAIN_BASIQUE = 'SOIN_MAIN_BASIQUE',
  SOIN_MAIN_SPECIFIQUE = 'SOIN_MAIN_SPECIFIQUE',
  // ── Soins – Hydrafacial ─────────────────────────────────────
  HYDRAFACIAL_NORMAL = 'HYDRAFACIAL_NORMAL',
  HYDRAFACIAL_MARIA_GALLAND = 'HYDRAFACIAL_MARIA_GALLAND',
  // ── Soins – Head Spa ────────────────────────────────────────
  HEAD_SPA_ESSENTIEL = 'HEAD_SPA_ESSENTIEL',
  HEAD_SPA_RELAX = 'HEAD_SPA_RELAX',
  HEAD_SPA_SIGNATURE = 'HEAD_SPA_SIGNATURE',
  // ── Coiffure ────────────────────────────────────────────────
  COUPE = 'COUPE',
  PROTEINE_CHEVEUX_COURT = 'PROTEINE_CHEVEUX_COURT',
  PROTEINE_CHEVEUX_MI_LONG = 'PROTEINE_CHEVEUX_MI_LONG',
  PROTEINE_CHEVEUX_LONG = 'PROTEINE_CHEVEUX_LONG',
  PROTEINE_CHEVEUX_TRES_LONG = 'PROTEINE_CHEVEUX_TRES_LONG',
  COLORATION_SIMPLE = 'COLORATION_SIMPLE',
  BALAYAGE = 'BALAYAGE',
  SOIN_CAPILLAIRE_CLASSIQUE = 'SOIN_CAPILLAIRE_CLASSIQUE',
  SOIN_CAPILLAIRE_PREMIUM = 'SOIN_CAPILLAIRE_PREMIUM',
  BRUSHING = 'BRUSHING',
  COIFFURE_EQUIPE = 'COIFFURE_EQUIPE',
  COIFFURE_SPECIALISTE = 'COIFFURE_SPECIALISTE',
  // ── Esthéticienne ───────────────────────────────────────────
  EPILATION_VISAGE = 'EPILATION_VISAGE',
  EPILATION_MOUSTACHE = 'EPILATION_MOUSTACHE',
  EPILATION_SOURCILS = 'EPILATION_SOURCILS',
  // ── Onglerie ────────────────────────────────────────────────
  VERNIS_PERMANENT_MAIN = 'VERNIS_PERMANENT_MAIN',
  VERNIS_PERMANENT_PIEDS = 'VERNIS_PERMANENT_PIEDS',
  GEL_SUR_ONGLE_NATURELLE = 'GEL_SUR_ONGLE_NATURELLE',
  GEL_CAPSULE = 'GEL_CAPSULE',
  BABY_BOOMER = 'BABY_BOOMER',
  // ── Maquillage ──────────────────────────────────────────────
  MAQUILLAGE_PAR_EQUIPE = 'MAQUILLAGE_PAR_EQUIPE',
  // ── Maquillage Mariée ────────────────────────────────────────
  MAQUILLAGE_SDAG = 'MAQUILLAGE_SDAG',
  MAQUILLAGE_HENNA = 'MAQUILLAGE_HENNA',
  MAQUILLAGE_BADOU = 'MAQUILLAGE_BADOU',
  MAQUILLAGE_D5OUL = 'MAQUILLAGE_D5OUL',
  MAQUILLAGE_FIANCAILLES = 'MAQUILLAGE_FIANCAILLES'
}

/** Durée par défaut (minutes) et libellé français pour chaque service */
export const TYPE_SERVICE_META: Record<string, { label: string; dureeMinutes: number }> = {
  // Soins – Soin Visage
  SOIN_VISAGE_BASIQUE:                { label: 'Soin visage basique',                   dureeMinutes: 75  },
  SOIN_VISAGE_BASIQUE_FILORGA:        { label: 'Soin visage basique Filorga',           dureeMinutes: 60  },
  SOIN_VISAGE_BASIQUE_MARIA_GALLAND:  { label: 'Soin visage basique Maria Galland',     dureeMinutes: 60  },
  SOIN_VISAGE_BASIQUE_CAUDALIE:       { label: 'Soin visage basique Caudalie',          dureeMinutes: 60  },
  SOIN_VISAGE_SPECIFIQUE:             { label: 'Soin visage spécifique',                dureeMinutes: 90  },
  SOIN_VISAGE_SPECIFIQUE_FILORGA:     { label: 'Soin visage spécifique Filorga',        dureeMinutes: 90  },
  SOIN_VISAGE_SPECIFIQUE_MARIA_GALLAND:{ label: 'Soin visage spécifique Maria Galland', dureeMinutes: 90  },
  SOIN_VISAGE_VIP_MARIA_GALLAND:      { label: 'Soin visage VIP Maria Galland',         dureeMinutes: 90  },
  SOIN_VISAGE_SPECIFIQUE_CAUDALIE:    { label: 'Soin visage spécifique Caudalie',       dureeMinutes: 90  },
  // Soins – Soin Pied
  SOIN_PIED_BASIQUE:    { label: 'Soin pied basique',    dureeMinutes: 60  },
  SOIN_PIED_SPECIFIQUE: { label: 'Soin pied spécifique', dureeMinutes: 90  },
  // Soins – Soin Main
  SOIN_MAIN_BASIQUE:    { label: 'Soin main basique',    dureeMinutes: 60  },
  SOIN_MAIN_SPECIFIQUE: { label: 'Soin main spécifique', dureeMinutes: 90  },
  // Soins – Hydrafacial
  HYDRAFACIAL_NORMAL:       { label: 'Hydrafacial normal',       dureeMinutes: 60  },
  HYDRAFACIAL_MARIA_GALLAND:{ label: 'Hydrafacial Maria Galland',dureeMinutes: 90  },
  // Soins – Head Spa
  HEAD_SPA_ESSENTIEL: { label: 'Head Spa Essentiel', dureeMinutes: 60  },
  HEAD_SPA_RELAX:     { label: 'Head Spa Relax',     dureeMinutes: 60  },
  HEAD_SPA_SIGNATURE: { label: 'Head Spa Signature', dureeMinutes: 90  },
  // Coiffure
  COUPE:                    { label: 'Coupe',                          dureeMinutes: 60  },
  PROTEINE_CHEVEUX_COURT:   { label: 'Protéine cheveux courts',        dureeMinutes: 150 },
  PROTEINE_CHEVEUX_MI_LONG: { label: 'Protéine cheveux mi-longs',      dureeMinutes: 180 },
  PROTEINE_CHEVEUX_LONG:    { label: 'Protéine cheveux longs',         dureeMinutes: 240 },
  PROTEINE_CHEVEUX_TRES_LONG:{ label: 'Protéine cheveux très longs',   dureeMinutes: 240 },
  COLORATION_SIMPLE:        { label: 'Coloration simple',              dureeMinutes: 120 },
  BALAYAGE:                 { label: 'Balayage',                       dureeMinutes: 240 },
  SOIN_CAPILLAIRE_CLASSIQUE:{ label: 'Soin capillaire classique',      dureeMinutes: 120 },
  SOIN_CAPILLAIRE_PREMIUM:  { label: 'Soin capillaire premium',        dureeMinutes: 120 },
  BRUSHING:                 { label: 'Brushing',                       dureeMinutes: 30  },
  COIFFURE_EQUIPE:          { label: 'Coiffure (équipe)',              dureeMinutes: 60  },
  COIFFURE_SPECIALISTE:     { label: 'Coiffure (spécialiste)',         dureeMinutes: 90  },
  // Esthéticienne
  EPILATION_VISAGE:    { label: 'Épilation visage',    dureeMinutes: 15 },
  EPILATION_MOUSTACHE: { label: 'Épilation moustache', dureeMinutes: 15 },
  EPILATION_SOURCILS:  { label: 'Épilation sourcils',  dureeMinutes: 15 },
  // Onglerie
  VERNIS_PERMANENT_MAIN:  { label: 'Vernis permanent main',        dureeMinutes: 60  },
  VERNIS_PERMANENT_PIEDS: { label: 'Vernis permanent pieds',       dureeMinutes: 60  },
  GEL_SUR_ONGLE_NATURELLE:{ label: 'Gel sur ongle naturelle',      dureeMinutes: 120 },
  GEL_CAPSULE:            { label: 'Gel capsule',                   dureeMinutes: 120 },
  BABY_BOOMER:            { label: 'Baby boomer',                   dureeMinutes: 120 },
  // Maquillage
  MAQUILLAGE_PAR_EQUIPE:   { label: 'Maquillage par équipe',   dureeMinutes: 90  },
  // Maquillage Mariée
  MAQUILLAGE_SDAG:         { label: 'Maquillage Sdaq',         dureeMinutes: 120 },
  MAQUILLAGE_HENNA:        { label: 'Maquillage Henné',        dureeMinutes: 120 },
  MAQUILLAGE_BADOU:        { label: 'Maquillage Badou',        dureeMinutes: 90  },
  MAQUILLAGE_D5OUL:        { label: 'Maquillage Dkhoul',       dureeMinutes: 120 },
  MAQUILLAGE_FIANCAILLES:  { label: 'Maquillage Fiançailles',  dureeMinutes: 90  },
};

export enum TypeClient {
  NORMAL = 'NORMAL',
  MARIAGE = 'MARIAGE'
}

export enum StatutMariee {
  VOILEE = 'VOILEE',
  NON_VOILEE = 'NON_VOILEE'
}

export enum StatutRendezVous {
  EN_ATTENTE = 'EN_ATTENTE',
  CONFIRME = 'CONFIRME',
  EN_COURS = 'EN_COURS',
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
  specialites?: string[];
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
  specialites?: string[];
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
  specialites?: string[];
  nombresExperiences?: number;
}

export interface UpdateUserRequest {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  password?: string;
  role?: Role;
}

export interface UpdateProfileRequest {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  specialites?: string[];
  nombresExperiences?: number;
  currentPassword?: string;
  newPassword?: string;
}

export interface ServiceRendezVousRequest {
  employeeId: number | null;
  typeService: TypeService;
  datePrevue?: string;
  dureeService?: number;
  codeRobe?: string;
}

export interface ServiceRendezVousDto {
  id: number;
  employeeId: number;
  employeeNom: string;
  employeePrenom: string;
  employeeSpecialite: Specialite;
  typeService: TypeService;
  datePrevue?: string;
  dureeService?: number;
  codeRobe?: string;
}

export interface RendezVousRequest {
  nomClient: string;
  prenomClient: string;
  telephoneClient?: string;
  typeClient: TypeClient;
  statutMariee?: StatutMariee;
  dateDebut: string;
  dureeMinutes: number;
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
  dureeMinutes: number;
  statut: StatutRendezVous;
  statutMariee?: StatutMariee;
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

// ── Présence ──────────────────────────────────────────────────
export enum StatutPresence {
  ABSENT  = 'ABSENT',
  PRESENT = 'PRESENT',
  RETARD  = 'RETARD',
  TERMINE = 'TERMINE'
}

export interface PresenceResponse {
  id?: number;
  employeeId: number;
  employeeNom: string;
  employeePrenom: string;
  employeeSpecialite?: string;
  date: string;
  heureArrivee?: string;
  heureDepart?: string;
  statut: StatutPresence;
  heuresTravaillees?: number;
}

export type TypeOffre = 'SERVICE_GRATUIT' | 'PROMO_PROCHAIN_SERVICE';

export interface OffreUtiliseeDto {
  typeOffre: TypeOffre;
  dateUtilisation: string; // ISO datetime
}

export interface ClienteFideliteDto {
  nomClient: string;
  prenomClient: string;
  telephoneClient: string;
  totalServices: number;
  offresGagnees: number;
  offresUtilisees: number;
  offresDisponibles: number;
  /** Progression vers la prochaine offre (0-4) */
  servicesVersProchainOffre: number;
  /** ISO date string du premier RDV terminé */
  clientDepuis: string;
  /** Mois de référence "yyyy-MM" */
  moisAnnee: string;
  /** Détail des offres utilisées ce mois-ci */
  offresUtiliseesDetails: OffreUtiliseeDto[];
}

// ── Stock ──────────────────────────────────────────────────────
export enum CategorieStock {
  COIFFURE    = 'COIFFURE',
  MANUCURE    = 'MANUCURE',
  PEDICURE    = 'PEDICURE',
  SOIN_VISAGE = 'SOIN_VISAGE',
  MASSAGE     = 'MASSAGE',
  EPILATION   = 'EPILATION',
  MAQUILLAGE  = 'MAQUILLAGE'
}

export const CATEGORIE_STOCK_LABELS: Record<CategorieStock, string> = {
  [CategorieStock.COIFFURE]:    'Coiffure',
  [CategorieStock.MANUCURE]:    'Manucure',
  [CategorieStock.PEDICURE]:    'Pédicure',
  [CategorieStock.SOIN_VISAGE]: 'Soin de visage',
  [CategorieStock.MASSAGE]:     'Massage',
  [CategorieStock.EPILATION]:   'Épilation',
  [CategorieStock.MAQUILLAGE]:  'Maquillage'
};

export interface ProduitStockDto {
  id: number;
  nom: string;
  categorie: CategorieStock;
  quantite: number;
  quantiteMinimum: number;
  unite: string;
  prixUnitaire: number;
  nomFournisseur: string | null;
  enAlerte: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProduitStockRequest {
  nom: string;
  categorie: CategorieStock | '';
  quantite: number;
  quantiteMinimum: number;
  unite: string;
  prixUnitaire: number | null;
  nomFournisseur: string;
}

// ── Avis Clientes ───────────────────────────────────────────────
export interface AvisClienteDto {
  id: number;
  rendezVousId: number;
  nomClient: string;
  prenomClient: string;
  telephoneClient: string | null;
  note: number;
  commentaire: string | null;
  createdAt: string;
}

export interface AvisClienteRequest {
  note: number;
  commentaire: string;
}
