import { firebaseErrorMessage } from './firebase-errors';

describe('firebaseErrorMessage', () => {
  it.each([
    ['auth/email-already-in-use', 'Un compte existe déjà avec cette adresse e-mail.'],
    ['auth/invalid-credential', 'E-mail ou mot de passe incorrect.'],
    ['auth/weak-password', 'Le mot de passe est trop faible (8 caractères minimum).'],
    ['auth/too-many-requests', 'Trop de tentatives. Veuillez réessayer dans quelques minutes.'],
    [
      'auth/network-request-failed',
      'Problème de connexion réseau. Vérifiez votre connexion et réessayez.',
    ],
  ])('traduit %s', (code, message) => {
    expect(firebaseErrorMessage({ code })).toBe(message);
  });

  it('retourne un message générique pour un code inconnu ou une valeur inattendue', () => {
    const generic = 'Une erreur est survenue. Veuillez réessayer.';
    expect(firebaseErrorMessage({ code: 'auth/autre' })).toBe(generic);
    expect(firebaseErrorMessage(new Error('boom'))).toBe(generic);
    expect(firebaseErrorMessage(null)).toBe(generic);
    expect(firebaseErrorMessage('auth/invalid-credential')).toBe(generic);
  });
});
