import { can, hasRole } from './authorization';
import type { User } from '../models';

const citizen: User = { id: 1, name: 'Awa', email: 'awa@example.test', role: 'citizen' };
const manager: User = { id: 2, name: 'Samba', email: 'samba@example.test', role: 'manager' };

describe('authorization', () => {
  it('refuse toute permission à une session absente', () => {
    expect(can(null, 'report:view')).toBe(false);
    expect(hasRole(null, ['citizen'])).toBe(false);
  });

  it('applique la matrice de rôles du backend', () => {
    expect(can(citizen, 'report:create')).toBe(true);
    expect(can(citizen, 'assignment:create')).toBe(false);
    expect(can(manager, 'assignment:create')).toBe(true);
    expect(can(manager, 'administration:view')).toBe(true);
  });
});
