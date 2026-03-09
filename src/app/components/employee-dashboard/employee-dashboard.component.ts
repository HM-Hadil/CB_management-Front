import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import {
  UserDto,
  UpdateProfileRequest,
  RendezVousResponse,
  ServiceRendezVousDto,
  StatutRendezVous,
  TypeClient,
  TypeService
} from '../../models/auth.models';

type Tab = 'profile' | 'password' | 'planning';

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
  selectedRdv = signal<RendezVousResponse | null>(null);
  showDetailModal = signal(false);

  profileForm: UpdateProfileRequest = {
    telephone: '',
    specialite: '',
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
  filterTypeClient = signal<TypeClient | 'ALL'>('ALL');
  planningSearch = signal('');

  // ── Expose enums ──────────────────────────────────────────────
  StatutRendezVous = StatutRendezVous;
  TypeClient = TypeClient;

  // ── Computed planning ─────────────────────────────────────────
  filteredPlanning = computed(() => {
    let list = this.rendezVous();
    const st = this.filterStatut();
    const tc = this.filterTypeClient();
    const q  = this.planningSearch().toLowerCase().trim();

    if (st !== 'ALL') list = list.filter(r => r.statut === st);
    if (tc !== 'ALL') list = list.filter(r => r.typeClient === tc);
    if (q)            list = list.filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
    return list;
  });

  totalRdv     = computed(() => this.rendezVous().length);
  rdvAujourdhui = computed(() => {
    const today = new Date().toDateString();
    return this.rendezVous().filter(r => new Date(r.dateDebut).toDateString() === today).length;
  });
  rdvEnAttente = computed(() => this.rendezVous().filter(r => r.statut === StatutRendezVous.EN_ATTENTE).length);
  rdvConfirme  = computed(() => this.rendezVous().filter(r => r.statut === StatutRendezVous.CONFIRME).length);
  rdvMariage   = computed(() => this.rendezVous().filter(r => r.typeClient === TypeClient.MARIAGE).length);

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private rendezVousService: RendezVousService
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
          specialite: data.specialite ?? '',
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
            specialite: user.specialite, nombresExperiences: user.nombresExperiences
          });
          this.profileForm = {
            telephone: '',
            specialite: user.specialite ?? '',
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

  // ── Planning methods ──────────────────────────────────────────
  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'planning' && this.rendezVous().length === 0) {
      this.loadRendezVous();
    }
  }

  loadRendezVous() {
    this.planningLoading.set(true);
    this.rendezVousService.getMesRendezVous().subscribe({
      next: (data) => { this.rendezVous.set(data); this.planningLoading.set(false); },
      error: () => { this.planningLoading.set(false); }
    });
  }

  setFilterStatut(s: StatutRendezVous | 'ALL') { this.filterStatut.set(s); }
  setFilterTypeClient(t: TypeClient | 'ALL')    { this.filterTypeClient.set(t); }

  getMyServices(rdv: RendezVousResponse): ServiceRendezVousDto[] {
    const myId = this.profile()?.id;
    if (!myId) return rdv.services;
    return rdv.services.filter(s => s.employeeId === myId);
  }

  // ── Label helpers ─────────────────────────────────────────────
  getStatutLabel(s: StatutRendezVous): string {
    const m: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'En attente', CONFIRME: 'Confirmé',
      ANNULE: 'Annulé', TERMINE: 'Terminé'
    };
    return m[s];
  }

  getStatutClass(s: StatutRendezVous): string {
    const m: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'en-attente', CONFIRME: 'confirme',
      ANNULE: 'annule', TERMINE: 'termine'
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

  terminerRdv(rdv: RendezVousResponse) {
    if (!confirm(`Confirmer la fin du rendez-vous de ${rdv.prenomClient} ${rdv.nomClient} ?`)) return;
    this.rendezVousService.terminerRendezVous(rdv.id).subscribe({
      next: (updated) => {
        this.rendezVous.update(list => list.map(r => r.id === updated.id ? updated : r));
        if (this.selectedRdv()?.id === updated.id) this.selectedRdv.set(updated);
        this.success.set('Rendez-vous marqué comme terminé.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors de la clôture du rendez-vous.');
        setTimeout(() => this.error.set(''), 4000);
      }
    });
  }

  openRdvDetail(rdv: RendezVousResponse) {
    this.selectedRdv.set(rdv);
    this.showDetailModal.set(true);
  }

  closeRdvDetail() {
    this.showDetailModal.set(false);
    this.selectedRdv.set(null);
  }

  logout() { this.authService.logout(); }
}
