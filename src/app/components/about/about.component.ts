import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  team = [
    { name: 'Nadia Mansour', role: 'Directrice & Experte Mariée', exp: '12 ans d\'expérience' },
    { name: 'Sarra Ben Ali', role: 'Chef Coiffeuse', exp: '9 ans d\'expérience' },
    { name: 'Ines Trabelsi', role: 'Maquilleuse Professionnelle', exp: '7 ans d\'expérience' },
    { name: 'Amira Khelil', role: 'Spa & Esthéticienne', exp: '6 ans d\'expérience' }
  ];
}