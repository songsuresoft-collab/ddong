import { fixtureSessions, fixtureReports, fixtureReferences } from '@/fixtures/code-static';
import { saveSession, saveRulesetReports, saveReferences } from '@/utils/code-static/db';

/**
 * Load fixture/demo data into IndexedDB for testing.
 */
export async function loadFixtures(): Promise<void> {
    // Save sessions
    for (const session of fixtureSessions) {
        await saveSession(session);
    }

    // Save reports
    await saveRulesetReports(fixtureReports);

    // Save references
    await saveReferences(fixtureReferences);
}
