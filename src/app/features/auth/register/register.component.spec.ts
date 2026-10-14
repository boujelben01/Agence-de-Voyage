import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent — validation', () => {
  const register = vi.fn();

  function createForm() {
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    });
    return TestBed.createComponent(RegisterComponent).componentInstance.form;
  }

  beforeEach(() => register.mockReset());

  const valid = {
    name: 'Ada Lovelace',
    email: 'ada@test.com',
    password: 'motdepasse1',
    confirmPassword: 'motdepasse1',
  };

  it('accepte des valeurs valides', () => {
    const form = createForm();
    form.setValue(valid);
    expect(form.valid).toBe(true);
  });

  it('refuse des mots de passe différents', () => {
    const form = createForm();
    form.setValue({ ...valid, confirmPassword: 'autrechose1' });
    expect(form.invalid).toBe(true);
    expect(form.hasError('passwordsMismatch')).toBe(true);
  });

  it('refuse une adresse e-mail invalide', () => {
    const form = createForm();
    form.setValue({ ...valid, email: 'pas-un-email' });
    expect(form.controls.email.hasError('email')).toBe(true);
    expect(form.invalid).toBe(true);
  });

  it('refuse un mot de passe de moins de 8 caractères et un nom vide', () => {
    const form = createForm();
    form.setValue({ ...valid, name: '  ', password: 'court', confirmPassword: 'court' });
    expect(form.controls.password.hasError('minlength')).toBe(true);
    expect(form.controls.name.invalid).toBe(true);
  });

  it('n’appelle pas register() tant que le formulaire est invalide', async () => {
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { register } }],
    });
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    await component.submit();
    expect(register).not.toHaveBeenCalled();
  });
});
