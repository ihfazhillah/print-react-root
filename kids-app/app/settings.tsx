import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useServerConfig } from '../src/hooks/useServerConfig';
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

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <View style={styles.container}>
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
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
