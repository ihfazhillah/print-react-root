/**
 * User Story 5 — App Branding (KM Kraft)
 *
 * Acceptance scenarios:
 * AS-1: App displays name "KM Kraft" in configuration
 * AS-2: App uses the leather-themed icon asset
 * AS-3: App header shows "KM Kraft" title
 */
import appJson from '../../app.json';
import * as fs from 'fs';
import * as path from 'path';

test('AS-1: app.json name is "KM Kraft"', () => {
  expect(appJson.expo.name).toBe('KM Kraft');
});

test('AS-1: app.json slug is "km-kraft"', () => {
  expect(appJson.expo.slug).toBe('km-kraft');
});

test('AS-1: app.json scheme is "km-kraft"', () => {
  expect(appJson.expo.scheme).toBe('km-kraft');
});

test('AS-2: leather icon asset exists', () => {
  const iconPath = path.resolve(__dirname, '../../assets/images/icon.png');
  expect(fs.existsSync(iconPath)).toBe(true);
});

test('AS-2: app.json icon references the new icon asset', () => {
  expect(appJson.expo.icon).toBe('./assets/images/icon.png');
});

test('AS-3: _layout.tsx sets header title to "KM Kraft"', () => {
  const layoutPath = path.resolve(__dirname, '../../app/_layout.tsx');
  const content = fs.readFileSync(layoutPath, 'utf-8');
  expect(content).toContain("headerTitle: 'KM Kraft'");
});
