import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import { StockService } from '../../services/stock.service';
import { AvisService } from '../../services/avis.service';
import {
  UserDto,
  UpdateProfileRequest,
  RendezVousResponse,
  ServiceRendezVousDto,
  StatutRendezVous,
  StatutService,
  TypeClient,
  TypeService,
  AvisClienteDto,
  ProduitStockDto,
  CategorieStock,
  CATEGORIE_STOCK_LABELS
} from '../../models/auth.models';

type Tab = 'profile' | 'planning' | 'stock';

interface PlanningServiceRow {
  rdv: RendezVousResponse;
  services: ServiceRendezVousDto[];
  date: string; // YYYY-MM-DD
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit {

  // ── Profile ───────────────────────────────────────────────────
  profile = signal<UserDto | null>(null);
  loading = signal(false);
  saveLoading = signal(false);
  error = signal('');
  success = signal('');
  activeTab = signal<Tab>('profile');
  showCurrentPw = signal(false);
  showNewPw = signal(false);

  profileForm: UpdateProfileRequest = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    specialites: [],
    nombresExperiences: undefined
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  readonly specialites: { value: string; label: string }[] = [
    { value: 'SOINS',         label: 'Soins' },
    { value: 'COIFFEUSE',     label: 'Coiffeure' },
    { value: 'ESTHETICIENNE', label: 'Esthétique' },
    { value: 'ONGLERIE',      label: 'Onglerie' },
    { value: 'MAQUILLEUSE',   label: 'Maquillage' }
  ];

  // ── Planning state ────────────────────────────────────────────
  rendezVous = signal<RendezVousResponse[]>([]);
  avis = signal<AvisClienteDto[]>([]);
  private avisNoteMap = computed(() => new Map(this.avis().map(a => [a.rendezVousId, a.note])));
  planningLoading = signal(false);
  filterStatut = signal<StatutRendezVous | 'ALL'>('ALL');
  filterTypeClient = signal<TypeClient | 'ALL' | 'MARIAGE_SERVICES'>('ALL');
  planningSearch = signal('');
  planningFilterDate = signal<string>('');
  viewPeriod = signal<'today' | 'week' | 'month' | 'all'>('today');

  // ── Stock state ────────────────────────────────────────────────
  produits = signal<ProduitStockDto[]>([]);
  stockLoading = signal(false);
  stockConfirmLoading = signal(false);
  stockError = signal('');
  stockSuccess = signal('');
  stockSearchQuery = signal('');
  /** Record<produitId, quantiteUtilisee> — only selected products appear here */
  selectedProduits = signal<Record<number, number>>({});
  CATEGORIE_STOCK_LABELS = CATEGORIE_STOCK_LABELS;

  filteredProduits = computed(() => {
    const q = this.stockSearchQuery().toLowerCase().trim();
    const list = this.produits();
    if (!q) return list;
    return list.filter(p =>
      (p.nom ?? '').toLowerCase().includes(q) ||
      (CATEGORIE_STOCK_LABELS[p.categorie] ?? '').toLowerCase().includes(q) ||
      (p.reference ?? '').toLowerCase().includes(q)
    );
  });

  selectedCount = computed(() => Object.keys(this.selectedProduits()).length);

  // ── Expose enums ──────────────────────────────────────────────
  StatutRendezVous = StatutRendezVous;
  StatutService = StatutService;
  TypeClient = TypeClient;

  // ── Computed planning ─────────────────────────────────────────
  private planningBaseList = computed(() => {
    let list = this.rendezVous();
    const period = this.viewPeriod();
    const d = this.planningFilterDate();
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
    } else {
      list = list.filter(r => r.dateDebut.startsWith(d));
    }
    return list;
  });

  filteredPlanning = computed(() => {
    let list = this.planningBaseList();
    const st = this.filterStatut();
    const tc = this.filterTypeClient();
    const q  = this.planningSearch().toLowerCase().trim();
    if (st !== 'ALL') list = list.filter(r => r.statut === st);
    if (tc === TypeClient.NORMAL) list = list.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === 'MARIAGE_SERVICES') list = list.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));
    if (q) list = list.filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
    return [...list].sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
  });

  expandedPlanningRows = computed((): PlanningServiceRow[] => {
    const filterDate = this.planningFilterDate();
    const period = this.viewPeriod();
    const q = this.planningSearch().toLowerCase().trim();
    const st = this.filterStatut();
    const tc = this.filterTypeClient();
    const myId = this.profile()?.id;
    const now = new Date();

    let rdvList = this.rendezVous();

    if (st !== 'ALL') rdvList = rdvList.filter(r => r.statut === st);
    if (tc === TypeClient.NORMAL) rdvList = rdvList.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === 'MARIAGE_SERVICES') rdvList = rdvList.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));
    if (q) rdvList = rdvList.filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );

    const rows: PlanningServiceRow[] = [];

    for (const rdv of rdvList) {
      const myServices = myId ? rdv.services.filter(s => s.employeeId === myId) : rdv.services;

      const byDate = new Map<string, ServiceRendezVousDto[]>();
      if (myServices.length === 0) {
        byDate.set(rdv.dateDebut.substring(0, 10), []);
      } else {
        for (const srv of myServices) {
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

  totalRdv      = computed(() => this.rendezVous().length);
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
  rdvEnAttente = computed(() => this.rendezVous().filter(r => r.statut === StatutRendezVous.EN_ATTENTE).length);
  rdvConfirme  = computed(() => this.planningBaseList().filter(r => r.statut === StatutRendezVous.CONFIRME).length);
  rdvAnnule    = computed(() => this.planningBaseList().filter(r => r.statut === StatutRendezVous.ANNULE).length);
  rdvTermine   = computed(() => this.planningBaseList().filter(r => r.statut === StatutRendezVous.TERMINE).length);
  rdvMariage            = computed(() => this.rendezVous().filter(r => r.typeClient === TypeClient.MARIAGE).length);
  rdvMariageAvecServices = computed(() => this.rendezVous().filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId)).length);

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private rendezVousService: RendezVousService,
    private stockService: StockService,
    private avisService: AvisService
  ) {}

  getRdvNote(rdvId: number): number | null {
    return this.avisNoteMap().get(rdvId) ?? null;
  }

  getStarsArray(): number[] { return [1, 2, 3, 4, 5]; }

  hasAssignedServices(rdv: RendezVousResponse): boolean {
    const employeeId = this.profile()?.id;
    if (!employeeId) return false;
    return rdv.services.some(s => s.employeeId === employeeId);
  }

  ngOnInit() {
    this.loadProfile();
  }

  // ── Profile methods ───────────────────────────────────────────
  loadProfile() {
    this.loading.set(true);
    this.profileService.getProfile().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.profileForm = {
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
          telephone: data.telephone ?? '',
          specialites: data.specialites ? [...data.specialites] : [],
          nombresExperiences: data.nombresExperiences
        };
        this.loading.set(false);
      },
      error: () => {
        const user = this.authService.currentUser();
        if (user) {
          this.profile.set({
            id: 0, nom: user.nom, prenom: user.prenom, email: user.email,
            telephone: '', role: user.role, activated: user.activated,
            specialites: user.specialites, nombresExperiences: user.nombresExperiences
          });
          this.profileForm = {
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            telephone: '',
            specialites: user.specialites ? [...user.specialites] : [],
            nombresExperiences: user.nombresExperiences
          };
        }
        this.loading.set(false);
      }
    });
  }

  saveProfile() {
    this.error.set('');
    this.success.set('');
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
    this.error.set('');
    this.success.set('');

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

  toggleSpecialite(value: string) {
    const current = this.profileForm.specialites ?? [];
    const idx = current.indexOf(value);
    if (idx >= 0) {
      this.profileForm.specialites = current.filter(s => s !== value);
    } else {
      this.profileForm.specialites = [...current, value];
    }
  }

  isSpecialiteSelected(value: string): boolean {
    return (this.profileForm.specialites ?? []).includes(value);
  }

  // ── Planning methods ──────────────────────────────────────────
  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'planning') {
      if (this.rendezVous().length === 0) {
        this.loadRendezVous();
      }
      if (this.avis().length === 0) {
        this.avisService.listerTous().subscribe({ next: (data) => this.avis.set(data), error: () => {} });
      }
    } else if (tab === 'stock') {
      this.loadStock();
    }
  }

  loadStock() {
    this.stockLoading.set(true);
    this.stockError.set('');
    this.selectedProduits.set({});
    this.stockService.getAllProduitsEmployee().subscribe({
      next: (data) => {
        this.produits.set(data);
        this.stockLoading.set(false);
      },
      error: (err) => {
        this.stockLoading.set(false);
        this.produits.set([]);
        this.stockError.set(err?.error?.message ?? 'Impossible de charger la liste des produits.');
      }
    });
  }

  isSelected(id: number): boolean {
    return id in this.selectedProduits();
  }

  getQteUtilisee(id: number): number {
    return this.selectedProduits()[id] ?? 1;
  }

  toggleSelection(produit: ProduitStockDto) {
    const current = { ...this.selectedProduits() };
    if (produit.id in current) {
      delete current[produit.id];
    } else {
      current[produit.id] = 1;
    }
    this.selectedProduits.set(current);
  }

  incrementQte(id: number) {
    const current = { ...this.selectedProduits() };
    current[id] = (current[id] ?? 1) + 1;
    this.selectedProduits.set(current);
  }

  confirmerUtilisation() {
    const sel = this.selectedProduits();
    const items = Object.entries(sel).map(([id, quantite]) => ({
      produitId: Number(id),
      quantite
    }));
    if (items.length === 0) return;

    this.stockConfirmLoading.set(true);
    this.stockError.set('');
    this.stockService.utiliserProduits(items).subscribe({
      next: (updated) => {
        this.produits.update(list =>
          list.map(p => updated.find(u => u.id === p.id) ?? p)
        );
        this.selectedProduits.set({});
        this.stockConfirmLoading.set(false);
        this.stockSuccess.set('Utilisation enregistrée avec succès !');
        setTimeout(() => this.stockSuccess.set(''), 3500);
      },
      error: (err) => {
        this.stockConfirmLoading.set(false);
        this.stockError.set(err?.error?.message ?? 'Erreur lors de l\'enregistrement.');
        setTimeout(() => this.stockError.set(''), 5000);
      }
    });
  }

  loadRendezVous() {
    this.planningLoading.set(true);
    this.rendezVousService.getMesRendezVous().subscribe({
      next: (data) => { this.rendezVous.set(data); this.planningLoading.set(false); },
      error: () => { this.planningLoading.set(false); }
    });
  }

  setFilterStatut(s: StatutRendezVous | 'ALL') { this.filterStatut.set(s); }
  setFilterTypeClient(t: TypeClient | 'ALL' | 'MARIAGE_SERVICES') { this.filterTypeClient.set(t); }

  getMyServices(rdv: RendezVousResponse): ServiceRendezVousDto[] {
    const myId = this.profile()?.id;
    if (!myId) return rdv.services;
    return rdv.services.filter(s => s.employeeId === myId);
  }

  // ── Label helpers ─────────────────────────────────────────────
  getStatutLabel(s: StatutRendezVous): string {
    const m: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'En attente', CONFIRME: 'Confirmé',
      EN_COURS: 'En cours', ANNULE: 'Annulé', TERMINE: 'Terminé'
    };
    return m[s];
  }

  getStatutClass(s: StatutRendezVous): string {
    const m: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'en-attente', CONFIRME: 'confirme',
      EN_COURS: 'en-cours', ANNULE: 'annule', TERMINE: 'termine'
    };
    return m[s];
  }

  getTypeClientLabel(t: TypeClient): string {
    return t === TypeClient.MARIAGE ? '💍 Mariée' : 'Normal';
  }

  getTypeServiceLabel(ts: TypeService | string): string {
    const map: Record<string, string> = {
      SOIN_VISAGE: 'Soin visage', SOIN_PIED: 'Soin pied',
      SOIN_MAIN: 'Soin main', HYDRAFACIALE: 'Hydrafaciale',
      COUPE: 'Coupe', PROTEINE: 'Protéine', COLORATION_SIMPLE: 'Coloration simple',
      BALAYAGE: 'Balayage', SOIN_CAPILLAIRE: 'Soin capillaire', BRUSHING: 'Brushing',
      EPILATION_VISAGE: 'Épilation visage', EPILATION_MOUSTACHE: 'Épilation moustache',
      EPILATION_SOURCILS: 'Épilation sourcils',
      VERNIS_PERMANENT_MAIN: 'Vernis perm. main', VERNIS_PERMANENT_PIED: 'Vernis perm. pied',
      GEL_SUR_ONGLE_NATURELLE: 'Gel ongle naturelle', GEL_CAPSULE: 'Gel capsule',
      DEPOSE_VERNIS: 'Dépose vernis', MAQUILLAGE: 'Maquillage'
    };
    return map[ts] ?? String(ts);
  }

  formatDuree(minutes: number): string {
    if (!minutes) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
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

  getClientInitials(rdv: RendezVousResponse): string {
    return (rdv.prenomClient.charAt(0) + rdv.nomClient.charAt(0)).toUpperCase();
  }

  getInitials(): string {
    const u = this.profile();
    if (!u) return '?';
    return (u.prenom.charAt(0) + u.nom.charAt(0)).toUpperCase();
  }

  commencerRdv(rdv: RendezVousResponse) {
    this.rendezVousService.commencerRendezVous(rdv.id).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.success.set('Rendez-vous démarré.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors du démarrage du rendez-vous.');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  commencerService(serviceId: number) {
    this.rendezVousService.commencerService(serviceId).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.success.set('Service démarré.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors du démarrage du service.');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  terminerRdv(rdv: RendezVousResponse) {
    this.rendezVousService.terminerRendezVous(rdv.id).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.success.set('Rendez-vous marqué comme terminé.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors de la clôture du rendez-vous.');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  terminerService(serviceId: number) {
    this.rendezVousService.terminerService(serviceId).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.success.set('Service marqué comme terminé.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors de la clôture du service.');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  logout() { this.authService.logout(); }
}
