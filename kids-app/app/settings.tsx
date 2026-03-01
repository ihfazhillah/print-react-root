import { useEffect, useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useServerConfig } from '../src/hooks/useServerConfig';
import { useDeviceSettings } from '../src/hooks/useDeviceSettings';
import { colors } from '../src/theme';

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false;
  return ip.split('.').every((octet) => {
    const n = Number(octet);
    return n >= 0 && n <= 255;
  });
}

export default function SettingsScreen() {
  const { config, updateConfig, isLoading } = useServerConfig();
  const [ip, setIp] = useState(config.ip);
  const [port, setPort] = useState(String(config.port));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const { deviceName, syncStatus, syncError, saveName } = useDeviceSettings();
  const [nameInput, setNameInput] = useState('');

  // Sync name input when stored name loads
  useEffect(() => {
    if (deviceName) setNameInput(deviceName);
  }, [deviceName]);

  // Sync form fields from config whenever the screen gains focus or config loads.
  // This fixes stale values when navigating back: useState() only captures the
  // initial config value; this effect keeps inputs in sync with saved state.
  useFocusEffect(
    useCallback(() => {
      if (!isLoading) {
        setIp(config.ip);
        setPort(String(config.port));
      }
    }, [config.ip, config.port, isLoading]),
  );

  if (isLoading) return null;

  const handleSave = async () => {
    setError('');
    setSaved(false);

    if (!isValidIp(ip.trim())) {
      setError('Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }

    const portNum = port.trim() === '' ? 80 : Number(port.trim());
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Please enter a valid port number (1-65535)');
      return;
    }

    await updateConfig({ ip: ip.trim(), port: portNum });
    setSaved(true);
  };

  const handleSaveName = async () => {
    await saveName(nameInput);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Device</Text>

        <Text style={styles.label}>Device Name</Text>
        <TextInput
          style={styles.input}
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="My Device"
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel="Device name"
        />
        {syncStatus === 'syncing' && <Text style={styles.hint}>Saving…</Text>}
        {syncStatus === 'synced' && <Text style={styles.success}>Name saved!</Text>}
        {syncStatus === 'error' && syncError && <Text style={styles.error}>{syncError}</Text>}

        <Pressable
          style={styles.saveButton}
          onPress={handleSaveName}
          accessibilityRole="button"
          accessibilityLabel="Save device name"
        >
          <Text style={styles.saveButtonText}>Save Name</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Server</Text>

        <Text style={styles.label}>Server IP Address</Text>
        <TextInput
          style={styles.input}
          value={ip}
          onChangeText={(text) => {
            setIp(text);
            setError('');
            setSaved(false);
          }}
          placeholder="192.168.68.254"
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Server IP address"
        />

        <Text style={styles.label}>Port (optional)</Text>
        <TextInput
          style={styles.input}
          value={port}
          onChangeText={(text) => {
            setPort(text);
            setError('');
            setSaved(false);
          }}
          placeholder="80"
          keyboardType="numeric"
          accessibilityLabel="Server port"
        />

        {error !== '' && <Text style={styles.error}>{error}</Text>}
        {saved && <Text style={styles.success}>Settings saved!</Text>}

        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save settings"
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },
  error: {
    color: colors.errorText,
    fontSize: 14,
    marginTop: 12,
  },
  success: {
    color: colors.successText,
    fontSize: 14,
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
