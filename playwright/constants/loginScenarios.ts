export interface LoginScenarioDefinition {
  id: string;
  title: string;
  tags: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  specFile: string;
}

export const LOGIN_SCENARIO_MATRIX: LoginScenarioDefinition[] = [
  { id: 'LOGIN-SMOKE-001', title: 'Super Admin login UI+API', tags: ['@smoke', '@p0'], priority: 'P0', specFile: 'login.smoke.spec.ts' },
  { id: 'LOGIN-SMOKE-002', title: 'Tenant Owner email login UI+API', tags: ['@smoke', '@p0'], priority: 'P0', specFile: 'login.smoke.spec.ts' },
  { id: 'LOGIN-SMOKE-003', title: 'Tenant User email login UI+API', tags: ['@smoke', '@p0'], priority: 'P0', specFile: 'login.smoke.spec.ts' },
  { id: 'LOGIN-SMOKE-004', title: 'Tenant Owner mobile login UI+API', tags: ['@smoke', '@p0'], priority: 'P0', specFile: 'login.smoke.spec.ts' },
  { id: 'LOGIN-SMOKE-005', title: 'Invalid password UI+API failure', tags: ['@smoke', '@p0', '@negative'], priority: 'P0', specFile: 'login.smoke.spec.ts' },
  { id: 'LOGIN-SMOKE-006', title: 'Logout clears session', tags: ['@smoke', '@p0'], priority: 'P0', specFile: 'login.smoke.spec.ts' },
  { id: 'LOGIN-REG-001', title: 'Empty identifier validation', tags: ['@regression'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-002', title: 'Empty password validation', tags: ['@regression'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-003', title: 'Both fields empty validation', tags: ['@regression'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-004', title: 'Non-existent user safe failure', tags: ['@regression', '@negative'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-005', title: 'Identifier whitespace trim', tags: ['@regression', '@boundary'], priority: 'P2', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-006', title: 'Enter key submit', tags: ['@regression', '@ui'], priority: 'P2', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-007', title: 'Double-click stability', tags: ['@regression', '@race'], priority: 'P2', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-008', title: 'Session persists after refresh', tags: ['@regression', '@session'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-009', title: 'Session persists in new tab', tags: ['@regression', '@session'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-010', title: 'Protected route redirect', tags: ['@regression', '@authorization'], priority: 'P1', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-011', title: 'Invalid email format', tags: ['@regression', '@validation'], priority: 'P2', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-012', title: 'Unicode/emoji identifier handling', tags: ['@regression', '@boundary'], priority: 'P2', specFile: 'login.regression.spec.ts' },
  { id: 'LOGIN-REG-013', title: 'Lockout after 5 failures for 15 seconds', tags: ['@regression', '@lockout'], priority: 'P1', specFile: 'login.lockout.spec.ts' },
  { id: 'LOGIN-SEC-001', title: 'Reflected XSS safe handling', tags: ['@security', '@xss'], priority: 'P1', specFile: 'login.security.spec.ts' },
  { id: 'LOGIN-SEC-002', title: 'SQL injection safe handling', tags: ['@security', '@injection'], priority: 'P1', specFile: 'login.security.spec.ts' },
  { id: 'LOGIN-SEC-003', title: 'loginMode parameter tampering rejected', tags: ['@security', '@tampering'], priority: 'P1', specFile: 'login.security.spec.ts' },
  { id: 'LOGIN-SEC-004', title: 'Tampered JWT cannot access protected route', tags: ['@security', '@jwt'], priority: 'P1', specFile: 'login.security.spec.ts' },
  { id: 'LOGIN-SEC-005', title: 'Tenant login remains tenant-scoped', tags: ['@security', '@tenantIsolation'], priority: 'P0', specFile: 'login.security.spec.ts' },
  { id: 'LOGIN-API-001', title: 'Live auth API contract discovery', tags: ['@api-contract'], priority: 'P2', specFile: 'login.api-contract.spec.ts' },
];
