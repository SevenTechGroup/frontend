import 'fake-indexeddb/auto';
import { offlineDatabase } from './database';
import { draftRepository } from './draft.repository';

describe('DraftRepository', () => {
  beforeEach(async () => {
    await offlineDatabase.drafts.clear();
  });

  it('enregistre un brouillon sans jeton ni donnée de session', async () => {
    const draft = await draftRepository.save({
      clientSubmissionId: 'e87064c7-478f-47bb-ae36-4e6ce94dbf4b',
      title: 'Lampadaire cassé',
      consentAccepted: true,
      accessToken: 'secret-qui-ne-doit-jamais-sortir',
      jwt: 'autre-secret',
    } as Parameters<typeof draftRepository.save>[0] & {
      accessToken: string;
      jwt: string;
    });

    expect(draft.updatedAt).toBeTruthy();
    await expect(draftRepository.get(draft.clientSubmissionId)).resolves.toMatchObject({
      title: 'Lampadaire cassé',
      consentAccepted: true,
    });
    expect(draft).not.toHaveProperty('accessToken');
    expect(draft).not.toHaveProperty('jwt');
  });

  it('liste puis supprime un brouillon local', async () => {
    await draftRepository.save({
      clientSubmissionId: 'draft-to-remove',
      title: 'Canal bouché',
      consentAccepted: true,
    });

    await expect(draftRepository.list()).resolves.toHaveLength(1);
    await draftRepository.remove('draft-to-remove');
    await expect(draftRepository.get('draft-to-remove')).resolves.toBeUndefined();
  });
});
