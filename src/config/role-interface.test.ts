import { describe, expect, it } from 'vitest';
import { getRoleInterface } from './role-interface';

describe('role interface', () => {
  it('réserve la création et les brouillons au parcours citoyen', () => {
    const citizenPaths = getRoleInterface('citizen').nav.map((item) => item.to);
    const agentPaths = getRoleInterface('agent').nav.map((item) => item.to);
    const managerPaths = getRoleInterface('manager').nav.map((item) => item.to);

    expect(citizenPaths).toContain('/signalements/nouveau');
    expect(citizenPaths).toContain('/brouillons');
    expect(agentPaths).not.toContain('/signalements/nouveau');
    expect(managerPaths).not.toContain('/brouillons');
  });

  it('donne aux équipes un espace opérationnel distinct', () => {
    expect(getRoleInterface('agent').nav.map((item) => item.to)).toContain('/affectations');
    expect(getRoleInterface('manager').nav.map((item) => item.to)).toContain('/affectations');
    expect(getRoleInterface('agent').reports.title).not.toBe(
      getRoleInterface('manager').reports.title,
    );
  });
});
