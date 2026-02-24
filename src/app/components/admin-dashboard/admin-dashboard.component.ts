import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { UserDto, Role, RegisterRequest, UpdateUserRequest } from '../../models/auth.models';

type Tab = 'all' | 'employees' | 'receptionists';
type ModalMode = 'create' | 'edit';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {

  // ── State ────────────────────────────────────────────────────
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

  readonly specialites = [
    'Coiffure', 'Maquillage', 'Spa & Massage',
    'Soins du visage', 'Manucure & Pédicure',
    'Épilation', 'Hammam', 'Soins du corps'
  ];

  // ── Computed ─────────────────────────────────────────────────
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

  totalEmployees  = computed(() => this.users().filter(u => u.role === Role.EMPLOYEE).length);
  totalReception  = computed(() => this.users().filter(u => u.role === Role.RECEPTIONIST).length);
  totalActive     = computed(() => this.users().filter(u => u.activated).length);

  isEmployeeForm  = computed(() => this.form.role === Role.EMPLOYEE);
  isEmployeeEdit  = computed(() => this.editForm.role === Role.EMPLOYEE);
  currentAdmin    = computed(() => this.authService.currentUser());

  Role = Role; // expose enum to template

  constructor(
    private userService: UserService,
    public authService: AuthService
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

  // ── Modal Create ─────────────────────────────────────────────
openCreateModal(role?: Role) {
  this.form = {
    nom: '', prenom: '', email: '', telephone: '',
    password: '', confirmPassword: '',
    role: role ?? Role.EMPLOYEE,  // ← pré-sélectionne le rôle
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
      // specialite et nombresExperiences ajoutés par l'employé lui-même depuis son profil
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
  cancelDelete() { this.deleteConfirmId.set(null); }

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
        const status = updated.activated ? 'activé' : 'désactivé';
        this.showToast(`Compte ${status}.`, 'success');
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
  getRoleLabel(role: Role): string {
    return role === Role.EMPLOYEE ? 'Employée' : 'Réceptionniste';
  }

  getRoleIcon(role: Role): string {
    return role === Role.EMPLOYEE ? 'pi-briefcase' : 'pi-desktop';
  }

  getInitials(user: UserDto): string {
    return (user.prenom.charAt(0) + user.nom.charAt(0)).toUpperCase();
  }

  setTab(tab: Tab) { this.activeTab.set(tab); }

  logout() { this.authService.logout(); }
}
