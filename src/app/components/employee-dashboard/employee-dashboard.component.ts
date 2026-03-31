import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import { StockService } from '../../services/stock.service';
import {
  UserDto,
  UpdateProfileRequest,
  RendezVousResponse,
  ServiceRendezVousDto,
  StatutRendezVous,
  TypeClient,
  TypeService,
  ProduitStockDto,
  CategorieStock,
  CATEGORIE_STOCK_LABELS
} from '../../models/auth.models';

type Tab = 'profile' | 'password' | 'planning' | 'stock';

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
    { value: 'COIFFEUSE',     label: 'Coiffeuse' },
    { value: 'ESTHETICIENNE', label: 'Esthéticienne' },
    { value: 'ONGLERIE',      label: 'Onglerie' },
    { value: 'MAQUILLEUSE',   label: 'Maquillage' }
  ];

  // ── Planning state ────────────────────────────────────────────
  rendezVous = signal<RendezVousResponse[]>([]);
  planningLoading = signal(false);
  filterStatut = signal<StatutRendezVous | 'ALL'>('ALL');
  filterTypeClient = signal<TypeClient | 'ALL' | 'MARIAGE_SERVICES'>('ALL');
  planningSearch = signal('');
  planningFilterDate = signal<string>('');
  viewPeriod = signal<'today' | 'week' | 'month' | 'all'>('today');

  // ── Stock state ────────────────────────────────────────────────
  produits = signal<ProduitStockDto[]>([]);
  stockLoading = signal(false);  stockError = signal('');  stockSearchQuery = signal('');
  CATEGORIE_STOCK_LABELS = CATEGORIE_STOCK_LABELS;

  filteredProduits = computed(() => {
    const q = this.stockSearchQuery().toLowerCase().trim();
    const list = this.produits();
    if (!q) return list;
    return list.filter(p =>
      (p.nom ?? '').toLowerCase().includes(q) ||
      (p.nomFournisseur ?? '').toLowerCase().includes(q) ||
      (CATEGORIE_STOCK_LABELS[p.categorie] ?? '').toLowerCase().includes(q)
    );
  });

  // ── Expose enums ──────────────────────────────────────────────
  StatutRendezVous = StatutRendezVous;
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
    private stockService: StockService
  ) {}

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
    } else if (tab === 'stock') {
      this.loadStock();
    }
  }

  loadStock() {
    this.stockLoading.set(true);
    this.stockError.set('');
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

  decrementerStock(produit: ProduitStockDto) {
    this.stockService.decrementeQuantite(produit.id).subscribe({
      next: (updated) => {
        this.produits.update(list => list.map(p => p.id === updated.id ? updated : p));
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors de la mise à jour du stock.');
        setTimeout(() => this.error.set(''), 4000);
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
    return t === TypeClient.MARIAGE ? '💍 Mariage' : 'Normal';
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
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
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

  logout() { this.authService.logout(); }
}
