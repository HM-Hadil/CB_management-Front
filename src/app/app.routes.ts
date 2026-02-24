import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { ContactComponent } from './components/contact/contact.component';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard.component';
import { ReceptionistDashboardComponent } from './components/receptionist-dashboard/receptionist-dashboard.component';
import { adminGuard, employeeGuard, receptionistGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',        component: HomeComponent },
  { path: 'about',   component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login',   component: LoginComponent },

 

 { path: 'admin',          component: AdminDashboardComponent,      canActivate: [adminGuard] },
  { path: 'employee',       component: EmployeeDashboardComponent,   canActivate: [employeeGuard] },
  { path: 'receptionniste', component: ReceptionistDashboardComponent, canActivate: [receptionistGuard] },

  { path: '**',             redirectTo: '' }
];