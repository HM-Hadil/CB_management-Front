import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/auth.models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  showPassword = signal(false);
  error = signal('');
  loading = signal(false);
  selectedRole = signal<Role>(Role.RECEPTIONIST);

  credentials = { email: '', password: '' };

  roles = [
    { value: Role.ADMIN,        label: 'Administrateur', icon: 'pi-shield',    desc: 'Gestion complète' },
    { value: Role.RECEPTIONIST, label: 'Réceptionniste', icon: 'pi-desktop',   desc: 'Accueil & RDV' },
    { value: Role.EMPLOYEE,     label: 'Employée',       icon: 'pi-briefcase', desc: 'Planning & soins' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  selectRole(role: Role) {
    this.selectedRole.set(role);
    this.error.set('');
  }

  togglePassword() {
    this.showPassword.set(!this.showPassword());
  }

  login() {
    if (!this.credentials.email || !this.credentials.password) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.login({
      email: this.credentials.email,
      password: this.credentials.password
    }).subscribe({
      next: (response) => {
        this.loading.set(false);

        // Vérifier que le rôle correspond à la sélection
        if (response.role !== this.selectedRole()) {
          this.authService.logout();
          this.error.set(`Ce compte n'est pas un(e) ${this.getRoleLabel(this.selectedRole())}. Vérifiez votre espace.`);
          return;
        }

        this.redirectByRole(response.role);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message);
      }
    });
  }

  private redirectByRole(role: Role): void {
    switch (role) {
      case Role.ADMIN:         this.router.navigate(['/admin']); break;
      case Role.RECEPTIONIST:  this.router.navigate(['/receptionniste']); break;
      case Role.EMPLOYEE:      this.router.navigate(['/employee']); break;
      default:                 this.router.navigate(['/']);
    }
  }

  private getRoleLabel(role: Role): string {
    return this.roles.find(r => r.value === role)?.label ?? role;
  }
}
