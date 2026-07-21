import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardStats, User } from '../models';
import { offlineDatabase } from '../offline/database';
import { authSession } from '../security/auth-session';
import { dashboardService } from './dashboard.service';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('./api/http-client', () => ({
  httpClient: { get: getMock },
}));

const manager: User = {
  id: 12,
  name: 'Aminata Ndiaye',
  email: 'aminata@example.test',
  role: 'manager',
};
const stats: DashboardStats = {
  total_reports: 9,
  total_assignments: 4,
  unread_notifications: 1,
  my_reports: 0,
  my_assignments: 0,
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('DashboardService offline', () => {
  beforeEach(async () => {
    getMock.mockReset();
    await offlineDatabase.apiCache.clear();
    authSession.clear();
    authSession.set('test-token', manager);
    setOnline(true);
  });

  it('restitue le dernier tableau de bord enregistré lorsque le réseau est coupé', async () => {
    getMock.mockResolvedValueOnce({ data: { data: stats } });

    await expect(dashboardService.get()).resolves.toEqual(stats);

    setOnline(false);
    getMock.mockRejectedValueOnce(new Error('Le serveur est injoignable'));

    await expect(dashboardService.get()).resolves.toEqual(stats);
    expect(getMock).toHaveBeenCalledOnce();
  });
});
