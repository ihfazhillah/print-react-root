const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo config plugin that adds REQUEST_INSTALL_PACKAGES permission
 * to AndroidManifest.xml. Required for in-app APK self-update on Android 8+.
 */
function withInstallPermission(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const permissions = manifest['uses-permission'] || [];

    const alreadyAdded = permissions.some(
      (p) => p.$['android:name'] === 'android.permission.REQUEST_INSTALL_PACKAGES'
    );

    if (!alreadyAdded) {
      permissions.push({
        $: { 'android:name': 'android.permission.REQUEST_INSTALL_PACKAGES' },
      });
    }

    manifest['uses-permission'] = permissions;
    return cfg;
  });
}

module.exports = withInstallPermission;
