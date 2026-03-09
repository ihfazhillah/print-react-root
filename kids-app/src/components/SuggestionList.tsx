import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Suggestion } from '../types/api';

interface SuggestionListProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSelect: (term: string) => void;
}

export function SuggestionList({ suggestions, isLoading, onSelect }: SuggestionListProps) {
  if (isLoading && suggestions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {suggestions.map((suggestion) => {
        const primary = suggestion.id_translation || suggestion.name;
        const subtitle = suggestion.id_translation ? suggestion.name : null;

        return (
          <Pressable
            key={suggestion.name}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => onSelect(suggestion.name)}
            accessibilityRole="button"
            accessibilityLabel={primary}
          >
            <Text style={styles.icon}>🔍</Text>
            <View style={styles.textContainer}>
              <Text style={styles.primary} numberOfLines={1}>{primary}</Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  icon: {
    fontSize: 16,
    marginRight: 12,
    color: colors.textSecondary,
  },
  textContainer: {
    flex: 1,
  },
  primary: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
