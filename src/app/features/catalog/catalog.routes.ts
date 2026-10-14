import { Routes } from '@angular/router';

export const CATALOG_ROUTES: Routes = [
  {
    path: '',
    title: 'Destinations',
    loadComponent: () => import('./catalog-list.component').then((m) => m.CatalogListComponent),
  },
  {
    path: ':id',
    title: 'Circuit',
    loadComponent: () =>
      import('./catalog-detail.component').then((m) => m.CatalogDetailComponent),
  },
];
