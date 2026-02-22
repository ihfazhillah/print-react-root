/**
 * Child-friendly color theme
 *
 * Soft pastel palette: pink, purple, yellow
 * Designed for children — warm, inviting, high readability
 */
export const colors = {
  /** Backgrounds */
  background: '#FFF9FB', // very soft pink-white
  surface: '#FFF0F5', // soft pink surface (cards, inputs)
  surfaceAlt: '#F3EAFF', // soft lavender surface (chips, tags)
  placeholder: '#F5E6FF', // soft purple placeholder (images)

  /** Primary actions */
  primary: '#B388FF', // soft purple (main buttons, accents)
  primaryDark: '#9C6FE4', // deeper purple (pressed states)
  secondary: '#FFD54F', // soft yellow (highlights, accents)
  secondaryDark: '#FFC107', // deeper yellow

  /** Status */
  success: '#A5D6A7', // soft green
  successText: '#2E7D32', // readable green text
  error: '#EF9A9A', // soft red
  errorText: '#C62828', // readable red text
  retry: '#FFB74D', // soft orange (retry button)

  /** Text */
  textPrimary: '#4A3060', // dark purple (main text)
  textSecondary: '#8E6FAA', // muted purple (secondary text)
  textOnPrimary: '#FFFFFF', // white text on colored backgrounds

  /** Borders & dividers */
  border: '#E8D5F5', // soft purple border
  divider: '#F0DAF0', // soft pink divider

  /** Collection ribbon */
  ribbon: 'rgba(156, 111, 228, 0.88)', // semi-transparent purple
} as const;
