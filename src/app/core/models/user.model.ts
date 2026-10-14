export type Role = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
}
