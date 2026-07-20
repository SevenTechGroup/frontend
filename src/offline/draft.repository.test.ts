import 'fake-indexeddb/auto';
import { offlineDatabase } from './database';
import { draftRepository } from './draft.repository';

describe('DraftRepository', () => {
  beforeEach(async () => {
    await offlineDatabase.drafts.clear();
  });

  afterAll(() => {
    offlineDatabase.close();
  });

  it('enregistre un brouillon sans jeton ni donnée de session', async () => {
    const draft = await draftRepository.save({
      clientSubmissionId: 'e87064c7-478f-47bb-ae36-4e6ce94dbf4b',
      title: 'Lampadaire cassé',
      consentAccepted: true,
    });

    expect(draft.updatedAt).toBeTruthy();
    await expect(draftRepository.get(draft.clientSubmissionId)).resolves.toMatchObject({
      title: 'Lampadaire cassé',
      consentAccepted: true,
    });
  });
});
