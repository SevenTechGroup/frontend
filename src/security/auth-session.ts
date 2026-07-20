import type { User } from '../models';
import { tokenStorage } from './token-storage';

const USER_KEY = 'sahel-signal.user';

function readUser(): User | null {
  try {
    const value = window.sessionStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as User) : null;
  } catch {
    return null;
  }
}

export const authSession = {
  getToken: () => tokenStorage.get(),
  getUser: () => readUser(),
  set(token: string, user: User) {
    tokenStorage.set(token);
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  updateUser(user: User) {
    window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    tokenStorage.clear();
    try {
      window.sessionStorage.removeItem(USER_KEY);
    } catch {
      // Storage peut être indisponible (navigation privée ou politique navigateur).
    }
  },
};
