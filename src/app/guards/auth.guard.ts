import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.models';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.getToken() || !auth.isAdmin()) {
    router.navigate(['/login']); return false;
  }
  return true;
};

export const employeeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.getToken() || auth.currentUser()?.role !== Role.EMPLOYEE) {
    router.navigate(['/login']); return false;
  }
  return true;
};

export const receptionistGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.getToken() || auth.currentUser()?.role !== Role.RECEPTIONIST) {
    router.navigate(['/login']); return false;
  }
  return true;
};
