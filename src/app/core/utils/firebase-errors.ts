const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse e-mail.',
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/weak-password': 'Le mot de passe est trop faible (8 caractères minimum).',
  'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
  'auth/network-request-failed': 'Problème de connexion réseau. Vérifiez votre connexion et réessayez.',
};

const DEFAULT_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';

/** Traduit une erreur Firebase (Auth ou Firestore) en message français destiné à l'utilisateur. */
export function firebaseErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string' && code in MESSAGES) {
      return MESSAGES[code];
    }
  }
  return DEFAULT_MESSAGE;
}
