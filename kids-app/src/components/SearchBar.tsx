import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: (query: string) => void;
}

export function SearchBar({ onSearch, onFocus, onBlur, onSubmit }: SearchBarProps) {
  const [text, setText] = useState('');

  const handleChange = (value: string) => {
    setText(value);
    onSearch(value);
  };

  const handleClear = () => {
    setText('');
    onSearch('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search images..."
        value={text}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search images"
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={() => onSubmit?.(text)}
      />
      {text.length > 0 && (
        <Pressable
          style={styles.clearButton}
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 6,
  },
  clearText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
