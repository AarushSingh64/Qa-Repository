import { test as base } from '@fixtures/testFixtures';
import { LoginPage } from '@pages/LoginPage';
import { TestArtifactCollector, attachBugReport } from '@helpers/artifacts';

type LoginFixtures = {
  loginPageFresh: LoginPage;
  artifactCollector: TestArtifactCollector;
};

export const test = base.extend<LoginFixtures>({
  // Ensure each test starts unauthenticated unless explicitly logging in.
  loginPageFresh: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  artifactCollector: async ({ page }, use, testInfo) => {
    const collector = new TestArtifactCollector(page);
    collector.attachListeners();
    await use(collector);

    if (testInfo.status !== testInfo.expectedStatus) {
      await collector.attachToTest(testInfo);
      await attachBugReport(testInfo, {
        testId: testInfo.title,
        title: testInfo.title,
        severity: 'High',
        priority: 'P0',
        module: 'Login',
        steps: ['Execute automated login test scenario'],
        expected: 'Login module behavior matches business rules and API contract',
        actual: `Test failed with status ${testInfo.status}`,
        rootCausePossibility: 'UI regression, auth API contract change, or environment instability',
        regressionAreas: ['Authentication', 'Session management', 'RBAC entry points'],
      });
    }
  },
});

export { expect } from '@playwright/test';

export function annotateLoginTest(
  testInfo: import('@playwright/test').TestInfo,
  metadata: {
    module: string;
    priority: 'P0' | 'P1' | 'P2' | 'P3';
    businessRule: string;
    tags: string[];
  },
): void {
  for (const tag of metadata.tags) {
    testInfo.annotations.push({ type: 'tag', description: tag });
  }

  testInfo.annotations.push(
    { type: 'module', description: metadata.module },
    { type: 'priority', description: metadata.priority },
    { type: 'businessRule', description: metadata.businessRule },
  );
}
