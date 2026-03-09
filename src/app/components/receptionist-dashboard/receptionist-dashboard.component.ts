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
  RendezVousRequest,
  TypeService,
  TypeClient,
  StatutRendezVous,
  Specialite,
  TypeServiceGroupeDto,
  Role
} from '../../models/auth.models';

type Tab = 'profile' | 'password' | 'rendez-vous';

export interface ServiceFormRow {
  typeService: TypeService | '';
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

  rdvForm: {
    nomClient: string;
    prenomClient: string;
    telephoneClient: string;
    typeClient: TypeClient;
    dateDebut: string;
    nbHeures: number;
    services: ServiceFormRow[];
  } = {
    nomClient: '',
    prenomClient: '',
    telephoneClient: '',
    typeClient: TypeClient.NORMAL,
    dateDebut: '',
    nbHeures: 1,
    services: []
  };

  // ── Expose enums to template ──────────────────────────────────
  TypeClient = TypeClient;
  StatutRendezVous = StatutRendezVous;

  // ── Computed ──────────────────────────────────────────────────
  filteredRdv = computed(() => {
    const q = this.rdvSearchQuery().toLowerCase().trim();
    if (!q) return this.rendezVous();
    return this.rendezVous().filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
  });

  totalRdv    = computed(() => this.rendezVous().length);
  rdvEnAttente = computed(() => this.rendezVous().filter(r => r.statut === StatutRendezVous.EN_ATTENTE).length);
  rdvConfirme  = computed(() => this.rendezVous().filter(r => r.statut === StatutRendezVous.CONFIRME).length);
  rdvAujourdhui = computed(() => {
    const today = new Date().toDateString();
    return this.rendezVous().filter(r => new Date(r.dateDebut).toDateString() === today).length;
  });

  constructor(
    public authService: AuthService,
    private profileService: ProfileService,
    private rendezVousService: RendezVousService
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadServiceGroups();
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
    if (tab === 'rendez-vous' && this.rendezVous().length === 0) {
      this.loadRendezVous();
    }
  }

  // ── Modal ─────────────────────────────────────────────────────
  openCreateModal() {
    this.rdvForm = {
      nomClient: '', prenomClient: '', telephoneClient: '',
      typeClient: TypeClient.NORMAL, dateDebut: '', nbHeures: 1,
      services: [this.newServiceRow()]
    };
    this.rdvModalError.set('');
    this.rdvModalMode.set('create');
    this.showRdvModal.set(true);
  }

  openEditModal(rdv: RendezVousResponse) {
    this.selectedRdv.set(rdv);
    const dateStr = rdv.dateDebut.substring(0, 16);
    this.rdvForm = {
      nomClient: rdv.nomClient,
      prenomClient: rdv.prenomClient,
      telephoneClient: rdv.telephoneClient ?? '',
      typeClient: rdv.typeClient,
      dateDebut: dateStr,
      nbHeures: rdv.nbHeures,
      services: rdv.services.map(s => ({
        typeService: s.typeService,
        employeeId: s.employeeId,
        availableEmployees: [{
          id: s.employeeId,
          nom: s.employeeNom,
          prenom: s.employeePrenom,
          email: '',
          role: Role.EMPLOYEE,
          activated: true,
          specialite: s.employeeSpecialite as string
        }] as UserDto[],
        loadingEmployees: true
      }))
    };
    this.rdvModalError.set('');
    this.rdvModalMode.set('edit');
    this.showRdvModal.set(true);

    // Fetch fresh available employees for each service row
    rdv.services.forEach((s, index) => {
      const dateIso = dateStr + ':00';
      this.rendezVousService.getEmployesDisponiblesParService(
        s.typeService, dateIso, rdv.nbHeures
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
    if (row.typeService && this.rdvForm.dateDebut && this.rdvForm.nbHeures >= 1) {
      this.fetchAvailableEmployees(index);
    }
  }

  onDateOrHoursChange() {
    this.rdvForm.services.forEach((row, index) => {
      if (row.typeService) {
        row.employeeId = null;
        row.availableEmployees = [];
        if (this.rdvForm.dateDebut && this.rdvForm.nbHeures >= 1) {
          this.fetchAvailableEmployees(index);
        }
      }
    });
  }

  fetchAvailableEmployees(index: number) {
    const row = this.rdvForm.services[index];
    if (!row.typeService || !this.rdvForm.dateDebut || this.rdvForm.nbHeures < 1) return;

    row.loadingEmployees = true;
    const dateIso = this.rdvForm.dateDebut + ':00';

    this.rendezVousService.getEmployesDisponiblesParService(
      row.typeService as TypeService,
      dateIso,
      this.rdvForm.nbHeures
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
    return {
      nomClient: this.rdvForm.nomClient,
      prenomClient: this.rdvForm.prenomClient,
      telephoneClient: this.rdvForm.telephoneClient || undefined,
      typeClient: this.rdvForm.typeClient,
      dateDebut: this.rdvForm.dateDebut + ':00',
      nbHeures: this.rdvForm.nbHeures,
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
      this.rdvModalError.set('Le nom et prénom du client sont obligatoires.');
      return false;
    }
    if (!this.rdvForm.dateDebut) {
      this.rdvModalError.set('La date de début est obligatoire.');
      return false;
    }
    if (!this.rdvForm.nbHeures || this.rdvForm.nbHeures < 1) {
      this.rdvModalError.set('La durée doit être d\'au moins 1 heure.');
      return false;
    }
    const isMariage = this.rdvForm.typeClient === TypeClient.MARIAGE;
    for (const srv of this.rdvForm.services) {
      if (!srv.typeService) {
        this.rdvModalError.set('Veuillez sélectionner un type de service pour chaque ligne.');
        return false;
      }
      // Pour MARIAGE : l'employée est optionnelle
      if (!isMariage && !srv.employeeId) {
        this.rdvModalError.set('Veuillez sélectionner une employée pour chaque service.');
        return false;
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
          ANNULE: 'annulé', TERMINE: 'terminé'
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
      ANNULE: 'Annulé', TERMINE: 'Terminé'
    };
    return map[statut];
  }

  getStatutClass(statut: StatutRendezVous): string {
    const map: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'en-attente', CONFIRME: 'confirme',
      ANNULE: 'annule', TERMINE: 'termine'
    };
    return map[statut];
  }

  getTypeClientLabel(type: TypeClient): string {
    return type === TypeClient.MARIAGE ? 'Mariage' : 'Normal';
  }

  getTypeServiceLabel(ts: TypeService | string): string {
    const map: Record<string, string> = {
      SOIN_VISAGE: 'Soin visage', SOIN_PIED: 'Soin pied',
      SOIN_MAIN: 'Soin main', HYDRAFACIALE: 'Hydrafaciale',
      COUPE: 'Coupe', PROTEINE: 'Protéine', COLORATION_SIMPLE: 'Coloration simple',
      BALAYAGE: 'Balayage', SOIN_CAPILLAIRE: 'Soin capillaire', BRUSHING: 'Brushing',
      EPILATION_VISAGE: 'Épilation visage', EPILATION_MOUSTACHE: 'Épilation moustache',
      EPILATION_SOURCILS: 'Épilation sourcils',
      VERNIS_PERMANENT_MAIN: 'Vernis permanent main', VERNIS_PERMANENT_PIED: 'Vernis permanent pied',
      GEL_SUR_ONGLE_NATURELLE: 'Gel ongle naturelle', GEL_CAPSULE: 'Gel capsule',
      DEPOSE_VERNIS: 'Dépose vernis', MAQUILLAGE: 'Maquillage'
    };
    return map[ts] ?? String(ts);
  }

  getSpecialiteLabel(sp: Specialite | string): string {
    const map: Record<string, string> = {
      SOINS: 'Soins', COIFFEUSE: 'Coiffeuse',
      ESTHETICIENNE: 'Esthéticienne', ONGLERIE: 'Onglerie', MAQUILLEUSE: 'Maquillage'
    };
    return map[sp] ?? String(sp);
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

  logout() { this.authService.logout(); }
}
