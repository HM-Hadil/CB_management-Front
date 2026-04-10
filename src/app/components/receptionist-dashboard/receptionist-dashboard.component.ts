import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import { FideliteService } from '../../services/fidelite.service';
import { PresenceService } from '../../services/presence.service';
import { StockService } from '../../services/stock.service';
import { AvisService } from '../../services/avis.service';
import {
  UserDto,
  UpdateProfileRequest,
  RendezVousResponse,
  RendezVousRequest,
  ServiceRendezVousDto,
  ServiceRendezVousRequest,
  TypeService,
  TypeClient,
  StatutMariee,
  StatutRendezVous,
  StatutService,
  Specialite,
  TypeServiceGroupeDto,
  ClienteFideliteDto,
  Role,
  TYPE_SERVICE_META,
  StatutPresence,
  PresenceResponse,
  CategorieStock,
  CATEGORIE_STOCK_LABELS,
  ProduitStockDto,
  ProduitStockRequest,
  TypeOffre,
  AvisClienteDto,
  AvisClienteRequest
} from '../../models/auth.models';
import { RouterLink } from '@angular/router';

type Tab = 'profile' | 'rendez-vous' | 'rendez-vous-mariees' | 'offres' | 'presence' | 'stock' | 'avis';

export interface RdvServiceRow {
  rdv: RendezVousResponse;
  services: ServiceRendezVousDto[];
  date: string; // YYYY-MM-DD
}

export interface ServiceFormRow {
  typeService: TypeService | '';
  date: string;          // YYYY-MM-DD
  heure: string;         // HH:mm
  dureeMinutes: number;
  employeeId: number | null;
  availableEmployees: UserDto[];
  loadingEmployees: boolean;
}

export interface MarieeServiceRow {
  typeService: TypeService | '';
  date: string;
  heure: string;
  codeRobe: string;
}

export interface NormaleServiceMarieeRow {
  typeService: TypeService | '';
  date: string;
  heure: string;
  dureeMinutes: number;
  employeeId: number | null;
  availableEmployees: UserDto[];
  loadingEmployees: boolean;
}

@Component({
  selector: 'app-receptionist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './receptionist-dashboard.component.html',
  styleUrls: ['./receptionist-dashboard.component.scss']
})
export class ReceptionistDashboardComponent implements OnInit {

  // ── Profile state ─────────────────────────────────────────────
  profile = signal<UserDto | null>(null);
  loading = signal(false);
  saveLoading = signal(false);
  error = signal('');
  success = signal('');
  activeTab = signal<Tab>('profile');
  showCurrentPw = signal(false);
  showNewPw = signal(false);

  profileForm: UpdateProfileRequest = {
    nom: '', prenom: '', email: '', telephone: ''
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // ── Rendez-vous state ─────────────────────────────────────────
  rendezVous = signal<RendezVousResponse[]>([]);
  rdvLoading = signal(false);
  showRdvModal = signal(false);
  rdvModalMode = signal<'create' | 'edit'>('create');
  rdvModalLoading = signal(false);
  rdvModalError = signal('');
  selectedRdv = signal<RendezVousResponse | null>(null);
  deleteConfirmId = signal<number | null>(null);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  serviceGroups = signal<TypeServiceGroupeDto[]>([]);
  rdvSearchQuery = signal('');
  rdvFilterDate = signal<string>('');
  rdvViewPeriod = signal<'today' | 'week' | 'month' | 'all'>('today');
  rdvTypeFilter = signal<TypeClient | 'ALL' | 'MARIAGE_SERVICES'>('ALL');
  marieeSubFilter = signal<'ALL' | 'PURE' | 'SERVICES'>('ALL');

  // ── Time slots (grille horaire) ───────────────────────────────
  // (removed — dates are now per-service row)

  // ── Sidebar mobile ────────────────────────────────────────────
  sidebarOpen = signal(false);

  // ── Fidélité state ────────────────────────────────────────────
  clientesFidelite = signal<ClienteFideliteDto[]>([]);
  fideliteLoading = signal(false);
  fideliteSearchQuery = signal('');
  offreModalCliente = signal<ClienteFideliteDto | null>(null);

  // ── Présence state ────────────────────────────────────────────
  presences = signal<PresenceResponse[]>([]);
  presenceLoading = signal(false);
  presenceActionLoading = signal<number | null>(null);
  presenceSelectedDate = signal<string>((() => {
    const n = new Date(); const p = (x: number) => x.toString().padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  })());
  StatutPresence = StatutPresence;

  presentsCount  = computed(() => this.presences().filter(p => p.statut === StatutPresence.PRESENT || p.statut === StatutPresence.RETARD).length);
  absentsCount   = computed(() => this.presences().filter(p => p.statut === StatutPresence.ABSENT).length);
  totalHeures    = computed(() => {
    const sum = this.presences().reduce((acc, p) => acc + (p.heuresTravaillees ?? 0), 0);
    return Math.round(sum * 100) / 100;
  });

  presenceWeekDays = computed(() => {
    const sel = new Date(this.presenceSelectedDate() + 'T00:00:00');
    const day = sel.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(sel);
    monday.setDate(sel.getDate() + diffToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return { iso, day: d.getDate(), label: d.toLocaleDateString('fr-FR', { weekday: 'short' }) };
    });
  });

  rdvForm: {
    nomClient: string;
    prenomClient: string;
    telephoneClient: string;
    typeClient: TypeClient;
    // ── Champs communs (mode Normal) ──────────
    dateDebutDate: string;   // YYYY-MM-DD
    dateDebutHeure: string;  // HH:mm
    dureeMinutes: number;
    services: ServiceFormRow[];
    // ── Champs spécifiques Mariée ─────────────
    statutMariee: StatutMariee;
    marieeServices: MarieeServiceRow[];
    normaleServices: NormaleServiceMarieeRow[];
  } = {
    nomClient: '',
    prenomClient: '',
    telephoneClient: '',
    typeClient: TypeClient.NORMAL,
    dateDebutDate: '',
    dateDebutHeure: '',
    dureeMinutes: 60,
    services: [],
    statutMariee: StatutMariee.NON_VOILEE,
    marieeServices: [],
    normaleServices: []
  };

  readonly MARIEE_SERVICE_TYPES: TypeService[] = [
    TypeService.MAQUILLAGE_SDAG,
    TypeService.MAQUILLAGE_HENNA,
    TypeService.MAQUILLAGE_BADOU,
    TypeService.MAQUILLAGE_D5OUL,
    TypeService.MAQUILLAGE_FIANCAILLES
  ];

  readonly MARIEE_SERVICE_DUREE: Partial<Record<TypeService, number>> = {
    [TypeService.MAQUILLAGE_SDAG]:        120,
    [TypeService.MAQUILLAGE_HENNA]:       120,
    [TypeService.MAQUILLAGE_BADOU]:        90,
    [TypeService.MAQUILLAGE_D5OUL]:       120,
    [TypeService.MAQUILLAGE_FIANCAILLES]:  90,
  };

  // ── Stock state ───────────────────────────────────────────────
  produits = signal<ProduitStockDto[]>([]);
  stockLoading = signal(false);
  stockModalOpen = signal(false);
  stockModalMode = signal<'create' | 'edit'>('create');
  stockModalLoading = signal(false);
  stockModalError = signal('');
  stockDeleteConfirmId = signal<number | null>(null);
  stockSearchQuery = signal('');
  stockCategorieFilter = signal<CategorieStock | 'ALL'>('ALL');
  selectedProduit = signal<ProduitStockDto | null>(null);

  stockForm: ProduitStockRequest = {
    nom: '', categorie: '', quantite: 0, quantiteMinimum: 0, unite: '', nomFournisseur: '', reference: ''
  };

  readonly CATEGORIES_STOCK = Object.values(CategorieStock);
  readonly CATEGORIE_STOCK_LABELS = CATEGORIE_STOCK_LABELS;
  CategorieStock = CategorieStock;

  // ── Avis Clientes state ───────────────────────────────────────
  avis = signal<AvisClienteDto[]>([]);
  avisLoading = signal(false);
  avisModalRdv = signal<RendezVousResponse | null>(null);
  avisModalLoading = signal(false);
  avisModalError = signal('');
  avisDeleteConfirmId = signal<number | null>(null);
  avisSearchQuery = signal('');
  avisNoteFilter = signal<number | 0>(0);

  avisForm: AvisClienteRequest = { note: 5, commentaire: '' };

  /** IDs des RDV qui ont déjà un avis */
  private avisRdvIds = computed(() => new Set(this.avis().map(a => a.rendezVousId)));

  rdvHasAvis(rdvId: number): boolean {
    return this.avisRdvIds().has(rdvId);
  }

  private avisNoteMap = computed(() => new Map(this.avis().map(a => [a.rendezVousId, a.note])));

  getRdvNote(rdvId: number): number | null {
    return this.avisNoteMap().get(rdvId) ?? null;
  }

  filteredAvis = computed(() => {
    let list = this.avis();
    const q = this.avisSearchQuery().toLowerCase().trim();
    const note = this.avisNoteFilter();
    if (note > 0) list = list.filter(a => a.note === note);
    if (q) list = list.filter(a =>
      `${a.prenomClient} ${a.nomClient} ${a.telephoneClient ?? ''}`.toLowerCase().includes(q)
    );
    return list;
  });

  noteMoyenne = computed(() => {
    const list = this.avis();
    if (!list.length) return 0;
    return Math.round((list.reduce((sum, a) => sum + a.note, 0) / list.length) * 10) / 10;
  });

  avisParNote = computed(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.avis().forEach(a => counts[a.note] = (counts[a.note] ?? 0) + 1);
    return counts;
  });

  stockEnAlerte = computed(() => this.produits().filter(p => p.enAlerte));

  filteredProduits = computed(() => {

    let list = this.produits();
    const q = this.stockSearchQuery().toLowerCase().trim();
    const cat = this.stockCategorieFilter();
    if (cat !== 'ALL') list = list.filter(p => p.categorie === cat);
    if (q) list = list.filter(p => p.nom.toLowerCase().includes(q));
    return list;
  });

  // ── Expose enums to template ──────────────────────────────────
  TypeClient = TypeClient;
  StatutMariee = StatutMariee;
  StatutRendezVous = StatutRendezVous;
  StatutService = StatutService;

  // ── Computed ──────────────────────────────────────────────────
  private rdvBaseList = computed(() => {
    let list = this.rendezVous();
    const period = this.rdvViewPeriod();
    const q = this.rdvSearchQuery().toLowerCase().trim();
    const d = this.rdvFilterDate();

    if (!d) {
      const now = new Date();
      if (period === 'today') {
        const today = now.toDateString();
        list = list.filter(r => new Date(r.dateDebut).toDateString() === today);
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
        list = list.filter(r => { const rd = new Date(r.dateDebut); return rd >= mon && rd <= sun; });
      } else if (period === 'month') {
        list = list.filter(r => {
          const rd = new Date(r.dateDebut);
          return rd.getMonth() === now.getMonth() && rd.getFullYear() === now.getFullYear();
        });
      }
    }
    if (q) list = list.filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
    if (d) list = list.filter(r => r.dateDebut.startsWith(d));
    return [...list].sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
  });

  filteredRdv = computed(() => {
    let list = this.rdvBaseList();
    const tc = this.rdvTypeFilter();
    if (tc === TypeClient.NORMAL) list = list.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === TypeClient.MARIAGE) list = list.filter(r => r.typeClient === TypeClient.MARIAGE && !r.services.some(s => s.employeeId));
    else if (tc === 'MARIAGE_SERVICES') list = list.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));
    return list;
  });

  expandedRdvRows = computed((): RdvServiceRow[] => {
    const filterDate = this.rdvFilterDate();
    const period = this.rdvViewPeriod();
    const q = this.rdvSearchQuery().toLowerCase().trim();
    const tc = this.rdvTypeFilter();
    const now = new Date();

    let rdvList = this.rendezVous();

    if (q) rdvList = rdvList.filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
    if (tc === TypeClient.NORMAL) rdvList = rdvList.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === TypeClient.MARIAGE) rdvList = rdvList.filter(r => r.typeClient === TypeClient.MARIAGE && !r.services.some(s => s.employeeId));
    else if (tc === 'MARIAGE_SERVICES') rdvList = rdvList.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));

    const rows: RdvServiceRow[] = [];

    for (const rdv of rdvList) {
      const byDate = new Map<string, ServiceRendezVousDto[]>();
      if (rdv.services.length === 0) {
        byDate.set(rdv.dateDebut.substring(0, 10), []);
      } else {
        for (const srv of rdv.services) {
          const date = srv.datePrevue ? srv.datePrevue.substring(0, 10) : rdv.dateDebut.substring(0, 10);
          if (!byDate.has(date)) byDate.set(date, []);
          byDate.get(date)!.push(srv);
        }
      }

      for (const [date, services] of byDate) {
        let include = false;
        if (filterDate) {
          include = date === filterDate;
        } else {
          const d = new Date(date + 'T00:00:00');
          if (period === 'today') {
            include = d.toDateString() === now.toDateString();
          } else if (period === 'week') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
            include = d >= mon && d <= sun;
          } else if (period === 'month') {
            include = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          } else {
            include = true;
          }
        }
        if (include) rows.push({ rdv, services, date });
      }
    }

    return rows.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.rdv.dateDebut.localeCompare(a.rdv.dateDebut);
    });
  });

  totalRdv                    = computed(() => this.rdvBaseList().length);
  rdvMariageCount             = computed(() => this.rdvBaseList().filter(r => r.typeClient === TypeClient.MARIAGE).length);
  rdvMariageAvecServicesCount = computed(() => this.rdvBaseList().filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId)).length);
  rdvEnAttente = computed(() => this.rdvBaseList().filter(r => r.statut === StatutRendezVous.EN_ATTENTE).length);
  rdvConfirme  = computed(() => this.rdvBaseList().filter(r => r.statut === StatutRendezVous.CONFIRME).length);
  rdvAnnule    = computed(() => this.rdvBaseList().filter(r => r.statut === StatutRendezVous.ANNULE).length);
  rdvTermine   = computed(() => this.rdvBaseList().filter(r => r.statut === StatutRendezVous.TERMINE).length);
  rdvAujourdhui = computed(() => {
    const today = new Date().toDateString();
    return this.rendezVous().filter(r => new Date(r.dateDebut).toDateString() === today).length;
  });
  rdvCetteSemaine = computed(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    return this.rendezVous().filter(r => { const d = new Date(r.dateDebut); return d >= monday && d <= sunday; }).length;
  });
  rdvCeMois = computed(() => {
    const now = new Date();
    return this.rendezVous().filter(r => {
      const d = new Date(r.dateDebut);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  });

  filteredClientesFidelite = computed(() => {
    const q = this.fideliteSearchQuery().toLowerCase().trim();
    if (!q) return this.clientesFidelite();
    return this.clientesFidelite().filter(c =>
      `${c.nomClient} ${c.prenomClient} ${c.telephoneClient}`.toLowerCase().includes(q)
    );
  });

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private rendezVousService: RendezVousService,
    private fideliteService: FideliteService,
    private stockService: StockService,
    private presenceService: PresenceService,
    private avisService: AvisService
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadServiceGroups();
  }

  // ── Présence ──────────────────────────────────────────────────
  loadPresence(date?: string) {
    const d = date ?? this.presenceSelectedDate();
    this.presenceLoading.set(true);
    this.presenceService.getPresenceForDate(d).subscribe({
      next: (data) => { this.presences.set(data); this.presenceLoading.set(false); },
      error: () => { this.presenceLoading.set(false); this.showToast('Erreur lors du chargement de la présence.', 'error'); }
    });
  }

  selectPresenceDate(iso: string) {
    this.presenceSelectedDate.set(iso);
    this.loadPresence(iso);
  }

  marquerArrivee(employeeId: number) {
    this.presenceActionLoading.set(employeeId);
    this.presenceService.marquerArrivee(employeeId).subscribe({
      next: (updated) => {
        this.presences.update(list => list.map(p => p.employeeId === employeeId ? updated : p));
        this.presenceActionLoading.set(null);
        this.showToast('Arrivée marquée avec succès.', 'success');
      },
      error: (err) => {
        this.presenceActionLoading.set(null);
        this.showToast(err?.error?.message ?? 'Erreur lors du marquage.', 'error');
      }
    });
  }

  marquerDepart(employeeId: number) {
    this.presenceActionLoading.set(employeeId);
    this.presenceService.marquerDepart(employeeId).subscribe({
      next: (updated) => {
        this.presences.update(list => list.map(p => p.employeeId === employeeId ? updated : p));
        this.presenceActionLoading.set(null);
        this.showToast('Départ marqué avec succès.', 'success');
      },
      error: (err) => {
        this.presenceActionLoading.set(null);
        this.showToast(err?.error?.message ?? 'Erreur lors du marquage.', 'error');
      }
    });
  }

getPresenceStatutLabel(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      ABSENT: 'Absent', PRESENT: 'Présent', RETARD: 'Retard', TERMINE: 'Terminé'
    };
    return map[s];
  }

  getPresenceStatutClass(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      ABSENT: 'absent', PRESENT: 'present', RETARD: 'retard', TERMINE: 'termine'
    };
    return map[s];
  }

  getEmployeeInitials(p: PresenceResponse): string {
    return (p.employeePrenom.charAt(0) + p.employeeNom.charAt(0)).toUpperCase();
  }

  isToday(iso: string): boolean {
    return iso === this.getTodayDate();
  }

  formatHeuresTravaillees(h: number): string {
    const totalMin = Math.round(h * 60);
    const heures = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (heures === 0) return `${min}min`;
    if (min === 0) return `${heures}h`;
    return `${heures}h ${min}min`;
  }

  formatPresenceDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  // ── Profile ───────────────────────────────────────────────────
  loadProfile() {
    this.loading.set(true);
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.profileForm = {
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          telephone: data.telephone ?? ''
        };
        this.loading.set(false);
      },
      error: () => {
        const user = this.authService.currentUser();
        if (user) {
          this.profile.set({
            id: 0, nom: user.nom, prenom: user.prenom,
            email: user.email, telephone: '', role: user.role, activated: user.activated
          });
          this.profileForm = {
            nom: user.nom, prenom: user.prenom,
            email: user.email, telephone: ''
          };
        }
        this.loading.set(false);
      }
    });
  }

  saveProfile() {
    this.error.set(''); this.success.set('');
    this.saveLoading.set(true);
    this.profileService.updateProfile(this.profileForm).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.saveLoading.set(false);
        this.success.set('Profil mis à jour avec succès !');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err: Error) => {
        this.saveLoading.set(false);
        this.error.set(err.message ?? 'Erreur lors de la mise à jour.');
      }
    });
  }

  savePassword() {
    this.error.set(''); this.success.set('');
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.error.set('Veuillez remplir tous les champs.'); return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.error.set('Les nouveaux mots de passe ne correspondent pas.'); return;
    }
    if (this.passwordForm.newPassword.length < 6) {
      this.error.set('Le mot de passe doit contenir au moins 6 caractères.'); return;
    }
    this.saveLoading.set(true);
    this.profileService.updateProfile({
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        this.saveLoading.set(false);
        this.success.set('Mot de passe modifié avec succès !');
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err: Error) => {
        this.saveLoading.set(false);
        this.error.set(err.message ?? 'Erreur lors du changement.');
      }
    });
  }

  // ── Rendez-vous ───────────────────────────────────────────────
  loadServiceGroups() {
    this.rendezVousService.getServicesGroupes().subscribe({
      next: (groups) => this.serviceGroups.set(groups),
      error: () => {}
    });
  }

  loadRendezVous() {
    this.rdvLoading.set(true);
    this.rendezVousService.listerTous().subscribe({
      next: (data) => { this.rendezVous.set(data); this.rdvLoading.set(false); },
      error: () => { this.rdvLoading.set(false); this.showToast('Erreur lors du chargement.', 'error'); }
    });
    // Charger aussi les avis pour afficher les boutons correctement dans la liste RDV
    if (this.avis().length === 0) {
      this.avisService.listerTous().subscribe({
        next: (data) => this.avis.set(data),
        error: () => {}
      });
    }
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    this.sidebarOpen.set(false); // close sidebar on mobile after nav
    if ((tab === 'rendez-vous' || tab === 'rendez-vous-mariees') && this.rendezVous().length === 0) {
      this.loadRendezVous();
    }
    if (tab === 'offres') {
      this.loadClientesFidelite();
    }
    if (tab === 'stock') {
      this.loadStock();
    }
    if (tab === 'presence') {
      this.loadPresence();
    }
    if (tab === 'avis') {
      this.loadAvis();
    }
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }

  // ── Fidélité ──────────────────────────────────────────────────
  loadClientesFidelite() {
    this.fideliteLoading.set(true);
    this.fideliteService.getClientesFidelite().subscribe({
      next: (data) => { this.clientesFidelite.set(data); this.fideliteLoading.set(false); },
      error: () => { this.fideliteLoading.set(false); this.showToast('Erreur lors du chargement des clientes.', 'error'); }
    });
  }

  ouvrirModalOffre(cliente: ClienteFideliteDto) {
    this.offreModalCliente.set(cliente);
  }

  fermerModalOffre() {
    this.offreModalCliente.set(null);
  }

  confirmerUtiliserOffre(typeOffre: TypeOffre) {
    const cliente = this.offreModalCliente();
    if (!cliente) return;
    this.fermerModalOffre();
    this.fideliteService.utiliserOffre(cliente.telephoneClient, typeOffre).subscribe({
      next: (updated) => {
        this.clientesFidelite.update(list =>
          list.map(c => c.telephoneClient === cliente.telephoneClient ? updated : c)
        );
        const label = typeOffre === 'SERVICE_GRATUIT' ? 'Service gratuit' : 'Promo prochain service';
        this.showToast(`Offre utilisée : ${label} !`, 'success');
      },
      error: () => this.showToast('Erreur lors de l\'utilisation de l\'offre.', 'error')
    });
  }

  getClienteInitials(c: ClienteFideliteDto): string {
    return (c.prenomClient.charAt(0) + c.nomClient.charAt(0)).toUpperCase();
  }

  formatClientDepuis(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  getProgressPercent(c: ClienteFideliteDto): number {
    return (c.servicesVersProchainOffre / 5) * 100;
  }

  // ── Avis Clientes ─────────────────────────────────────────────
  loadAvis() {
    this.avisLoading.set(true);
    this.avisService.listerTous().subscribe({
      next: (data) => { this.avis.set(data); this.avisLoading.set(false); },
      error: () => { this.avisLoading.set(false); this.showToast('Erreur lors du chargement des avis.', 'error'); }
    });
  }

  openAddAvisModal(rdv: RendezVousResponse) {
    this.avisModalRdv.set(rdv);
    this.avisForm = { note: 5, commentaire: '' };
    this.avisModalError.set('');
  }

  closeAvisModal() {
    this.avisModalRdv.set(null);
    this.avisModalError.set('');
  }

  submitAvis() {
    const rdv = this.avisModalRdv();
    if (!rdv) return;
    if (!this.avisForm.note || this.avisForm.note < 1 || this.avisForm.note > 5) {
      this.avisModalError.set('Veuillez sélectionner une note entre 1 et 5.');
      return;
    }
    this.avisModalLoading.set(true);
    this.avisService.creer(rdv.id, this.avisForm).subscribe({
      next: (created) => {
        this.avis.update(list => [created, ...list]);
        this.avisModalLoading.set(false);
        this.closeAvisModal();
        this.showToast('Avis ajouté avec succès !', 'success');
      },
      error: (err) => {
        this.avisModalLoading.set(false);
        this.avisModalError.set(err?.error?.message ?? 'Erreur lors de l\'ajout de l\'avis.');
      }
    });
  }

  confirmDeleteAvis(id: number) { this.avisDeleteConfirmId.set(id); }
  cancelDeleteAvis()            { this.avisDeleteConfirmId.set(null); }

  deleteAvis(id: number) {
    this.avisService.supprimer(id).subscribe({
      next: () => {
        this.avis.update(list => list.filter(a => a.id !== id));
        this.avisDeleteConfirmId.set(null);
        this.showToast('Avis supprimé.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  getStarsArray(note: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getNoteLabel(note: number): string {
    const map: Record<number, string> = { 1: 'Très mauvais', 2: 'Mauvais', 3: 'Moyen', 4: 'Bien', 5: 'Excellent' };
    return map[note] ?? '';
  }

  getNoteClass(note: number): string {
    if (note <= 2) return 'note--bad';
    if (note === 3) return 'note--medium';
    return 'note--good';
  }

  formatAvisDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getAvisClientInitials(a: AvisClienteDto): string {
    return (a.prenomClient.charAt(0) + a.nomClient.charAt(0)).toUpperCase();
  }

  // ── Modal ─────────────────────────────────────────────────────
  openCreateModal() {
    this.rdvForm = {
      nomClient: '', prenomClient: '', telephoneClient: '',
      typeClient: TypeClient.NORMAL,
      dateDebutDate: '', dateDebutHeure: '', dureeMinutes: 60,
      services: [this.newServiceRow()],
      statutMariee: StatutMariee.NON_VOILEE,
      marieeServices: [this.newMarieeServiceRow()],
      normaleServices: []
    };
    this.rdvModalError.set('');
    this.rdvModalMode.set('create');
    this.showRdvModal.set(true);
  }

  openEditModal(rdv: RendezVousResponse) {
    this.selectedRdv.set(rdv);
    const dateStr = rdv.dateDebut.substring(0, 16);
    const datePart = dateStr.substring(0, 10);
    const timePart = dateStr.substring(11, 16);
    const isMariage = rdv.typeClient === TypeClient.MARIAGE;
    this.rdvForm = {
      nomClient: rdv.nomClient,
      prenomClient: rdv.prenomClient,
      telephoneClient: rdv.telephoneClient ?? '',
      typeClient: rdv.typeClient,
      dateDebutDate: datePart,
      dateDebutHeure: timePart,
      dureeMinutes: rdv.dureeMinutes,
      services: isMariage ? [] : rdv.services.map(s => ({
        typeService: s.typeService,
        date: s.datePrevue ? s.datePrevue.substring(0, 10) : datePart,
        heure: s.datePrevue ? s.datePrevue.substring(11, 16) : timePart,
        dureeMinutes: s.dureeService ?? rdv.dureeMinutes,
        employeeId: s.employeeId,
        availableEmployees: [{
          id: s.employeeId, nom: s.employeeNom, prenom: s.employeePrenom,
          email: '', role: Role.EMPLOYEE, activated: true,
          specialites: s.employeeSpecialite ? [s.employeeSpecialite as string] : []
        }] as UserDto[],
        loadingEmployees: false
      })),
      statutMariee: rdv.statutMariee ?? StatutMariee.NON_VOILEE,
      marieeServices: isMariage ? rdv.services
        .filter(s => !s.employeeId)
        .map(s => ({
          typeService: s.typeService,
          date: s.datePrevue ? s.datePrevue.substring(0, 10) : datePart,
          heure: s.datePrevue ? s.datePrevue.substring(11, 16) : timePart,
          codeRobe: s.codeRobe ?? ''
        })) : [this.newMarieeServiceRow()],
      normaleServices: isMariage ? rdv.services
        .filter(s => !!s.employeeId)
        .map(s => ({
          typeService: s.typeService,
          date: s.datePrevue ? s.datePrevue.substring(0, 10) : datePart,
          heure: s.datePrevue ? s.datePrevue.substring(11, 16) : timePart,
          dureeMinutes: s.dureeService ?? rdv.dureeMinutes,
          employeeId: s.employeeId,
          availableEmployees: [{
            id: s.employeeId, nom: s.employeeNom, prenom: s.employeePrenom,
            email: '', role: Role.EMPLOYEE, activated: true,
            specialites: s.employeeSpecialite ? [s.employeeSpecialite as string] : []
          }] as UserDto[],
          loadingEmployees: false
        })) : []
    };
    this.rdvModalError.set('');
    this.rdvModalMode.set('edit');
    this.showRdvModal.set(true);
  }

  closeRdvModal() {
    this.showRdvModal.set(false);
    this.rdvModalError.set('');
  }

  newServiceRow(): ServiceFormRow {
    const services = this.rdvForm.services;
    let lastDate = '';
    let nextHeure = '';
    if (services.length > 0) {
      const last = services[services.length - 1];
      lastDate = last.date;
      if (last.heure && last.dureeMinutes) {
        const endMin = this.timeToMinutes(last.heure) + last.dureeMinutes;
        const h = Math.floor(endMin / 60);
        const m = endMin % 60;
        if (h < 24) nextHeure = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }
    return { typeService: '', date: lastDate, heure: nextHeure, dureeMinutes: 60, employeeId: null, availableEmployees: [], loadingEmployees: false };
  }

  addServiceRow() {
    this.rdvForm.services.push(this.newServiceRow());
  }

  removeServiceRow(index: number) {
    if (this.rdvForm.services.length > 1) {
      this.rdvForm.services.splice(index, 1);
    }
  }

  onTypeServiceChange(index: number) {
    const row = this.rdvForm.services[index];
    row.employeeId = null;
    row.availableEmployees = [];
    row.heure = '';
    if (row.typeService) {
      const meta = TYPE_SERVICE_META[row.typeService];
      if (meta) row.dureeMinutes = meta.dureeMinutes;
      if (row.date) {
        this.fetchNormalServiceAllEmployees(index);
      }
    }
  }

  onNormalServiceDateChange(i: number) {
    const row = this.rdvForm.services[i];
    row.employeeId = null;
    row.availableEmployees = [];
    row.heure = '';
    if (row.typeService && row.date) {
      this.fetchNormalServiceAllEmployees(i);
    }
  }

  fetchNormalServiceAllEmployees(i: number) {
    const row = this.rdvForm.services[i];
    if (!row.typeService || !row.date) return;
    const specialite = this.getSpecialiteForService(row.typeService as TypeService);
    if (!specialite) return;
    row.loadingEmployees = true;

    const canCheckAvailability = !!row.heure && !!row.dureeMinutes;
    const requestUpdater = canCheckAvailability
      ? this.rendezVousService.getEmployesDisponiblesParService(
          row.typeService as TypeService,
          `${row.date}T${row.heure}:00`,
          row.dureeMinutes
        )
      : this.rendezVousService.getEmployesParSpecialite(specialite);

    requestUpdater.subscribe({
      next: (emps) => { row.availableEmployees = emps; row.loadingEmployees = false; },
      error: () => { row.availableEmployees = []; row.loadingEmployees = false; }
    });
  }

  getSpecialiteForService(ts: TypeService | ''): Specialite | null {
    if (!ts) return null;
    for (const group of this.serviceGroups()) {
      if (group.services.includes(ts as TypeService)) return group.specialite;
    }
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────
  submitCreate() {
    if (!this.validateRdvForm()) return;
    this.rdvModalLoading.set(true);
    this.rdvModalError.set('');

    const request = this.buildRequest();
    this.rendezVousService.creer(request).subscribe({
      next: (rdv) => {
        this.rdvModalLoading.set(false);
        this.rendezVous.update(list => [rdv, ...list]);
        this.closeRdvModal();
        this.showToast('Rendez-vous créé avec succès !', 'success');
      },
      error: (err: any) => {
        this.rdvModalLoading.set(false);
        const msg: string = err.error?.message ?? err.message ?? 'Erreur lors de la création.';
        this.rdvModalError.set(msg);
        // Si conflit d'employé, rafraîchir toutes les listes de disponibilité
        if (msg.toLowerCase().includes('occupé') || msg.toLowerCase().includes('conflit')) {
          this.refreshAllEmployeeAvailability();
        }
      }
    });
  }

  submitEdit() {
    const rdv = this.selectedRdv();
    if (!rdv) return;
    if (!this.validateRdvForm()) return;
    this.rdvModalLoading.set(true);
    this.rdvModalError.set('');

    const request = this.buildRequest();
    this.rendezVousService.modifier(rdv.id, request).subscribe({
      next: (updated) => {
        this.rdvModalLoading.set(false);
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.closeRdvModal();
        this.showToast('Rendez-vous modifié avec succès !', 'success');
      },
      error: (err: any) => {
        this.rdvModalLoading.set(false);
        const msg: string = err.error?.message ?? err.message ?? 'Erreur lors de la modification.';
        this.rdvModalError.set(msg);
        if (msg.toLowerCase().includes('occupé') || msg.toLowerCase().includes('conflit')) {
          this.refreshAllEmployeeAvailability();
        }
      }
    });
  }

  /** Re-fetch available employees for all service rows (called after a conflict error). */
  private refreshAllEmployeeAvailability(): void {
    this.rdvForm.services.forEach((_, i) => this.fetchNormalServiceAllEmployees(i));
    this.rdvForm.normaleServices.forEach((_, i) => this.fetchNormaleServiceAllMarieeEmployees(i));
  }

  private buildRequest(): RendezVousRequest {
    const isMariage = this.rdvForm.typeClient === TypeClient.MARIAGE;

    if (isMariage) {
      const allDates: Date[] = [];
      const services: ServiceRendezVousRequest[] = [];

      for (const s of this.rdvForm.marieeServices) {
        const dt = new Date(`${s.date}T${s.heure}:00`);
        allDates.push(dt);
        services.push({
          employeeId: null,
          typeService: s.typeService as TypeService,
          datePrevue: `${s.date}T${s.heure}:00`,
          dureeService: TYPE_SERVICE_META[s.typeService]?.dureeMinutes ?? 90,
          codeRobe: s.codeRobe || undefined
        });
      }
      for (const s of this.rdvForm.normaleServices) {
        const dt = new Date(`${s.date}T${s.heure}:00`);
        allDates.push(dt);
        services.push({
          employeeId: s.employeeId ? Number(s.employeeId) : null,
          typeService: s.typeService as TypeService,
          datePrevue: `${s.date}T${s.heure}:00`,
          dureeService: s.dureeMinutes
        });
      }

      const minDate = allDates.reduce((a, b) => a < b ? a : b);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateDebutStr = `${minDate.getFullYear()}-${pad(minDate.getMonth()+1)}-${pad(minDate.getDate())}T${pad(minDate.getHours())}:${pad(minDate.getMinutes())}:00`;

      return {
        nomClient: this.rdvForm.nomClient,
        prenomClient: this.rdvForm.prenomClient,
        telephoneClient: this.rdvForm.telephoneClient || undefined,
        typeClient: TypeClient.MARIAGE,
        statutMariee: this.rdvForm.statutMariee,
        dateDebut: dateDebutStr,
        dureeMinutes: services.reduce((sum, s) => sum + (s.dureeService ?? 60), 0),
        services
      };
    }

    const filteredServices = this.rdvForm.services.filter(s => s.typeService);
    const allDates = filteredServices.map(s => new Date(`${s.date}T${s.heure}:00`));
    const minDate = allDates.reduce((a, b) => a < b ? a : b);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateDebutStr = `${minDate.getFullYear()}-${pad(minDate.getMonth()+1)}-${pad(minDate.getDate())}T${pad(minDate.getHours())}:${pad(minDate.getMinutes())}:00`;
    return {
      nomClient: this.rdvForm.nomClient,
      prenomClient: this.rdvForm.prenomClient,
      telephoneClient: this.rdvForm.telephoneClient || undefined,
      typeClient: this.rdvForm.typeClient,
      dateDebut: dateDebutStr,
      dureeMinutes: filteredServices.reduce((sum, s) => sum + s.dureeMinutes, 0),
      services: filteredServices.map(s => ({
        employeeId: s.employeeId ? Number(s.employeeId) : null,
        typeService: s.typeService as TypeService,
        datePrevue: `${s.date}T${s.heure}:00`,
        dureeService: s.dureeMinutes
      }))
    };
  }

  private validateRdvForm(): boolean {
    if (!this.rdvForm.nomClient.trim() || !this.rdvForm.prenomClient.trim()) {
      this.rdvModalError.set('Le nom et prénom sont obligatoires.');
      return false;
    }

    if (this.rdvForm.typeClient === TypeClient.MARIAGE) {
      const hasServices = this.rdvForm.marieeServices.length > 0 || this.rdvForm.normaleServices.length > 0;
      if (!hasServices) { this.rdvModalError.set('Ajoutez au moins un service.'); return false; }
      for (const s of this.rdvForm.marieeServices) {
        if (!s.typeService) { this.rdvModalError.set('Sélectionnez un type de service mariée.'); return false; }
        if (!s.date || !s.heure) { this.rdvModalError.set('Renseignez date et heure pour chaque service mariée.'); return false; }
      }
      for (const s of this.rdvForm.normaleServices) {
        if (!s.typeService) { this.rdvModalError.set('Sélectionnez un type de service normal.'); return false; }
        if (!s.date || !s.heure) { this.rdvModalError.set('Renseignez date et heure pour chaque service normal.'); return false; }
        if (!s.employeeId) { this.rdvModalError.set('Sélectionnez une employée pour chaque service normal.'); return false; }
      }
      // Check conflicts between normaleServices (same employee, overlapping times)
      for (let i = 0; i < this.rdvForm.normaleServices.length; i++) {
        for (let j = i + 1; j < this.rdvForm.normaleServices.length; j++) {
          const a = this.rdvForm.normaleServices[i];
          const b = this.rdvForm.normaleServices[j];
          if (!a.employeeId || a.employeeId !== b.employeeId) continue;
          if (a.date !== b.date || !a.heure || !b.heure) continue;
          const aStart = this.timeToMinutes(a.heure);
          const aEnd = aStart + (a.dureeMinutes ?? 60);
          const bStart = this.timeToMinutes(b.heure);
          const bEnd = bStart + (b.dureeMinutes ?? 60);
          if (aStart < bEnd && bStart < aEnd) {
            this.rdvModalError.set(`Conflit : les services normaux ${i + 1} et ${j + 1} ont la même employée avec des horaires qui se chevauchent.`);
            return false;
          }
        }
      }
      return true;
    }

    if (this.rdvForm.services.length === 0) {
      this.rdvModalError.set('Ajoutez au moins un service.'); return false;
    }
    for (const srv of this.rdvForm.services) {
      if (!srv.typeService) { this.rdvModalError.set('Sélectionnez un type de service pour chaque ligne.'); return false; }
      if (!srv.date || !srv.heure) { this.rdvModalError.set('Renseignez la date et l\'heure pour chaque service.'); return false; }
      if (!srv.dureeMinutes || srv.dureeMinutes < 1) { this.rdvModalError.set('La durée doit être d\'au moins 1 minute pour chaque service.'); return false; }
      if (!srv.employeeId) { this.rdvModalError.set('Sélectionnez une employée pour chaque service.'); return false; }
    }
    // Check for conflicts between services within the same RDV
    for (let i = 0; i < this.rdvForm.services.length; i++) {
      for (let j = i + 1; j < this.rdvForm.services.length; j++) {
        const a = this.rdvForm.services[i];
        const b = this.rdvForm.services[j];
        if (!a.employeeId || a.employeeId !== b.employeeId) continue;
        if (a.date !== b.date || !a.heure || !b.heure) continue;
        const aStart = this.timeToMinutes(a.heure);
        const aEnd = aStart + (a.dureeMinutes ?? 60);
        const bStart = this.timeToMinutes(b.heure);
        const bEnd = bStart + (b.dureeMinutes ?? 60);
        if (aStart < bEnd && bStart < aEnd) {
          this.rdvModalError.set(`Conflit : les services ${i + 1} et ${j + 1} ont la même employée avec des horaires qui se chevauchent.`);
          return false;
        }
      }
    }
    return true;
  }

  // ── Status actions ────────────────────────────────────────────
  changerStatut(id: number, statut: StatutRendezVous) {
    this.rendezVousService.changerStatut(id, statut).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        const labels: Record<StatutRendezVous, string> = {
          EN_ATTENTE: 'remis en attente', CONFIRME: 'confirmé',
          EN_COURS: 'en cours', ANNULE: 'annulé', TERMINE: 'terminé'
        };
        this.showToast(`Rendez-vous ${labels[statut]}.`, 'success');
      },
      error: () => this.showToast('Erreur lors du changement de statut.', 'error')
    });
  }

  changerStatutService(serviceId: number, statut: StatutService) {
    this.rendezVousService.changerStatutService(serviceId, statut).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        const labels: Record<StatutService, string> = {
          EN_ATTENTE: 'remis en attente', CONFIRME: 'confirmé',
          EN_COURS: 'en cours', ANNULE: 'annulé', TERMINE: 'terminé'
        };
        this.showToast(`Service ${labels[statut]}.`, 'success');
      },
      error: () => this.showToast('Erreur lors du changement de statut du service.', 'error')
    });
  }

  confirmDelete(id: number) { this.deleteConfirmId.set(id); }
  cancelDelete()            { this.deleteConfirmId.set(null); }

  deleteRdv(id: number) {
    this.rendezVousService.supprimer(id).subscribe({
      next: () => {
        this.rendezVous.update(list => list.filter(r => r.id !== id));
        this.deleteConfirmId.set(null);
        this.showToast('Rendez-vous supprimé.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  // ── Toast ─────────────────────────────────────────────────────
  showToast(msg: string, type: 'success' | 'error') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(''), 4000);
  }

  // ── Helpers ───────────────────────────────────────────────────
  getInitials(): string {
    const u = this.profile();
    if (!u) return '?';
    return (u.prenom.charAt(0) + u.nom.charAt(0)).toUpperCase();
  }

  getClientInitials(rdv: RendezVousResponse): string {
    return (rdv.prenomClient.charAt(0) + rdv.nomClient.charAt(0)).toUpperCase();
  }

  getStatutLabel(statut: StatutRendezVous): string {
    const map: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'En attente', CONFIRME: 'Confirmé',
      EN_COURS: 'En cours', ANNULE: 'Annulé', TERMINE: 'Terminé'
    };
    return map[statut];
  }

  getStatutClass(statut: StatutRendezVous): string {
    const map: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'en-attente', CONFIRME: 'confirme',
      EN_COURS: 'en-cours', ANNULE: 'annule', TERMINE: 'termine'
    };
    return map[statut];
  }

  getTypeClientLabel(type: TypeClient): string {
    return type === TypeClient.MARIAGE ? 'Mariée' : 'Normal';
  }

  filterAlpha(event: Event, field: 'nomClient' | 'prenomClient'): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '');
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
    this.rdvForm[field] = cleaned;
  }

  getTypeServiceLabel(ts: TypeService | string): string {
    return TYPE_SERVICE_META[ts]?.label ?? String(ts);
  }

  getDisplayedServicesForGroup(group: TypeServiceGroupeDto, normalOnly: boolean): TypeService[] {
    if (group.specialite !== Specialite.MAQUILLEUSE) {
      return group.services;
    }
    if (!normalOnly) {
      return group.services;
    }
    return group.services.filter(ts => ts === TypeService.MAQUILLAGE_PAR_EQUIPE);
  }

  getServiceDefaultDuree(ts: TypeService | string): number {
    return TYPE_SERVICE_META[ts]?.dureeMinutes ?? 60;
  }

  formatDuree(minutes: number): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  }

  getSpecialiteLabel(sp: Specialite | string): string {
    const map: Record<string, string> = {
      SOINS: 'Soins', COIFFEUSE: 'Coiffeure',
      ESTHETICIENNE: 'Esthétique', ONGLERIE: 'Onglerie', MAQUILLEUSE: 'Maquillage'
    };
    return map[sp] ?? String(sp);
  }

  getTodayMin(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  getTodayDate(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    // Pure date (YYYY-MM-DD) — parse as local to avoid UTC-offset issues
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const date = new Date(isDateOnly ? dateStr + 'T00:00:00' : dateStr);
    if (isDateOnly) {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr || /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  canEdit(rdv: RendezVousResponse): boolean {
    return rdv.statut === StatutRendezVous.EN_ATTENTE || rdv.statut === StatutRendezVous.CONFIRME;
  }

  // Ouvre le modal en mode Mariée directement
  openCreateMarieeModal() {
    this.rdvForm = {
      nomClient: '', prenomClient: '', telephoneClient: '',
      typeClient: TypeClient.MARIAGE, dateDebutDate: '', dateDebutHeure: '', dureeMinutes: 60,
      services: [],
      statutMariee: StatutMariee.NON_VOILEE,
      marieeServices: [this.newMarieeServiceRow()],
      normaleServices: []
    };
    this.rdvModalError.set('');
    this.rdvModalMode.set('create');
    this.showRdvModal.set(true);
  }

  // Appelé quand on change le type client dans le modal
  onTypeClientChange() {
    if (this.rdvForm.typeClient === TypeClient.MARIAGE) {
      this.rdvForm.services = [];
      if (this.rdvForm.marieeServices.length === 0) {
        this.rdvForm.marieeServices = [this.newMarieeServiceRow()];
      }
    } else {
      this.rdvForm.marieeServices = [];
      this.rdvForm.normaleServices = [];
      if (this.rdvForm.services.length === 0) {
        this.rdvForm.services = [this.newServiceRow()];
      }
    }
  }

  // ── Mariée service helpers (dans le modal principal) ──────────
  newMarieeServiceRow(): MarieeServiceRow {
    return { typeService: '', date: '', heure: '', codeRobe: '' };
  }

  newNormaleServiceMarieeRow(): NormaleServiceMarieeRow {
    const services = this.rdvForm.normaleServices;
    let lastDate = '';
    let nextHeure = '';
    if (services.length > 0) {
      const last = services[services.length - 1];
      lastDate = last.date;
      if (last.heure && last.dureeMinutes) {
        const endMin = this.timeToMinutes(last.heure) + last.dureeMinutes;
        const h = Math.floor(endMin / 60);
        const m = endMin % 60;
        if (h < 24) nextHeure = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      }
    }
    return { typeService: '', date: lastDate, heure: nextHeure, dureeMinutes: 60,
             employeeId: null, availableEmployees: [], loadingEmployees: false };
  }

  addMarieeService() { this.rdvForm.marieeServices.push(this.newMarieeServiceRow()); }
  removeMarieeService(i: number) {
    if (this.rdvForm.marieeServices.length > 1) this.rdvForm.marieeServices.splice(i, 1);
  }

  addNormaleServiceMariee() { this.rdvForm.normaleServices.push(this.newNormaleServiceMarieeRow()); }
  removeNormaleServiceMariee(i: number) { this.rdvForm.normaleServices.splice(i, 1); }

  onNormaleServiceMarieeChange(i: number) {
    const row = this.rdvForm.normaleServices[i];
    row.employeeId = null;
    row.availableEmployees = [];
    row.heure = '';

    if (row.typeService) {
      const meta = TYPE_SERVICE_META[row.typeService];
      if (meta) {
        row.dureeMinutes = meta.dureeMinutes;
      }
    }

    if (row.typeService && row.date) {
      this.fetchNormaleServiceAllMarieeEmployees(i);
    }
  }

  onNormaleServiceMarieeDateChange(i: number) {
    const row = this.rdvForm.normaleServices[i];
    row.employeeId = null;
    row.availableEmployees = [];
    row.heure = '';
    if (row.typeService && row.date) {
      this.fetchNormaleServiceAllMarieeEmployees(i);
    }
  }

  fetchNormaleServiceAllMarieeEmployees(i: number) {
    const row = this.rdvForm.normaleServices[i];
    if (!row.typeService || !row.date) return;
    const specialite = this.getSpecialiteForService(row.typeService as TypeService);
    if (!specialite) return;
    row.loadingEmployees = true;

    const canCheckAvailability = !!row.heure && !!row.dureeMinutes;
    const requestUpdater = canCheckAvailability
      ? this.rendezVousService.getEmployesDisponiblesParService(
          row.typeService as TypeService,
          `${row.date}T${row.heure}:00`,
          row.dureeMinutes
        )
      : this.rendezVousService.getEmployesParSpecialite(specialite);

    requestUpdater.subscribe({
      next: (emps) => {
        row.availableEmployees = emps;
        row.loadingEmployees = false;
        if (row.employeeId && !emps.some(e => e.id === row.employeeId)) {
          row.employeeId = null;
        }
      },
      error: () => { row.availableEmployees = []; row.loadingEmployees = false; }
    });
  }

  // ── Filtered mariée RDVs ──────────────────────────────────────
  filteredMarieeRdv = computed(() => {
    let list = this.rdvBaseList().filter(r => r.typeClient === TypeClient.MARIAGE);
    const sub = this.marieeSubFilter();
    if (sub === 'PURE')     list = list.filter(r => !r.services.some(s => s.employeeId));
    if (sub === 'SERVICES') list = list.filter(r =>  r.services.some(s => s.employeeId));
    return list;
  });

  getStatutMarieeLabel(s: StatutMariee): string {
    return s === StatutMariee.VOILEE ? 'Voilée' : 'Non voilée';
  }

  // ── Time Slot Picker ──────────────────────────────────────────
  openTimePickerKey = signal<string | null>(null);

  readonly TIME_SLOTS: string[] = (() => {
    const slots: string[] = [];
    for (let h = 8; h <= 20; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 20) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  })();

  private timeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  isSlotBooked(employeeId: number | null, date: string, slotTime: string, excludeFormIndex?: number, excludeMarieeIndex?: number): boolean {
    if (!employeeId || !date || !slotTime) return false;
    const slotMin = this.timeToMinutes(slotTime);
    const currentRdvId = this.selectedRdv()?.id;

    // Check existing saved appointments
    for (const rdv of this.rendezVous()) {
      if (rdv.statut === StatutRendezVous.ANNULE || rdv.statut === StatutRendezVous.TERMINE) continue;
      if (currentRdvId && rdv.id === currentRdvId) continue;
      for (const s of rdv.services) {
        if (s.employeeId !== employeeId) continue;
        if (!s.datePrevue?.startsWith(date)) continue;
        const startMin = this.timeToMinutes(s.datePrevue.substring(11, 16));
        const endMin = startMin + (s.dureeService ?? 60);
        if (slotMin >= startMin && slotMin < endMin) return true;
      }
    }

    // Check other services in the current normal form
    for (let j = 0; j < this.rdvForm.services.length; j++) {
      if (j === excludeFormIndex) continue;
      const other = this.rdvForm.services[j];
      if (other.employeeId !== employeeId || other.date !== date || !other.heure) continue;
      const startMin = this.timeToMinutes(other.heure);
      const endMin = startMin + (other.dureeMinutes ?? 60);
      if (slotMin >= startMin && slotMin < endMin) return true;
    }

    // Check other normaleServices in the current mariée form
    for (let j = 0; j < this.rdvForm.normaleServices.length; j++) {
      if (j === excludeMarieeIndex) continue;
      const other = this.rdvForm.normaleServices[j];
      if (other.employeeId !== employeeId || other.date !== date || !other.heure) continue;
      const startMin = this.timeToMinutes(other.heure);
      const endMin = startMin + (other.dureeMinutes ?? 60);
      if (slotMin >= startMin && slotMin < endMin) return true;
    }

    return false;
  }

  toggleTimePicker(key: string) {
    this.openTimePickerKey.update(cur => cur === key ? null : key);
  }

  closeTimePicker() {
    this.openTimePickerKey.set(null);
  }

  selectNormalServiceTime(i: number, time: string) {
    const row = this.rdvForm.services[i];
    row.heure = time;
    this.closeTimePicker();
  }

  selectNormaleMarieeSrvTime(i: number, time: string) {
    const row = this.rdvForm.normaleServices[i];
    row.heure = time;
    this.closeTimePicker();
    if (row.typeService && row.date) {
      this.fetchNormaleServiceAllMarieeEmployees(i);
    }
  }

  selectMarieeSrvTime(i: number, time: string) {
    this.rdvForm.marieeServices[i].heure = time;
    this.closeTimePicker();
  }

  // ── Stock ─────────────────────────────────────────────────────
  loadStock() {
    this.stockLoading.set(true);
    this.stockService.getAllProduits().subscribe({
      next: (data) => { this.produits.set(data); this.stockLoading.set(false); },
      error: () => { this.stockLoading.set(false); this.showToast('Erreur lors du chargement du stock.', 'error'); }
    });
  }

  openCreateStockModal() {
    this.stockForm = { nom: '', categorie: '', quantite: 0, quantiteMinimum: 0, unite: '', nomFournisseur: '', reference: '' };
    this.stockModalError.set('');
    this.stockModalMode.set('create');
    this.stockModalOpen.set(true);
  }

  openEditStockModal(p: ProduitStockDto) {
    this.selectedProduit.set(p);
    this.stockForm = {
      nom: p.nom,
      categorie: p.categorie,
      quantite: p.quantite,
      quantiteMinimum: p.quantiteMinimum,
      unite: p.unite,
      nomFournisseur: p.nomFournisseur ?? '',
      reference: p.reference ?? ''
    };
    this.stockModalError.set('');
    this.stockModalMode.set('edit');
    this.stockModalOpen.set(true);
  }

  closeStockModal() {
    this.stockModalOpen.set(false);
    this.stockModalError.set('');
    this.selectedProduit.set(null);
  }

  submitStockForm() {
    if (!this.stockForm.nom.trim()) { this.stockModalError.set('Le nom du produit est obligatoire.'); return; }
    if (!this.stockForm.categorie) { this.stockModalError.set('La catégorie est obligatoire.'); return; }
    if (this.stockForm.quantite < 0) { this.stockModalError.set('La quantité ne peut pas être négative.'); return; }
    if (this.stockForm.quantiteMinimum < 0) { this.stockModalError.set('La quantité minimum ne peut pas être négative.'); return; }
    if (!this.stockForm.unite.trim()) { this.stockModalError.set('L\'unité est obligatoire.'); return; }

    this.stockModalLoading.set(true);
    const req = this.stockForm as ProduitStockRequest;

    if (this.stockModalMode() === 'create') {
      this.stockService.creer(req).subscribe({
        next: (p) => {
          this.produits.update(list => [p, ...list]);
          this.closeStockModal();
          this.stockModalLoading.set(false);
          this.showToast('Produit ajouté avec succès !', 'success');
        },
        error: () => { this.stockModalLoading.set(false); this.stockModalError.set('Erreur lors de la création.'); }
      });
    } else {
      const id = this.selectedProduit()!.id;
      this.stockService.modifier(id, req).subscribe({
        next: (p) => {
          this.produits.update(list => list.map(x => x.id === id ? p : x));
          this.closeStockModal();
          this.stockModalLoading.set(false);
          this.showToast('Produit modifié avec succès !', 'success');
        },
        error: () => { this.stockModalLoading.set(false); this.stockModalError.set('Erreur lors de la modification.'); }
      });
    }
  }

  confirmDeleteStock(id: number) { this.stockDeleteConfirmId.set(id); }
  cancelDeleteStock()             { this.stockDeleteConfirmId.set(null); }

  deleteStock(id: number) {
    this.stockService.supprimer(id).subscribe({
      next: () => {
        this.produits.update(list => list.filter(p => p.id !== id));
        this.stockDeleteConfirmId.set(null);
        this.showToast('Produit supprimé.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  getCategorieLabel(c: CategorieStock): string {
    return CATEGORIE_STOCK_LABELS[c] ?? String(c);
  }

  logout() { this.authService.logout(); }
}
