/**
 * E2E Coverage Guard
 *
 * This test ensures that every user story in the spec has a
 * corresponding E2E test file, and that each file covers the
 * required acceptance scenarios. If a user story is added or
 * an E2E file is deleted, this test fails.
 *
 * To add a new user story:
 * 1. Add an entry to REQUIRED_E2E_COVERAGE below
 * 2. Create the test file in __tests__/e2e/
 * 3. Name each test with the "AS-N:" prefix
 */
import * as fs from 'fs';
import * as path from 'path';

const E2E_DIR = path.resolve(__dirname);

/**
 * Each entry maps a user story to its required E2E test file
 * and the minimum acceptance scenarios that must be covered.
 *
 * scenario IDs match the "AS-N:" prefix in test names.
 */
const REQUIRED_E2E_COVERAGE = [
  {
    story: 'US1 — Browse and Search Images',
    file: 'us1-browse-search.test.tsx',
    scenarios: ['AS-1', 'AS-3', 'AS-4', 'AS-5'],
  },
  {
    story: 'US2 — View Image Details and Print',
    file: 'us2-detail-print.test.tsx',
    scenarios: ['AS-1', 'AS-2', 'AS-3', 'AS-4', 'AS-5'],
  },
  {
    story: 'US3 — Browse Collections',
    file: 'us3-collections.test.tsx',
    scenarios: ['AS-2', 'AS-3', 'AS-4'],
  },
  {
    story: 'US4 — Configure Server Endpoint',
    file: 'us4-settings.test.tsx',
    scenarios: ['AS-2', 'AS-3', 'AS-5'],
  },
  {
    story: 'US5 — Branding (KM Kraft)',
    file: 'us5-branding.test.tsx',
    scenarios: ['AS-1', 'AS-2'],
  },
  {
    story: 'US6 — Device Auto-Registration and Rename',
    file: 'us6-device-tracking.test.tsx',
    scenarios: ['AS-1', 'AS-2', 'AS-3', 'AS-4', 'AS-5'],
  },
  {
    story: 'US7 — Activity Event Tracking',
    file: 'us7-activity-tracking.test.tsx',
    scenarios: ['AS-1', 'AS-2', 'AS-3', 'AS-4', 'AS-5'],
  },
  {
    story: 'US-Update-1 — Check for Updates Automatically',
    file: 'us-update.test.tsx',
    scenarios: ['AS-1', 'AS-2', 'AS-3'],
  },
  {
    story: 'US-Update-2 — Download and Install Update',
    file: 'us-update.test.tsx',
    scenarios: ['AS-1', 'AS-2', 'AS-3'],
  },
  {
    story: 'US-Update-3 — Manual Update Check',
    file: 'us-update.test.tsx',
    scenarios: ['AS-1', 'AS-2'],
  },
];

describe('E2E coverage guard', () => {
  for (const { story, file, scenarios } of REQUIRED_E2E_COVERAGE) {
    describe(story, () => {
      const filePath = path.join(E2E_DIR, file);

      test(`${file} exists`, () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      test('covers all required acceptance scenarios', () => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const missing = scenarios.filter((s) => !content.includes(`${s}:`));
        expect(missing).toEqual([]);
      });
    });
  }
});
