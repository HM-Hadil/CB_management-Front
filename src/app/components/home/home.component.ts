import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Service {
  icon: string;
  title: string;
  description: string;
  price: string;
}

interface Testimonial {
  name: string;
  text: string;
  rating: number;
  service: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  services: Service[] = [
    {
      icon: 'pi-heart-fill',
      title: 'Coiffure Mariée',
      description: 'Coiffures de luxe sur mesure pour votre grand jour. Chignons, ondulations, couronne de perles.',
      price: 'À partir de 150 DT'
    },
    {
      icon: 'pi-star-fill',
      title: 'Spa & Bien-être',
      description: 'Soins corporels relaxants, hammam royal, enveloppements aux huiles essentielles.',
      price: 'À partir de 80 DT'
    },
    {
      icon: 'pi-eye',
      title: 'Maquillage Prestige',
      description: 'Maquillage professionnel pour toutes occasions. Produits haut de gamme garantis.',
      price: 'À partir de 120 DT'
    },
    {
      icon: 'pi-sparkles',
      title: 'Soins du Visage',
      description: 'Soins hydratants, anti-âge, éclat du teint avec des produits de première qualité.',
      price: 'À partir de 60 DT'
    },
    {
      icon: 'pi-palette',
      title: 'Manucure & Pédicure',
      description: 'Pose de gel, nail art, soins des mains et des pieds avec des produits premium.',
      price: 'À partir de 40 DT'
    },
    {
      icon: 'pi-sun',
      title: 'Épilation & Soins',
      description: 'Épilation douce, épilation au sucre, soins post-épilation apaisants.',
      price: 'À partir de 30 DT'
    }
  ];

  stats = [
    { value: '500+', label: 'Mariées satisfaites' },
    { value: '8+', label: "Années d'expérience" },
    { value: '15+', label: 'Expertes beauté' },
    { value: '30+', label: 'Services disponibles' }
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Sana B.',
      text: "Une expérience absolument magique ! L'équipe d'Al-Ghanja m'a transformée pour mon mariage. Je me suis sentie une vraie princesse.",
      rating: 5,
      service: 'Coiffure & Maquillage Mariée'
    },
    {
      name: 'Rim K.',
      text: 'Le spa est d\'un luxe incomparable. L\'ambiance, les produits, le professionnalisme... Tout est parfait. Je recommande à 100% !',
      rating: 5,
      service: 'Spa Royal'
    },
    {
      name: 'Amal M.',
      text: 'Accueil chaleureux, cadre somptueux et résultats extraordinaires. Al-Ghanja est devenu mon centre beauté de confiance.',
      rating: 5,
      service: 'Soins du Visage'
    }
  ];

  galleryImages = [
    {
      src: 'assets/images/salon-sign.jpg',
      alt: 'Entrée Al-Ghanja Bride & Spa',
      caption: 'Notre Enseigne'
    },
    {
      src: 'assets/images/salon-lounge.jpg',
      alt: 'Salon de détente luxueux',
      caption: 'Espace Détente'
    },
    {
      src: 'assets/images/salon-reception.jpg',
      alt: 'Accueil et réception',
      caption: 'Accueil VIP'
    },
    {
      src: 'assets/images/salon-washroom.jpg',
      alt: 'Espace shampoing',
      caption: 'Espace Coiffure'
    }
  ];

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
