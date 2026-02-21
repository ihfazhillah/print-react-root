const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin that adds a network_security_config.xml to the Android project.
 * This allows the app to trust certificates that Android's default config rejects
 * (e.g. missing intermediates, older Let's Encrypt roots).
 *
 * Required because print.krokotak.com serves an untrusted certificate chain.
 * Without this, expo-image / RN Image fail with:
 *   java.security.cert.CertPathValidatorException: Trust anchor for certification path not found
 *
 * Requires a development build (not Expo Go).
 */

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Default: trust system CAs, allow cleartext for local backend -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>

    <!-- Trust both system and user-installed CAs for krokotak -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">krokotak.com</domain>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </domain-config>
</network-security-config>
`;

function withNetworkSecurityConfig(config) {
  // Step 1: Write the XML file into android/app/src/main/res/xml/
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), NETWORK_SECURITY_CONFIG_XML);
      return cfg;
    },
  ]);

  // Step 2: Reference it in AndroidManifest.xml
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const application = manifest.manifest.application?.[0];
    if (application) {
      application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return cfg;
  });

  return config;
}

module.exports = withNetworkSecurityConfig;
