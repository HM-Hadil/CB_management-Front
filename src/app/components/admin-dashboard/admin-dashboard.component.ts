import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import {
  UserDto, Role, RegisterRequest, UpdateUserRequest,
  RendezVousResponse, StatutRendezVous, TypeClient, TypeService
} from '../../models/auth.models';

type Tab = 'all' | 'employees' | 'receptionists' | 'rdv';
type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {

  // ── Staff State ───────────────────────────────────────────────
  users = signal<UserDto[]>([]);
  loading = signal(false);
  activeTab = signal<Tab>('all');
  searchQuery = signal('');
  showModal = signal(false);
  modalMode = signal<ModalMode>('create');
  modalLoading = signal(false);
  modalError = signal('');
  selectedUser = signal<UserDto | null>(null);
  deleteConfirmId = signal<number | null>(null);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  showPassword = signal(false);
  sidebarOpen = signal(false);

  // ── RDV State ─────────────────────────────────────────────────
  allRdv = signal<RendezVousResponse[]>([]);
  rdvLoading = signal(false);
  rdvFilterStatut = signal<StatutRendezVous | 'ALL'>('ALL');
  rdvFilterTypeClient = signal<TypeClient | 'ALL'>('ALL');
  rdvFilterEmployeeStr = signal<string>('ALL');
  rdvSearch = signal('');
  selectedRdv = signal<RendezVousResponse | null>(null);
  showRdvDetail = signal(false);

  // ── Form state ───────────────────────────────────────────────
  form: RegisterRequest & { confirmPassword?: string } = {
    nom: '', prenom: '', email: '', telephone: '',
    password: '', confirmPassword: '',
    role: Role.EMPLOYEE,
    specialite: '', nombresExperiences: undefined
  };

  editForm: UpdateUserRequest = {
    nom: '', prenom: '', email: '', telephone: '',
    password: '', role: Role.EMPLOYEE,
    specialite: '', nombresExperiences: undefined
  };

  readonly specialites: { value: string; label: string }[] = [
    { value: 'SOINS',         label: 'Soins' },
    { value: 'COIFFEUSE',     label: 'Coiffeuse' },
    { value: 'ESTHETICIENNE', label: 'Esthéticienne' },
    { value: 'ONGLERIE',      label: 'Onglerie' },
    { value: 'MAQUILLEUSE',   label: 'Maquillage' }
  ];

  readonly specialiteLabels: Record<string, string> = {
    SOINS: 'Soins', COIFFEUSE: 'Coiffeuse',
    ESTHETICIENNE: 'Esthéticienne', ONGLERIE: 'Onglerie', MAQUILLEUSE: 'Maquillage'
  };

  // ── Computed (Staff) ─────────────────────────────────────────
  filteredUsers = computed(() => {
    let list = this.users();
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase();

    if (tab === 'employees')     list = list.filter(u => u.role === Role.EMPLOYEE);
    if (tab === 'receptionists') list = list.filter(u => u.role === Role.RECEPTIONIST);

    if (q) {
      list = list.filter(u =>
        u.nom.toLowerCase().includes(q) ||
        u.prenom.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.specialite?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  });

  totalEmployees = computed(() => this.users().filter(u => u.role === Role.EMPLOYEE).length);
  totalReception = computed(() => this.users().filter(u => u.role === Role.RECEPTIONIST).length);
  totalActive    = computed(() => this.users().filter(u => u.activated).length);
  isEmployeeForm = computed(() => this.form.role === Role.EMPLOYEE);
  isEmployeeEdit = computed(() => this.editForm.role === Role.EMPLOYEE);
  currentAdmin   = computed(() => this.authService.currentUser());

  // ── Computed (RDV) ────────────────────────────────────────────
  filteredRdv = computed(() => {
    let list = this.allRdv();
    const st  = this.rdvFilterStatut();
    const tc  = this.rdvFilterTypeClient();
    const emp = this.rdvFilterEmployeeStr();
    const q   = this.rdvSearch().toLowerCase().trim();

    if (st !== 'ALL') list = list.filter(r => r.statut === st);
    if (tc !== 'ALL') list = list.filter(r => r.typeClient === tc);
    if (emp !== 'ALL') {
      const empId = parseInt(emp, 10);
      list = list.filter(r => r.services.some(s => s.employeeId === empId));
    }
    if (q) list = list.filter(r =>
      r.nomClient.toLowerCase().includes(q)    ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
    return list;
  });

  rdvTotalCount      = computed(() => this.allRdv().length);
  rdvAujourdhuiCount = computed(() => {
    const today = new Date().toDateString();
    return this.allRdv().filter(r => new Date(r.dateDebut).toDateString() === today).length;
  });
  rdvMariageCount    = computed(() => this.allRdv().filter(r => r.typeClient === TypeClient.MARIAGE).length);
  rdvNormalCount     = computed(() => this.allRdv().filter(r => r.typeClient === TypeClient.NORMAL).length);
  rdvEnAttenteCount  = computed(() => this.allRdv().filter(r => r.statut === StatutRendezVous.EN_ATTENTE).length);
  rdvConfirmeCount   = computed(() => this.allRdv().filter(r => r.statut === StatutRendezVous.CONFIRME).length);

  employeesList = computed(() => this.users().filter(u => u.role === Role.EMPLOYEE && u.activated));

  // ── Enums exposed ────────────────────────────────────────────
  Role = Role;
  StatutRendezVous = StatutRendezVous;
  TypeClient = TypeClient;

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private rendezVousService: RendezVousService
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  // ── Data ─────────────────────────────────────────────────────
  loadUsers() {
    this.loading.set(true);
    this.userService.getAllStaff().subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: ()    => { this.loading.set(false); this.showToast('Erreur lors du chargement.', 'error'); }
    });
  }

  loadAllRdv() {
    this.rdvLoading.set(true);
    this.rendezVousService.listerTous().subscribe({
      next: (data) => { this.allRdv.set(data); this.rdvLoading.set(false); },
      error: ()    => { this.rdvLoading.set(false); this.showToast('Erreur lors du chargement des RDV.', 'error'); }
    });
  }

  // ── Tab ───────────────────────────────────────────────────────
  setTab(tab: Tab) {
    this.activeTab.set(tab);
    if (tab === 'rdv' && this.allRdv().length === 0) {
      this.loadAllRdv();
    }
  }

  // ── RDV filters ──────────────────────────────────────────────
  setRdvFilterStatut(s: StatutRendezVous | 'ALL')    { this.rdvFilterStatut.set(s); }
  setRdvFilterTypeClient(tc: TypeClient | 'ALL')     { this.rdvFilterTypeClient.set(tc); }

  openRdvDetail(rdv: RendezVousResponse) {
    this.selectedRdv.set(rdv);
    this.showRdvDetail.set(true);
  }

  closeRdvDetail() {
    this.showRdvDetail.set(false);
    this.selectedRdv.set(null);
  }

  // ── Modal Create ─────────────────────────────────────────────
  openCreateModal(role?: Role) {
    this.form = {
      nom: '', prenom: '', email: '', telephone: '',
      password: '', confirmPassword: '',
      role: role ?? Role.EMPLOYEE,
      specialite: '', nombresExperiences: undefined
    };
    this.modalError.set('');
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  // ── Modal Edit ───────────────────────────────────────────────
  openEditModal(user: UserDto) {
    this.selectedUser.set(user);
    this.editForm = {
      nom: user.nom, prenom: user.prenom, email: user.email,
      telephone: user.telephone ?? '', password: '',
      role: user.role, specialite: user.specialite ?? '',
      nombresExperiences: user.nombresExperiences
    };
    this.modalError.set('');
    this.modalMode.set('edit');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.modalError.set(''); }

  // ── Submit Create ────────────────────────────────────────────
  submitCreate() {
    if (!this.form.nom || !this.form.prenom || !this.form.email || !this.form.password) {
      this.modalError.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.modalError.set('Les mots de passe ne correspondent pas.');
      return;
    }
    if (this.form.password.length < 6) {
      this.modalError.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    this.modalLoading.set(true);
    this.modalError.set('');

    const request: RegisterRequest = {
      nom: this.form.nom, prenom: this.form.prenom,
      email: this.form.email, telephone: this.form.telephone,
      password: this.form.password, role: this.form.role
    };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.closeModal();
        this.loadUsers();
        this.showToast(`Compte de ${this.form.prenom} ${this.form.nom} créé avec succès !`, 'success');
      },
      error: (err: Error) => {
        this.modalLoading.set(false);
        this.modalError.set(err.message);
      }
    });
  }

  // ── Submit Edit ──────────────────────────────────────────────
  submitEdit() {
    const user = this.selectedUser();
    if (!user) return;
    if (!this.editForm.nom || !this.editForm.prenom || !this.editForm.email) {
      this.modalError.set('Nom, prénom et email sont obligatoires.');
      return;
    }

    this.modalLoading.set(true);
    this.modalError.set('');

    const request: UpdateUserRequest = {
      ...this.editForm,
      password: this.editForm.password || undefined,
      specialite: this.isEmployeeEdit() ? this.editForm.specialite : undefined,
      nombresExperiences: this.isEmployeeEdit() ? this.editForm.nombresExperiences : undefined
    };

    this.userService.updateUser(user.id, request).subscribe({
      next: (updated) => {
        this.modalLoading.set(false);
        this.closeModal();
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.showToast('Profil mis à jour avec succès !', 'success');
      },
      error: (err: Error) => {
        this.modalLoading.set(false);
        this.modalError.set(err.message);
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────
  confirmDelete(id: number) { this.deleteConfirmId.set(id); }
  cancelDelete()            { this.deleteConfirmId.set(null); }

  deleteUser(id: number) {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== id));
        this.deleteConfirmId.set(null);
        this.showToast('Compte supprimé.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  // ── Toggle Activation ────────────────────────────────────────
  toggleActivation(user: UserDto) {
    this.userService.toggleActivation(user.id).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.showToast(`Compte ${updated.activated ? 'activé' : 'désactivé'}.`, 'success');
      },
      error: () => this.showToast('Erreur lors de la mise à jour.', 'error')
    });
  }

  // ── Toast ────────────────────────────────────────────────────
  showToast(msg: string, type: 'success' | 'error') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(''), 4000);
  }

  // ── Helpers ──────────────────────────────────────────────────
  getSpecialiteLabel(sp?: string): string {
    if (!sp) return '—';
    return this.specialiteLabels[sp] ?? sp;
  }

  getRoleLabel(role: Role): string {
    return role === Role.EMPLOYEE ? 'Employée' : 'Réceptionniste';
  }

  getRoleIcon(role: Role): string {
    return role === Role.EMPLOYEE ? 'pi-briefcase' : 'pi-desktop';
  }

  getInitials(user: UserDto): string {
    return (user.prenom.charAt(0) + user.nom.charAt(0)).toUpperCase();
  }

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

  logout() { this.authService.logout(); }
}
