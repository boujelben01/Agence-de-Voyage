/**
 * Importe le catalogue (continents, circuits, hébergements) de server/seed-data.json dans Firestore.
 *
 * Prérequis :
 *   - serviceAccountKey.json à la racine (clé de service, jamais commitée)
 *
 * Usage : npm run seed:catalog
 *
 * Les ids du fichier deviennent les ids de document : relancer le script met à jour les documents
 * existants sans créer de doublon. Les noms de pays et de continents sont traduits en français ;
 * les utilisateurs et réservations du fichier sont ignorés.
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const EXPECTED_PROJECT_ID = 'agence-de-voyage-67019';
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const dataPath = path.join(__dirname, '..', 'server', 'seed-data.json');

// Valeurs anglaises de l'ancien jeu de données -> français. Les valeurs déjà en français sont
// conservées telles quelles (identité), ce qui permet de mélanger anciennes et nouvelles données.
const COUNTRIES_FR = {
  France: 'France',
  Italie: 'Italie',
  Spain: 'Espagne',
  Espagne: 'Espagne',
  Norway: 'Norvège',
  Norvège: 'Norvège',
  Japan: 'Japon',
  Japon: 'Japon',
  Thailand: 'Thaïlande',
  Thaïlande: 'Thaïlande',
  Vietnam: 'Vietnam',
  Morocco: 'Maroc',
  Maroc: 'Maroc',
  Kenya: 'Kenya',
  'South Africa': 'Afrique du Sud',
  'Afrique du Sud': 'Afrique du Sud',
  USA: 'États-Unis',
  'États-Unis': 'États-Unis',
  Brazil: 'Brésil',
  Brésil: 'Brésil',
  Canada: 'Canada',
  Peru: 'Pérou',
  Pérou: 'Pérou',
  Australia: 'Australie',
  Australie: 'Australie',
  'New Zealand': 'Nouvelle-Zélande',
  'Nouvelle-Zélande': 'Nouvelle-Zélande',
  Grèce: 'Grèce',
  Portugal: 'Portugal',
  Islande: 'Islande',
  Égypte: 'Égypte',
  Tanzanie: 'Tanzanie',
  Tunisie: 'Tunisie',
  Indonésie: 'Indonésie',
  Inde: 'Inde',
  Mexique: 'Mexique',
  Argentine: 'Argentine',
  Turquie: 'Turquie',
  Maldives: 'Maldives',
};

const CONTINENTS_FR = {
  Europe: 'Europe',
  Asia: 'Asie',
  Asie: 'Asie',
  Africa: 'Afrique',
  Afrique: 'Afrique',
  America: 'Amérique',
  Amérique: 'Amérique',
  Australia: 'Océanie',
  Oceania: 'Océanie',
  Océanie: 'Océanie',
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function translate(map, value, kind) {
  const translated = map[value];
  if (!translated) {
    fail(`${kind} inconnu dans le fichier de données : "${value}". Aucune opération effectuée.`);
  }
  return translated;
}

if (!fs.existsSync(dataPath)) {
  fail('server/seed-data.json introuvable.');
}
const seed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function withoutId(item) {
  const { id, ...data } = item;
  return data;
}

// Tout est préparé et validé avant la moindre écriture.
const continents = seed.continents.map((item) => ({
  id: String(item.id),
  data: {
    ...withoutId(item),
    name: translate(CONTINENTS_FR, item.name, 'Continent'),
    countries: item.countries.map((country) => translate(COUNTRIES_FR, country, 'Pays')),
  },
}));

const accommodations = seed.accommodations.map((item) => ({
  id: String(item.id),
  data: { ...withoutId(item), country: translate(COUNTRIES_FR, item.country, 'Pays') },
}));

const tours = seed.tours.map((item) => ({
  id: String(item.id),
  data: {
    ...withoutId(item),
    country: translate(COUNTRIES_FR, item.country, 'Pays'),
    continent: translate(CONTINENTS_FR, item.continent, 'Continent'),
    accommodationId: String(item.accommodationId),
  },
}));

for (const [name, list] of [
  ['continents', continents],
  ['circuits', tours],
  ['hébergements', accommodations],
]) {
  if (new Set(list.map((item) => item.id)).size !== list.length) {
    fail(`Ids en double dans les ${name}. Aucune opération effectuée.`);
  }
}

const continentOfCountry = new Map();
for (const continent of continents) {
  for (const country of continent.data.countries) {
    continentOfCountry.set(country, continent.data.name);
  }
}

const accommodationIds = new Set(accommodations.map((a) => a.id));
for (const tour of tours) {
  const { accommodationId, itinerary, duration, country, continent } = tour.data;
  if (!accommodationIds.has(accommodationId)) {
    fail(
      `Le circuit ${tour.id} référence l'hébergement ${accommodationId}, qui n'existe pas. ` +
        'Aucune opération effectuée.',
    );
  }
  if (!Array.isArray(itinerary) || itinerary.length !== duration) {
    fail(
      `Le circuit ${tour.id} dure ${duration} jour(s) mais son itinéraire compte ` +
        `${Array.isArray(itinerary) ? itinerary.length : 0} étape(s). Aucune opération effectuée.`,
    );
  }
  if (continentOfCountry.get(country) !== continent) {
    fail(
      `Le circuit ${tour.id} : le pays "${country}" n'appartient pas au continent "${continent}". ` +
        'Aucune opération effectuée.',
    );
  }
}

// Les images sont des fichiers de public/ : un chemin cassé est refusé avant toute écriture.
for (const item of [...tours, ...accommodations]) {
  const image = item.data.image;
  if (typeof image !== 'string' || !fs.existsSync(path.join(__dirname, '..', 'public', image))) {
    fail(`Image introuvable pour ${item.id} : "${image}" (dans public/). Aucune opération effectuée.`);
  }
}

console.log(
  `Données valides : ${continents.length} continent(s), ${tours.length} circuit(s), ` +
    `${accommodations.length} hébergement(s).`,
);
if (process.argv.includes('--dry-run')) {
  console.log('Mode --dry-run : aucune connexion à Firebase, rien n’est écrit.');
  process.exit(0);
}

if (!fs.existsSync(keyPath)) {
  fail('serviceAccountKey.json introuvable à la racine du projet.');
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
if (serviceAccount.project_id !== EXPECTED_PROJECT_ID) {
  fail(
    `La clé de service appartient au projet "${serviceAccount.project_id}", ` +
      `attendu "${EXPECTED_PROJECT_ID}". Aucune opération effectuée.`,
  );
}

initializeApp({
  credential: cert(serviceAccount),
  projectId: EXPECTED_PROJECT_ID,
});
const db = getFirestore();

async function writeCollection(name, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach(({ id, data }) => batch.set(db.collection(name).doc(id), data));
    await batch.commit();
  }
  console.log(`${name}: ${docs.length} document(s)`);
}

async function main() {
  await writeCollection('continents', continents);
  await writeCollection('accommodations', accommodations);
  await writeCollection('tours', tours);
  console.log('Terminé.');
}

main().catch((error) => {
  console.error('Échec du seed :', error.message);
  process.exit(1);
});
