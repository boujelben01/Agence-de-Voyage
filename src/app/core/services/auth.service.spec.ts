import { TestBed } from '@angular/core/testing';
import * as fireAuth from '@angular/fire/auth';
import * as fireStore from '@angular/fire/firestore';
import { AuthService } from './auth.service';

vi.mock('@angular/fire/auth', async () => {
  const { NEVER } = await import('rxjs');
  return {
    Auth: class {},
    authState: vi.fn(() => NEVER),
    createUserWithEmailAndPassword: vi.fn(),
    deleteUser: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('@angular/fire/firestore', async () => {
  const { NEVER } = await import('rxjs');
  return {
    Firestore: class {},
    doc: vi.fn(() => ({ path: 'users/uid-1' })),
    docData: vi.fn(() => NEVER),
    setDoc: vi.fn(),
  };
});

describe('AuthService.register', () => {
  const authUser = { uid: 'uid-1', email: 'ada@test.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: fireAuth.Auth, useValue: {} },
        { provide: fireStore.Firestore, useValue: {} },
      ],
    });
    vi.mocked(fireAuth.createUserWithEmailAndPassword).mockResolvedValue({
      user: authUser,
    } as unknown as fireAuth.UserCredential);
  });

  it('écrit le profil avec le rôle "user"', async () => {
    vi.mocked(fireStore.setDoc).mockResolvedValue(undefined);

    await TestBed.inject(AuthService).register('Ada', 'ada@test.com', 'motdepasse1');

    expect(fireStore.setDoc).toHaveBeenCalledWith(expect.anything(), {
      name: 'Ada',
      email: 'ada@test.com',
      role: 'user',
    });
    expect(fireAuth.deleteUser).not.toHaveBeenCalled();
  });

  it('supprime le compte Auth puis relance l’erreur si setDoc échoue', async () => {
    const failure = Object.assign(new Error('denied'), { code: 'permission-denied' });
    vi.mocked(fireStore.setDoc).mockRejectedValue(failure);
    vi.mocked(fireAuth.deleteUser).mockResolvedValue(undefined);

    await expect(
      TestBed.inject(AuthService).register('Ada', 'ada@test.com', 'motdepasse1'),
    ).rejects.toBe(failure);

    expect(fireAuth.deleteUser).toHaveBeenCalledWith(authUser);
  });
});
