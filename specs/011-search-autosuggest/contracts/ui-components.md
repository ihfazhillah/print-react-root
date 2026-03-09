# UI Component Contracts: Search Autosuggest & Discovery

**Branch**: `011-search-autosuggest` | **Date**: 2026-03-09

---

## SuggestionList (new component)

**File**: `kids-app/src/components/SuggestionList.tsx`

**Purpose**: Renders the inline suggestion list that replaces the image grid when suggestions are active. Used for both autocomplete (query-driven) and discovery (popularity-driven).

**Props**:

```typescript
interface SuggestionListProps {
  suggestions: Suggestion[];
  isLoading: boolean;
  onSelect: (term: string) => void;
}
```

**Behaviour**:
- When `isLoading` and `suggestions` is empty: show a subtle loading indicator (spinner or skeleton rows).
- When `isLoading` is false and `suggestions` is empty: render nothing (parent controls visibility).
- Each row shows:
  - Primary label: `id_translation || name` (larger text)
  - Subtitle: `name` if `id_translation` exists (smaller, muted text)
  - Leading magnifying glass icon
- Tapping a row calls `onSelect(suggestion.name)` — always passes the English `name` as the search term (backend search matches on English names).
- List is scrollable; no maximum height cap (fills available content area).

---

## SearchBar (modified — existing component)

**File**: `kids-app/src/components/SearchBar.tsx`

**New props added**:

```typescript
onFocus?: () => void;
onBlur?: () => void;
```

No other changes to existing props or behavior.

---

## index.tsx (home screen — modified)

**New state**:

```typescript
const [searchFocused, setSearchFocused] = useState(false);
```

**Suggestion visibility logic**:

```
showDiscovery   = searchFocused && searchQuery.length === 0
showAutocomplete = searchQuery.length >= 2
showSuggestions  = showDiscovery || showAutocomplete
```

When `showSuggestions` is true, the image grid (`FlatList`) is replaced by `<SuggestionList>`.

When a suggestion is selected:
1. `setSearchQuery(term)` — triggers debounced search
2. `setSearchFocused(false)` — hides suggestions, shows grid with results

