import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { ProfileError, ProfileService } from './profile.service';

/** Remplace uniquement l'écriture Firestore : toute la logique du service est exercée. */
class RecordingProfileService extends ProfileService {
  readonly writes: { uid: string; name: string }[] = [];
  failWith: unknown = null;

  protected override async writeName(uid: string, name: string): Promise<void> {
    if (this.failWith) {
      throw this.failWith;
    }
    this.writes.push({ uid, name });
  }
}

describe('ProfileService.updateName', () => {
  let auth: { currentUser: { uid: string } | null };

  function service(): RecordingProfileService {
    return TestBed.inject(RecordingProfileService);
  }

  beforeEach(() => {
    auth = { currentUser: { uid: 'uid-1' } };
    TestBed.configureTestingModule({
      providers: [
        RecordingProfileService,
        { provide: Auth, useValue: auth },
        { provide: Firestore, useValue: {} },
      ],
    });
  });

  it('écrit uniquement le nom, sans espaces autour, pour l’utilisateur connecté', async () => {
    await firstValueFrom(service().updateName('  Ada King  '));
    expect(service().writes).toEqual([{ uid: 'uid-1', name: 'Ada King' }]);
  });

  it('refuse un nom invalide sans écrire', async () => {
    await expect(firstValueFrom(service().updateName('   '))).rejects.toBeInstanceOf(ProfileError);
    await expect(firstValueFrom(service().updateName('x'.repeat(101)))).rejects.toThrow('100 caractères');
    expect(service().writes).toEqual([]);
  });

  it('refuse sans utilisateur connecté', async () => {
    auth.currentUser = null;
    await expect(firstValueFrom(service().updateName('Ada'))).rejects.toThrow('connecté');
    expect(service().writes).toEqual([]);
  });

  it('convertit une erreur Firestore en message affichable', async () => {
    service().failWith = Object.assign(new Error('denied'), { code: 'permission-denied' });
    await expect(firstValueFrom(service().updateName('Ada'))).rejects.toThrow('pas autorisée');
  });
});
