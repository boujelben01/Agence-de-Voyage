/**
 * Crée (ou met à jour le profil de) 3 comptes de démonstration : Firebase Auth + users/{uid}.
 *
 * Prérequis :
 *   - serviceAccountKey.json à la racine (clé de service, jamais commitée)
 *   - DEMO_ADMIN_PASSWORD : mot de passe du compte admin (8 caractères minimum)
 *   - DEMO_PASSWORD       : mot de passe des comptes utilisateur (8 caractères minimum)
 *
 * Usage (PowerShell) :
 *   $env:DEMO_ADMIN_PASSWORD='...'; $env:DEMO_PASSWORD='...'; npm run seed:users
 *
 * Un compte déjà existant garde son mot de passe : seuls son nom et son profil sont mis à jour.
 */
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const EXPECTED_PROJECT_ID = 'agence-de-voyage-67019';
const MIN_PASSWORD_LENGTH = 8;
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requirePassword(variable) {
  const value = process.env[variable];
  if (!value || value.length < MIN_PASSWORD_LENGTH) {
    fail(
      `${variable} est requis (${MIN_PASSWORD_LENGTH} caractères minimum). ` +
        'Il ne doit jamais figurer dans le code.',
    );
  }
  return value;
}

const adminPassword = requirePassword('DEMO_ADMIN_PASSWORD');
const userPassword = requirePassword('DEMO_PASSWORD');

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

const ACCOUNTS = [
  { name: 'Admin Agence', email: 'admin@test.com', role: 'admin', password: adminPassword },
  { name: 'Yazid BOUJELBEN', email: 'boujelbenyazid@test.com', role: 'user', password: userPassword },
  { name: 'Client Demo', email: 'client@test.com', role: 'user', password: userPassword },
];

initializeApp({
  credential: cert(serviceAccount),
  projectId: EXPECTED_PROJECT_ID,
});
const auth = getAuth();
const db = getFirestore();

async function upsertAccount({ name, email, role, password }) {
  let record;
  let created = false;
  try {
    record = await auth.getUserByEmail(email);
    // Compte existant : on ne touche pas au mot de passe.
    record = await auth.updateUser(record.uid, { displayName: name });
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
    record = await auth.createUser({ email, password, displayName: name, emailVerified: true });
    created = true;
  }
  await db.collection('users').doc(record.uid).set({ name, email, role });
  console.log(`${created ? 'créé    ' : 'mis à jour'}  ${email}  (${role})  uid=${record.uid}`);
}

async function main() {
  for (const account of ACCOUNTS) {
    await upsertAccount(account);
  }
  console.log('Terminé.');
}

main().catch((error) => {
  console.error('Échec du seed :', error.message);
  process.exit(1);
});