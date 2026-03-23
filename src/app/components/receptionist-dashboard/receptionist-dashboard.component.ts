import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import { FideliteService } from '../../services/fidelite.service';
import { PresenceService } from '../../services/presence.service';
import { StockService } from '../../services/stock.service';
import {
  UserDto,
  UpdateProfileRequest,
  RendezVousResponse,
  RendezVousRequest,
  ServiceRendezVousRequest,
  TypeService,
  TypeClient,
  StatutMariee,
  StatutRendezVous,
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
  ProduitStockRequest
} from '../../models/auth.models';

type Tab = 'profile' | 'password' | 'rendez-vous' | 'rendez-vous-mariees' | 'offres' | 'presence' | 'stock';

export interface ServiceFormRow {
  typeService: TypeService | '';
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

  // ── Sidebar mobile ────────────────────────────────────────────
  sidebarOpen = signal(false);

  // ── Fidélité state ────────────────────────────────────────────
  clientesFidelite = signal<ClienteFideliteDto[]>([]);
  fideliteLoading = signal(false);
  fideliteSearchQuery = signal('');

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
    dateDebut: string;
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
    dateDebut: '',
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
    nom: '', categorie: '', quantite: 0, quantiteMinimum: 0, unite: '', prixUnitaire: null
  };

  readonly CATEGORIES_STOCK = Object.values(CategorieStock);
  readonly CATEGORIE_STOCK_LABELS = CATEGORIE_STOCK_LABELS;
  CategorieStock = CategorieStock;

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
    return [...list].sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
  });

  filteredRdv = computed(() => {
    let list = this.rdvBaseList();
    const tc = this.rdvTypeFilter();
    if (tc === TypeClient.NORMAL) list = list.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === TypeClient.MARIAGE) list = list.filter(r => r.typeClient === TypeClient.MARIAGE && !r.services.some(s => s.employeeId));
    else if (tc === 'MARIAGE_SERVICES') list = list.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));
    return list;
  });

  totalRdv     = computed(() => this.rendezVous().length);
  rdvEnAttente = computed(() => this.rendezVous().filter(r => r.statut === StatutRendezVous.EN_ATTENTE).length);
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
    private presenceService: PresenceService
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

  terminerPresence(employeeId: number) {
    this.presenceActionLoading.set(employeeId);
    this.presenceService.terminer(employeeId).subscribe({
      next: (updated) => {
        this.presences.update(list => list.map(p => p.employeeId === employeeId ? updated : p));
        this.presenceActionLoading.set(null);
        this.showToast('Journée terminée avec succès.', 'success');
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

  utiliserOffreFidelite(telephone: string) {
    this.fideliteService.utiliserOffre(telephone).subscribe({
      next: (updated) => {
        this.clientesFidelite.update(list =>
          list.map(c => c.telephoneClient === telephone ? updated : c)
        );
        this.showToast('Offre utilisée avec succès !', 'success');
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

  // ── Modal ─────────────────────────────────────────────────────
  openCreateModal() {
    this.rdvForm = {
      nomClient: '', prenomClient: '', telephoneClient: '',
      typeClient: TypeClient.NORMAL, dateDebut: '', dureeMinutes: 60,
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
    const isMariage = rdv.typeClient === TypeClient.MARIAGE;
    this.rdvForm = {
      nomClient: rdv.nomClient,
      prenomClient: rdv.prenomClient,
      telephoneClient: rdv.telephoneClient ?? '',
      typeClient: rdv.typeClient,
      dateDebut: dateStr,
      dureeMinutes: rdv.dureeMinutes,
      services: isMariage ? [] : rdv.services.map(s => ({
        typeService: s.typeService,
        employeeId: s.employeeId,
        availableEmployees: [{
          id: s.employeeId, nom: s.employeeNom, prenom: s.employeePrenom,
          email: '', role: Role.EMPLOYEE, activated: true,
          specialite: s.employeeSpecialite as string
        }] as UserDto[],
        loadingEmployees: true
      })),
      statutMariee: rdv.statutMariee ?? StatutMariee.NON_VOILEE,
      marieeServices: isMariage ? rdv.services
        .filter(s => !s.employeeId)
        .map(s => ({
          typeService: s.typeService,
          date: s.datePrevue ? s.datePrevue.substring(0, 10) : dateStr.substring(0, 10),
          heure: s.datePrevue ? s.datePrevue.substring(11, 16) : dateStr.substring(11, 16),
          codeRobe: s.codeRobe ?? ''
        })) : [this.newMarieeServiceRow()],
      normaleServices: isMariage ? rdv.services
        .filter(s => !!s.employeeId)
        .map(s => ({
          typeService: s.typeService,
          date: s.datePrevue ? s.datePrevue.substring(0, 10) : dateStr.substring(0, 10),
          heure: s.datePrevue ? s.datePrevue.substring(11, 16) : dateStr.substring(11, 16),
          dureeMinutes: s.dureeService ?? rdv.dureeMinutes,
          employeeId: s.employeeId,
          availableEmployees: [{
            id: s.employeeId, nom: s.employeeNom, prenom: s.employeePrenom,
            email: '', role: Role.EMPLOYEE, activated: true,
            specialite: s.employeeSpecialite as string
          }] as UserDto[],
          loadingEmployees: false
        })) : []
    };
    this.rdvModalError.set('');
    this.rdvModalMode.set('edit');
    this.showRdvModal.set(true);

    // Fetch fresh available employees for each service row
    rdv.services.forEach((s, index) => {
      const dateIso = dateStr + ':00';
      this.rendezVousService.getEmployesDisponiblesParService(
        s.typeService, dateIso, rdv.dureeMinutes
      ).subscribe({
        next: (employees) => {
          const hasCurrentEmployee = employees.some(e => e.id === s.employeeId);
          if (!hasCurrentEmployee) {
            const currentEmp: UserDto = {
              id: s.employeeId, nom: s.employeeNom, prenom: s.employeePrenom,
              email: '', role: Role.EMPLOYEE, activated: true,
              specialite: s.employeeSpecialite as string
            };
            employees = [currentEmp, ...employees];
          }
          this.rdvForm.services[index].availableEmployees = employees;
          this.rdvForm.services[index].loadingEmployees = false;
        },
        error: () => {
          this.rdvForm.services[index].loadingEmployees = false;
        }
      });
    });
  }

  closeRdvModal() {
    this.showRdvModal.set(false);
    this.rdvModalError.set('');
  }

  newServiceRow(): ServiceFormRow {
    return { typeService: '', employeeId: null, availableEmployees: [], loadingEmployees: false };
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

    // Auto-fill duration from service default (only for first service row)
    if (row.typeService && index === 0) {
      const meta = TYPE_SERVICE_META[row.typeService];
      if (meta) {
        this.rdvForm.dureeMinutes = meta.dureeMinutes;
      }
    }

    if (row.typeService && this.rdvForm.dateDebut && this.rdvForm.dureeMinutes >= 1) {
      this.fetchAvailableEmployees(index);
    }
  }

  onDateOrHoursChange() {
    this.rdvForm.services.forEach((row, index) => {
      if (row.typeService) {
        row.employeeId = null;
        row.availableEmployees = [];
        if (this.rdvForm.dateDebut && this.rdvForm.dureeMinutes >= 1) {
          this.fetchAvailableEmployees(index);
        }
      }
    });
  }

  fetchAvailableEmployees(index: number) {
    const row = this.rdvForm.services[index];
    if (!row.typeService || !this.rdvForm.dateDebut || this.rdvForm.dureeMinutes < 1) return;

    row.loadingEmployees = true;
    const dateIso = this.rdvForm.dateDebut + ':00';

    this.rendezVousService.getEmployesDisponiblesParService(
      row.typeService as TypeService,
      dateIso,
      this.rdvForm.dureeMinutes
    ).subscribe({
      next: (employees) => {
        row.availableEmployees = employees;
        row.loadingEmployees = false;
      },
      error: () => {
        row.loadingEmployees = false;
        row.availableEmployees = [];
      }
    });
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
      error: (err: Error) => {
        this.rdvModalLoading.set(false);
        this.rdvModalError.set(err.message ?? 'Erreur lors de la création.');
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
      error: (err: Error) => {
        this.rdvModalLoading.set(false);
        this.rdvModalError.set(err.message ?? 'Erreur lors de la modification.');
      }
    });
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
          employeeId: s.employeeId,
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

    return {
      nomClient: this.rdvForm.nomClient,
      prenomClient: this.rdvForm.prenomClient,
      telephoneClient: this.rdvForm.telephoneClient || undefined,
      typeClient: this.rdvForm.typeClient,
      dateDebut: this.rdvForm.dateDebut + ':00',
      dureeMinutes: this.rdvForm.dureeMinutes,
      services: this.rdvForm.services
        .filter(s => s.typeService)
        .map(s => ({
          employeeId: s.employeeId ? Number(s.employeeId) : null,
          typeService: s.typeService as TypeService
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
      return true;
    }

    if (!this.rdvForm.dateDebut) {
      this.rdvModalError.set('La date de début est obligatoire.');
      return false;
    }
    const selectedDate = new Date(this.rdvForm.dateDebut);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      this.rdvModalError.set('La date ne peut pas être dans le passé.');
      return false;
    }
    if (!this.rdvForm.dureeMinutes || this.rdvForm.dureeMinutes < 1) {
      this.rdvModalError.set('La durée doit être d\'au moins 1 minute.'); return false;
    }
    for (const srv of this.rdvForm.services) {
      if (!srv.typeService) { this.rdvModalError.set('Sélectionnez un type de service pour chaque ligne.'); return false; }
      if (!srv.employeeId) { this.rdvModalError.set('Sélectionnez une employée pour chaque service.'); return false; }
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
    return type === TypeClient.MARIAGE ? 'Mariage' : 'Normal';
  }

  getTypeServiceLabel(ts: TypeService | string): string {
    return TYPE_SERVICE_META[ts]?.label ?? String(ts);
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
      SOINS: 'Soins', COIFFEUSE: 'Coiffure',
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
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  canEdit(rdv: RendezVousResponse): boolean {
    return rdv.statut === StatutRendezVous.EN_ATTENTE || rdv.statut === StatutRendezVous.CONFIRME;
  }

  // Ouvre le modal en mode Mariée directement
  openCreateMarieeModal() {
    this.rdvForm = {
      nomClient: '', prenomClient: '', telephoneClient: '',
      typeClient: TypeClient.MARIAGE, dateDebut: '', dureeMinutes: 60,
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
    return { typeService: '', date: '', heure: '', dureeMinutes: 60,
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
    if (row.typeService && row.date && row.heure && row.dureeMinutes >= 1) {
      this.fetchNormaleServiceMarieeEmployees(i);
    }
  }

  onNormaleServiceMarieeDateChange(i: number) {
    const row = this.rdvForm.normaleServices[i];
    row.employeeId = null;
    row.availableEmployees = [];
    if (row.typeService && row.date && row.heure && row.dureeMinutes >= 1) {
      this.fetchNormaleServiceMarieeEmployees(i);
    }
  }

  fetchNormaleServiceMarieeEmployees(i: number) {
    const row = this.rdvForm.normaleServices[i];
    if (!row.typeService || !row.date || !row.heure || row.dureeMinutes < 1) return;
    row.loadingEmployees = true;
    const dateIso = `${row.date}T${row.heure}:00`;
    this.rendezVousService.getEmployesDisponiblesParService(
      row.typeService as TypeService, dateIso, row.dureeMinutes
    ).subscribe({
      next: (emps) => { row.availableEmployees = emps; row.loadingEmployees = false; },
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

  // ── Stock ─────────────────────────────────────────────────────
  loadStock() {
    this.stockLoading.set(true);
    this.stockService.getAllProduits().subscribe({
      next: (data) => { this.produits.set(data); this.stockLoading.set(false); },
      error: () => { this.stockLoading.set(false); this.showToast('Erreur lors du chargement du stock.', 'error'); }
    });
  }

  openCreateStockModal() {
    this.stockForm = { nom: '', categorie: '', quantite: 0, quantiteMinimum: 0, unite: '', prixUnitaire: null };
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
      prixUnitaire: p.prixUnitaire
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
    if (!this.stockForm.prixUnitaire || this.stockForm.prixUnitaire <= 0) { this.stockModalError.set('Le prix unitaire doit être supérieur à 0.'); return; }

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
