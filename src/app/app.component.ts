import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastModule],
  template: `
    <p-toast position="top-right"></p-toast>
    <app-navbar></app-navbar>
    <main>
      <router-outlet></router-outlet>
    </main>
    @if (!authService.isAuthenticated()) {
      <app-footer></app-footer>
    }
  `,
  styles: [`
    main {
      min-height: 100vh;
    }
  `],
  providers: [MessageService]
})
export class AppComponent {
  title = 'Al-Ghanja Bride & Spa';
  constructor(public authService: AuthService) {}
}
