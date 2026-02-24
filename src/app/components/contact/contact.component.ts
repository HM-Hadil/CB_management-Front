import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  submitted = signal(false);

  form = {
    firstName: '', 
    lastName: '', 
    email: '', 
    phone: '', 
    subject: '', 
    message: ''
  };

  submitForm() {
    this.submitted.set(true);
  }

  resetForm() {
    this.form = { firstName: '', lastName: '', email: '', phone: '', subject: '', message: '' };
    this.submitted.set(false);
  }
}