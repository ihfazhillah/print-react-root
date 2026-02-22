import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

interface EmptyStateProps {
  message: string;
  onRetry?: () => void;
}

export function EmptyState({ message, onRetry }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry && (
        <Pressable
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  text: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.retry,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
