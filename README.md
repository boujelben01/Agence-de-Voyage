# Agence de Voyage

Démo en ligne : https://agence-de-voyage-67019.web.app

Application web de réservation de circuits : un catalogue de destinations à parcourir, filtrer et mettre en favoris,
une réservation en quelques étapes avec billet imprimable, et un back-office pour gérer le catalogue.

> Projet réalisé dans le cadre d'un cours Angular.
>
> Projet pédagogique : **toutes les données (circuits, hébergements, comptes, réservations) sont fictives.**
> Les photographies viennent de Wikimedia Commons, leurs auteurs et licences sont listés dans [CREDITS.md](CREDITS.md).

<!-- Captures d'écran : déposer les images dans docs/screenshots/ puis les référencer ici. -->
<!-- ![Accueil](docs/screenshots/accueil.png) -->

## Fonctionnalités

### Espace client

- **Catalogue** : filtres par continent, pays, budget et type d'hébergement, tri, recherche texte
  (insensible à la casse et aux accents), pagination « Voir plus ». Les filtres sont reflétés dans l'URL.
- **Détail d'un circuit** : galerie, description, itinéraire jour par jour, hébergement associé.
- **Favoris** : bouton cœur sur les cartes et la page de détail, filtre « Mes favoris seulement »,
  onglet dédié dans le profil.
- **Réservation** : choix de la date et du nombre de voyageurs, total calculé, confirmation immédiate.
- **Mes réservations** : suivi, annulation avec confirmation.
- **Billet** : vue imprimable (A4) à enregistrer en PDF depuis la fenêtre d'impression du navigateur.
- **Profil** : modification du nom, réservations, favoris.

### Back-office administrateur

- Tableau de bord avec indicateurs.
- Gestion des circuits et des hébergements (création, modification, suppression).
- Consultation et annulation des réservations de tous les clients.

### Qualité

- Interface en français, responsive, accessible (labels, `aria-*`, focus visibles, `prefers-reduced-motion`).
- Composants autonomes (standalone), `OnPush`, signaux, formulaires réactifs typés.

## Stack technique

| Domaine | Technologie |
| --- | --- |
| Framework | Angular 22.2 (composants standalone, signaux, routage paresseux) |
| Styles | Tailwind CSS 4 (thème « ocean / sand ») |
| Authentification et données | Firebase Authentication, Cloud Firestore (AngularFire) |
| Hébergement | Firebase Hosting |
| Tests | Vitest via `ng test` |

## Architecture

```
src/app/
├── core/          # modèles, services (auth, catalogue, réservations, favoris, profil), guards, utilitaires
├── features/      # pages par domaine
│   ├── home/      #   accueil
│   ├── catalog/   #   liste, filtres, détail
│   ├── booking/   #   formulaire, confirmation, liste des réservations, billet
│   ├── profile/   #   informations, réservations, favoris
│   ├── auth/      #   connexion, inscription
│   ├── admin/     #   back-office
│   └── not-found/
└── shared/        # composants réutilisables (navbar, carte, bouton favori, toasts, logo…)
public/images/     # photographies du catalogue (voir CREDITS.md)
server/            # jeu de données fictif (seed-data.json)
scripts/           # scripts d'import Firebase (seed:users, seed:catalog)
firestore.rules    # règles de sécurité Firestore
```

## Installation

Prérequis : Node.js et npm. Le projet a été testé avec Node.js 24.21 et Angular 22.2.2 (Angular CLI 22.2.2).

```bash
npm install
npm start          # serveur de développement sur http://localhost:4200
```

## Configuration Firebase

1. Créer un projet Firebase avec **Authentication** (méthode e-mail / mot de passe) et **Cloud Firestore**.
2. Renseigner la configuration web du projet dans `src/app/firebase.config.ts` (ces identifiants sont publics,
   la sécurité repose sur les règles Firestore).
3. Publier les règles de sécurité de [firestore.rules](firestore.rules) :

   ```bash
   firebase deploy --only firestore:rules
   ```

4. Pour les scripts d'import, télécharger une **clé de service** depuis la console Firebase
   (Paramètres du projet → Comptes de service) et l'enregistrer sous `serviceAccountKey.json` à la racine.
   Ce fichier est ignoré par Git : ne jamais le versionner.

## Données de démonstration

Les scripts écrivent dans le projet Firebase défini par la clé de service ; ils vérifient l'identifiant du projet
avant toute opération.

| Script | Rôle | Variables d'environnement |
| --- | --- | --- |
| `npm run seed:catalog` | Importe continents, circuits et hébergements de `server/seed-data.json` (idempotent). | aucune |
| `npm run seed:users` | Crée ou met à jour les comptes de démonstration (Authentication + `users/{uid}`). | `DEMO_ADMIN_PASSWORD`, `DEMO_PASSWORD` (8 caractères minimum) |

Exemple (PowerShell) :

```powershell
$env:DEMO_ADMIN_PASSWORD = '<mot de passe administrateur>'
$env:DEMO_PASSWORD = '<mot de passe des clients>'
npm run seed:users
```

Les mots de passe sont lus dans l'environnement et ne figurent jamais dans le code ni dans ce dépôt.

### Compte de démonstration

Les comptes de démonstration sont fictifs : ils ne correspondent à aucune personne réelle.

| Rôle | Compte | Mot de passe |
| --- | --- | --- |
| Client | `boujelbenyazid@test.com` | communiqué sur demande |

Le compte administrateur n'est pas documenté ici ; ses identifiants sont transmis directement aux personnes
qui doivent évaluer le back-office.

## Scripts npm

| Commande | Description |
| --- | --- |
| `npm start` | Serveur de développement |
| `npm run build` | Build de production dans `dist/agence-voyage` |
| `npm test` | Tests unitaires (Vitest), mode interactif ; `npm test -- --watch=false` pour une seule exécution |
| `npm run seed:catalog` | Import du catalogue |
| `npm run seed:users` | Création des comptes de démonstration |

## Tests

```bash
npm test                    # mode interactif (surveillance des fichiers)
npm test -- --watch=false   # une seule exécution (CI)
```

Les tests couvrent les utilitaires de filtrage et de réservation, les services (avec Firestore remplacé),
les guards et les composants principaux.

## Déploiement

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

`firebase.json` sert `dist/agence-voyage/browser` et redirige toutes les routes vers `index.html`
(application monopage).

## Sécurité

- **Rôle imposé par les règles** : le rôle (`user` ou `admin`) vit uniquement dans le document `users/{uid}`.
  Les règles Firestore refusent qu'un client le crée avec un autre rôle ou le modifie ; l'interface n'est qu'un confort.
- **Prix contrôlé côté règles** : à la création d'une réservation, `pricePerPerson` doit être égal au prix du circuit
  dans la base et `totalPrice` égal à ce prix multiplié par le nombre de voyageurs. Un client ne peut pas choisir son prix.
- **Réservations lisibles par leur propriétaire** : un client ne lit et n'annule que ses propres réservations ;
  seul un administrateur voit celles des autres. Les favoris (`users/{uid}/favorites`) sont réservés à leur propriétaire.
- **Clé web publique** : la clé API de `src/app/firebase.config.ts` identifie le projet, elle n'est pas un secret.
  Elle doit être restreinte côté Google Cloud (référents HTTP, API autorisées). La clé de service des scripts d'import
  n'est, elle, jamais versionnée (`serviceAccountKey.json` est ignoré par Git).

## Choix techniques

- **Angular standalone et signaux** : pas de modules, état local en signaux, `OnPush` partout, formulaires réactifs typés.
- **Firebase sans serveur applicatif** : Authentication, Firestore et Hosting suffisent ; la logique sensible
  (rôles, prix, propriété des données) est portée par les règles de sécurité.
- **Filtres dans l'URL** : continent, pays, budget, recherche et favoris sont des paramètres de requête, ce qui rend
  chaque vue partageable et gère correctement le bouton « précédent ».
- **Billet par impression navigateur** : aucune dépendance PDF ; une feuille de style d'impression produit un A4 propre
  à enregistrer en PDF.
- **Images sous licence libre** : photographies Wikimedia Commons, redimensionnées et créditées dans CREDITS.md.
- **Tests sans réseau** : les accès Firestore sont remplacés dans les tests, ce qui les rend rapides et déterministes.

## Pistes d'amélioration

- Tests de bout à bout (parcours inscription, réservation, annulation) et tests des règles Firestore sur l'émulateur.
- Paiement et gestion des disponibilités (places restantes par date).
- Avis et notes des voyageurs, galerie de photos par circuit.
- Génération d'un vrai PDF côté serveur et envoi du billet par e-mail.
- Internationalisation (anglais) et mode sombre.
- Optimisation des images (formats modernes, tailles adaptatives) et rendu côté serveur pour le référencement.

## Licence

Code source sous licence [MIT](LICENSE). Les photographies restent soumises à leurs licences respectives,
détaillées dans [CREDITS.md](CREDITS.md).
