import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Tour } from '../../core/models/tour.model';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService } from '../../core/services/catalog.service';
import { DestinationCardComponent } from '../../shared/destination-card/destination-card.component';
import { SectionTitleComponent } from '../../shared/section-title/section-title.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { formatDuration, formatPrice } from '../catalog/catalog-filters';

interface Destination {
  name: string;
  region: string;
  tagline: string;
  image: string;
  alt: string;
}

/** Élément à icône (tracé SVG viewBox 24x24, trait). */
interface IconItem {
  title: string;
  text: string;
  path: string;
}

interface Step {
  title: string;
  text: string;
}

interface Testimonial {
  quote: string;
  author: string;
  trip: string;
}

/** Page d'accueil : vitrine de l'agence. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, DestinationCardComponent, SectionTitleComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="contenu" tabindex="-1" class="focus:outline-none">
      <!-- Hero : seule image chargée en priorité de la page. -->
      <section
        class="surface-dark relative isolate flex min-h-[min(calc(100svh-4rem),42rem)] items-center overflow-hidden bg-ocean-950"
        aria-labelledby="hero-title"
      >
        <img
          src="images/hero-kyoto.jpg"
          alt=""
          width="1500"
          height="1000"
          fetchpriority="high"
          class="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_50%]"
        />
        <div
          class="absolute inset-0 -z-10 bg-linear-to-r from-ocean-950/90 via-ocean-950/60 to-ocean-950/15"
        ></div>
        <div
          class="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-ocean-950/70 to-transparent"
        ></div>

        <div class="container-page py-16 pb-28 sm:py-24 sm:pb-32">
          <p class="eyebrow">Agence de voyage sur mesure</p>
          <h1 id="hero-title" class="mt-5 max-w-3xl text-balance text-display text-white">
            Partez là où le monde vous <span class="text-sand-300">inspire</span>.
          </h1>
          <p class="mt-6 max-w-xl text-lead text-ocean-50">
            Des circuits soigneusement composés et des hébergements choisis pour vous, de la
            première idée jusqu’au retour.
          </p>

          <div class="mt-9 flex flex-col gap-3 sm:flex-row">
            <a routerLink="/destinations" class="btn-sand w-full sm:w-auto">Découvrir les destinations</a>
            @if (auth.profile() === null) {
              <a routerLink="/inscription" class="btn-outline w-full sm:w-auto">Créer mon compte</a>
            }
          </div>
        </div>
      </section>

      <!-- Repères : textes statiques, aucun chiffre inventé. -->
      <section class="container-page relative z-10 -mt-14 sm:-mt-16" aria-label="Nos engagements">
        <ul
          class="card grid divide-y divide-ocean-100 shadow-lift sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          @for (point of highlights; track point.title) {
            <li class="flex items-start gap-4 p-5 sm:p-6">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-field bg-ocean-50 text-ocean-700"
              >
                <svg viewBox="0 0 24 24" class="h-6 w-6" aria-hidden="true">
                  <path
                    [attr.d]="point.path"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <div>
                <p class="font-semibold text-ocean-950">{{ point.title }}</p>
                <p class="mt-0.5 text-sm text-ocean-800">{{ point.text }}</p>
              </div>
            </li>
          }
        </ul>
      </section>

      <!-- Destinations populaires -->
      <section id="destinations" class="container-page section" aria-labelledby="destinations-title">
        <app-section-title
          class="reveal"
          eyebrow="Inspirations"
          title="Destinations populaires"
          description="Quatre horizons parmi les plus demandés par nos voyageurs."
          titleId="destinations-title"
        />

        @if (tours(); as list) {
          <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (tour of list; track tour.id) {
              <li class="reveal">
                <app-destination-card
                  [title]="tour.title"
                  [region]="tour.country"
                  [image]="tour.image"
                  [badge]="tour.continent"
                  [meta]="duration(tour.duration)"
                  [price]="price(tour.price)"
                  [link]="['/destinations', tour.id]"
                  [favoriteTourId]="tour.id"
                />
              </li>
            }
          </ul>
          <p class="mt-12 text-center">
            <a routerLink="/destinations" class="btn-primary">Voir toutes les destinations</a>
          </p>
        } @else if (loading()) {
          <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            @for (n of placeholders; track n) {
              <li><app-skeleton class="h-[22rem] rounded-card" /></li>
            }
          </ul>
        } @else {
          <!-- Repli : catalogue vide ou indisponible, on garde une vitrine statique. -->
          <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            @for (destination of showcase; track destination.name) {
              <li class="reveal">
                <app-destination-card
                  [title]="destination.name"
                  [region]="destination.region"
                  [tagline]="destination.tagline"
                  [image]="destination.image"
                  [alt]="destination.alt"
                />
              </li>
            }
          </ul>
        }
      </section>

      <!-- Comment ça marche -->
      <section class="bg-ocean-50" aria-labelledby="how-title">
        <div class="container-page section">
          <app-section-title
            class="reveal"
            align="center"
            eyebrow="Simple et clair"
            title="Comment ça marche"
            description="Trois étapes, du premier coup d’œil au départ."
            titleId="how-title"
          />
          <ol class="mt-12 grid gap-6 md:grid-cols-3">
            @for (step of steps; track step.title; let i = $index) {
              <li class="reveal card relative p-6 sm:p-8">
                <span
                  class="flex h-12 w-12 items-center justify-center rounded-full bg-ocean-700 text-lg font-semibold text-white"
                  aria-hidden="true"
                  >{{ i + 1 }}</span
                >
                <h3 class="mt-5 text-h3 text-ocean-950">
                  <span class="sr-only">Étape {{ i + 1 }} : </span>{{ step.title }}
                </h3>
                <p class="mt-2 text-ocean-800">{{ step.text }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Pourquoi nous choisir -->
      <section class="container-page section" aria-labelledby="why-title">
        <app-section-title
          class="reveal"
          eyebrow="Notre approche"
          title="Pourquoi nous choisir"
          titleId="why-title"
        />
        <ul class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          @for (advantage of advantages; track advantage.title) {
            <li class="reveal">
              <span
                class="flex h-12 w-12 items-center justify-center rounded-field bg-ocean-700 text-sand-300"
              >
                <svg viewBox="0 0 24 24" class="h-6 w-6" aria-hidden="true">
                  <path
                    [attr.d]="advantage.path"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
              <h3 class="mt-5 text-h3 text-ocean-950">{{ advantage.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-ocean-800">{{ advantage.text }}</p>
            </li>
          }
        </ul>
      </section>

      <!-- Témoignages : exemples fictifs, signalés comme tels. -->
      <section class="bg-ocean-50" aria-labelledby="testimonials-title">
        <div class="container-page section">
          <app-section-title
            class="reveal"
            eyebrow="Témoignages"
            title="Ce que pourraient dire nos voyageurs"
            description="Exemples fictifs rédigés pour la démonstration : ils ne proviennent pas de vrais clients."
            titleId="testimonials-title"
          />
          <ul class="mt-12 grid gap-6 md:grid-cols-3">
            @for (item of testimonials; track item.author) {
              <li class="reveal card flex flex-col p-6 sm:p-8">
                <p class="badge-accent self-start">Exemple fictif</p>
                <blockquote class="mt-4 flex-1 text-ocean-950">« {{ item.quote }} »</blockquote>
                <p class="mt-6 text-sm text-ocean-800">
                  <span class="font-semibold text-ocean-950">{{ item.author }}</span> ·
                  {{ item.trip }}
                </p>
              </li>
            }
          </ul>
        </div>
      </section>

      <!-- Appel à l'action -->
      <section class="container-page section" aria-labelledby="cta-title">
        <div
          class="surface-dark relative overflow-hidden rounded-panel bg-ocean-800 px-6 py-14 text-center shadow-lift sm:px-12 sm:py-20"
        >
          <div
            class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ocean-700/60"
            aria-hidden="true"
          ></div>
          <div
            class="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-sand-300/10"
            aria-hidden="true"
          ></div>
          <div class="relative">
            @if (auth.profile() === null) {
              <h2 id="cta-title" class="mx-auto max-w-2xl text-balance text-h2 text-white">
                Votre prochain voyage commence par un compte.
              </h2>
              <p class="mx-auto mt-4 max-w-xl text-ocean-100">
                Créez votre espace en quelques secondes et préparez votre prochaine aventure.
              </p>
              <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a routerLink="/inscription" class="btn-sand">Créer mon compte</a>
                <a routerLink="/connexion" class="btn-outline">J’ai déjà un compte</a>
              </div>
            } @else {
              <h2 id="cta-title" class="mx-auto max-w-2xl text-balance text-h2 text-white">
                Prêt à choisir votre prochaine destination&nbsp;?
              </h2>
              <p class="mx-auto mt-4 max-w-xl text-ocean-100">
                Parcourez le catalogue, comparez les circuits et réservez en quelques clics.
              </p>
              <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a routerLink="/destinations" class="btn-sand">Voir les destinations</a>
              </div>
            }
          </div>
        </div>
      </section>
    </main>
  `,
})
export class HomeComponent {
  private readonly catalog = inject(CatalogService);
  /** Lecture seule : le bouton « Créer mon compte » n'apparaît que pour un visiteur confirmé. */
  protected readonly auth = inject(AuthService);

  protected readonly duration = formatDuration;
  protected readonly price = formatPrice;
  protected readonly placeholders = [1, 2, 3, 4];

  /** Les 4 premiers circuits ; null tant que le catalogue est vide, en chargement ou en erreur. */
  protected readonly tours = signal<Tour[] | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.catalog
      .getTours(4)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe({
        next: (tours) => {
          this.tours.set(tours.length > 0 ? tours : null);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected readonly showcase: readonly Destination[] = [
    {
      name: 'Rio de Janeiro',
      region: 'Brésil',
      tagline: 'Baie, plages et Pain de Sucre.',
      image: 'images/rio-de-janeiro.jpg',
      alt: 'Vue aérienne de la baie de Rio de Janeiro avec le Christ Rédempteur',
    },
    {
      name: 'Baie d’Ha Long',
      region: 'Vietnam',
      tagline: 'Pitons calcaires et eaux turquoise.',
      image: 'images/baie-d-halong.jpg',
      alt: 'Vue aérienne de la baie d’Ha Long, îlots calcaires et villages flottants',
    },
    {
      name: 'Fjords de Norvège',
      region: 'Norvège',
      tagline: 'Villages de bois au pied des falaises.',
      image: 'images/norvege-fjords.jpg',
      alt: 'Village de maisons colorées au bord d’un fjord norvégien',
    },
    {
      name: 'Milford Sound',
      region: 'Nouvelle-Zélande',
      tagline: 'Montagnes et reflets sur le fjord.',
      image: 'images/nouvelle-zelande.jpg',
      alt: 'Montagnes se reflétant dans les eaux calmes de Milford Sound',
    },
  ];

  protected readonly highlights: readonly IconItem[] = [
    {
      title: 'Circuits sur plusieurs continents',
      text: 'Des itinéraires jour par jour, du week-end prolongé à la grande traversée.',
      path: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z',
    },
    {
      title: 'Un hébergement par circuit',
      text: 'Hôtel, maison ou camping : chaque séjour est associé à une adresse choisie.',
      path: 'M3 20V10l9-6 9 6v10M9 20v-6h6v6',
    },
    {
      title: 'Réservation en ligne',
      text: 'Confirmation immédiate et annulation possible depuis votre espace.',
      path: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM9 14l2 2 4-4',
    },
  ];

  protected readonly steps: readonly Step[] = [
    {
      title: 'Choisir',
      text: 'Filtrez par continent, budget ou type d’hébergement et comparez les circuits.',
    },
    {
      title: 'Réserver',
      text: 'Indiquez votre date de départ et le nombre de voyageurs : le total se calcule en direct.',
    },
    {
      title: 'Voyager',
      text: 'Retrouvez votre confirmation et vos réservations dans votre espace personnel.',
    },
  ];

  protected readonly testimonials: readonly Testimonial[] = [
    {
      quote: 'Un itinéraire clair, des étapes bien rythmées : on n’a eu qu’à profiter du paysage.',
      author: 'Camille (exemple)',
      trip: 'Circuit en Norvège',
    },
    {
      quote: 'La réservation a pris deux minutes et le récapitulatif était limpide du début à la fin.',
      author: 'Thomas (exemple)',
      trip: 'Séjour au Japon',
    },
    {
      quote: 'Un hébergement charmant, exactement comme décrit. Je recommanderais sans hésiter.',
      author: 'Inès (exemple)',
      trip: 'Escapade au Portugal',
    },
  ];

  protected readonly advantages: readonly IconItem[] = [
    {
      title: 'Voyages sur mesure',
      text: 'Chaque itinéraire est pensé selon vos envies, votre rythme et votre budget.',
      path: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    },
    {
      title: 'Hébergements sélectionnés',
      text: 'Des adresses testées et choisies pour leur confort, leur cadre et leur accueil.',
      path: 'M3 20V10l9-6 9 6v10M9 20v-6h6v6',
    },
    {
      title: 'Accompagnement humain',
      text: 'Une équipe disponible avant, pendant et après votre voyage.',
      path: 'M4 12a8 8 0 0116 0v4a2 2 0 01-2 2h-1v-6h3M4 12v4a2 2 0 002 2h1v-6H4M12 20h3',
    },
    {
      title: 'Réservation sereine',
      text: 'Un parcours simple, des informations claires et aucun mauvais plan caché.',
      path: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2.2 2.2L15.5 10',
    },
  ];
}
