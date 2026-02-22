import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface PrintButtonProps {
  onPrint: () => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function PrintButton({
  onPrint,
  isPending,
  isSuccess,
  isError,
  error,
  reset,
}: PrintButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSuccess) {
      timerRef.current = setTimeout(() => reset(), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSuccess, reset]);

  if (isSuccess) {
    return (
      <View style={[styles.button, styles.successButton]}>
        <Text style={styles.successText}>Sent to printer!</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error?.message ?? 'Something went wrong'}</Text>
        <Pressable
          style={[styles.button, styles.retryButton]}
          onPress={onPrint}
          accessibilityRole="button"
          accessibilityLabel="Retry print"
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.button, isPending && styles.disabledButton]}
      onPress={onPrint}
      disabled={isPending}
      accessibilityRole="button"
      accessibilityLabel="Print image"
    >
      {isPending ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.buttonText}>Print</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.6,
  },
  successButton: {
    backgroundColor: '#81C784',
  },
  retryButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  successText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    textAlign: 'center',
  },
});
