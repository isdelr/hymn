import { useEffect, useState } from 'react'
import { useMonaco } from '@monaco-editor/react'

// Custom warm charcoal dark theme matching the app's dark mode
const hymnDarkTheme = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    // Comments - muted warm gray
    { token: 'comment', foreground: '6b6560', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '6b6560', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '6b6560', fontStyle: 'italic' },

    // Keywords - blue accent
    { token: 'keyword', foreground: '7cacf8' },
    { token: 'keyword.control', foreground: '7cacf8' },
    { token: 'keyword.operator', foreground: '7cacf8' },

    // Strings - warm amber/gold
    { token: 'string', foreground: 'e8b967' },
    { token: 'string.key.json', foreground: '9db8e8' },
    { token: 'string.value.json', foreground: 'e8b967' },

    // Numbers - soft coral
    { token: 'number', foreground: 'e8967c' },
    { token: 'number.float', foreground: 'e8967c' },

    // Types/Classes - soft teal
    { token: 'type', foreground: '7ce8c8' },
    { token: 'type.identifier', foreground: '7ce8c8' },
    { token: 'entity.name.type', foreground: '7ce8c8' },
    { token: 'entity.name.class', foreground: '7ce8c8' },

    // Functions - lavender
    { token: 'entity.name.function', foreground: 'c8a8f8' },
    { token: 'support.function', foreground: 'c8a8f8' },

    // Variables - warm white
    { token: 'variable', foreground: 'e8e4e0' },
    { token: 'variable.parameter', foreground: 'e8d4b8' },

    // Operators
    { token: 'operator', foreground: '9db8e8' },

    // Punctuation
    { token: 'delimiter', foreground: '8a8580' },
    { token: 'delimiter.bracket', foreground: '9a9590' },

    // Constants
    { token: 'constant', foreground: 'e8967c' },
    { token: 'constant.language', foreground: '7cacf8' },

    // Annotations/Decorators
    { token: 'annotation', foreground: 'c8a8f8' },
    { token: 'metatag', foreground: 'c8a8f8' },
  ],
  colors: {
    // Editor background - warm charcoal
    'editor.background': '#2a2725',
    'editor.foreground': '#e8e4e0',

    // Selection - blue accent with warmth
    'editor.selectionBackground': '#4a6090',
    'editor.inactiveSelectionBackground': '#3a4a60',
    'editor.selectionHighlightBackground': '#4a609040',

    // Current line
    'editor.lineHighlightBackground': '#32302d',
    'editor.lineHighlightBorder': '#3a3835',

    // Cursor
    'editorCursor.foreground': '#7cacf8',

    // Line numbers
    'editorLineNumber.foreground': '#5a5550',
    'editorLineNumber.activeForeground': '#8a8580',

    // Gutter
    'editorGutter.background': '#2a2725',

    // Indent guides
    'editorIndentGuide.background': '#3a3835',
    'editorIndentGuide.activeBackground': '#4a4845',

    // Whitespace
    'editorWhitespace.foreground': '#3a3835',

    // Bracket matching
    'editorBracketMatch.background': '#4a609040',
    'editorBracketMatch.border': '#7cacf8',

    // Word highlight
    'editor.wordHighlightBackground': '#4a609030',
    'editor.wordHighlightStrongBackground': '#4a609050',

    // Find match
    'editor.findMatchBackground': '#e8b96750',
    'editor.findMatchHighlightBackground': '#e8b96730',

    // Scrollbar
    'scrollbarSlider.background': '#4a484540',
    'scrollbarSlider.hoverBackground': '#5a585560',
    'scrollbarSlider.activeBackground': '#6a686570',

    // Widget/dropdown
    'editorWidget.background': '#32302d',
    'editorWidget.border': '#4a4845',

    // Suggest/Autocomplete
    'editorSuggestWidget.background': '#32302d',
    'editorSuggestWidget.border': '#4a4845',
    'editorSuggestWidget.selectedBackground': '#4a6090',
    'editorSuggestWidget.highlightForeground': '#7cacf8',
  },
}

// Light theme - clean and warm
const hymnLightTheme = {
  base: 'vs' as const,
  inherit: true,
  rules: [
    // Comments
    { token: 'comment', foreground: '8a8075', fontStyle: 'italic' },
    { token: 'comment.line', foreground: '8a8075', fontStyle: 'italic' },
    { token: 'comment.block', foreground: '8a8075', fontStyle: 'italic' },

    // Keywords - blue
    { token: 'keyword', foreground: '3066be' },
    { token: 'keyword.control', foreground: '3066be' },
    { token: 'keyword.operator', foreground: '3066be' },

    // Strings - warm brown/amber
    { token: 'string', foreground: 'a65d00' },
    { token: 'string.key.json', foreground: '3066be' },
    { token: 'string.value.json', foreground: 'a65d00' },

    // Numbers - coral red
    { token: 'number', foreground: 'c44d34' },
    { token: 'number.float', foreground: 'c44d34' },

    // Types/Classes - teal
    { token: 'type', foreground: '0d7377' },
    { token: 'type.identifier', foreground: '0d7377' },
    { token: 'entity.name.type', foreground: '0d7377' },
    { token: 'entity.name.class', foreground: '0d7377' },

    // Functions - purple
    { token: 'entity.name.function', foreground: '7c4dff' },
    { token: 'support.function', foreground: '7c4dff' },

    // Variables
    { token: 'variable', foreground: '3a3530' },
    { token: 'variable.parameter', foreground: '5a4530' },

    // Operators
    { token: 'operator', foreground: '3066be' },

    // Punctuation
    { token: 'delimiter', foreground: '6a6560' },
    { token: 'delimiter.bracket', foreground: '5a5550' },

    // Constants
    { token: 'constant', foreground: 'c44d34' },
    { token: 'constant.language', foreground: '3066be' },

    // Annotations
    { token: 'annotation', foreground: '7c4dff' },
    { token: 'metatag', foreground: '7c4dff' },
  ],
  colors: {
    // Editor background - warm cream
    'editor.background': '#faf8f5',
    'editor.foreground': '#3a3530',

    // Selection
    'editor.selectionBackground': '#b8d4f8',
    'editor.inactiveSelectionBackground': '#d0e4f8',
    'editor.selectionHighlightBackground': '#b8d4f850',

    // Current line
    'editor.lineHighlightBackground': '#f0ede8',
    'editor.lineHighlightBorder': '#e8e4e0',

    // Cursor
    'editorCursor.foreground': '#3066be',

    // Line numbers
    'editorLineNumber.foreground': '#b0a8a0',
    'editorLineNumber.activeForeground': '#6a6560',

    // Gutter
    'editorGutter.background': '#faf8f5',

    // Indent guides
    'editorIndentGuide.background': '#e8e4e0',
    'editorIndentGuide.activeBackground': '#d0ccc8',

    // Whitespace
    'editorWhitespace.foreground': '#e0dcd8',

    // Bracket matching
    'editorBracketMatch.background': '#b8d4f850',
    'editorBracketMatch.border': '#3066be',

    // Word highlight
    'editor.wordHighlightBackground': '#b8d4f830',
    'editor.wordHighlightStrongBackground': '#b8d4f850',

    // Find match
    'editor.findMatchBackground': '#f8d878',
    'editor.findMatchHighlightBackground': '#f8d87850',

    // Scrollbar
    'scrollbarSlider.background': '#c0b8b040',
    'scrollbarSlider.hoverBackground': '#a8a09860',
    'scrollbarSlider.activeBackground': '#908880',

    // Widget
    'editorWidget.background': '#faf8f5',
    'editorWidget.border': '#e0dcd8',

    // Suggest
    'editorSuggestWidget.background': '#faf8f5',
    'editorSuggestWidget.border': '#e0dcd8',
    'editorSuggestWidget.selectedBackground': '#e0ecf8',
    'editorSuggestWidget.highlightForeground': '#3066be',
  },
}

export const HYMN_DARK_THEME = 'hymn-dark'
export const HYMN_LIGHT_THEME = 'hymn-light'

export function useMonacoTheme() {
  const monaco = useMonaco()
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  const [themesRegistered, setThemesRegistered] = useState(false)

  // Register custom themes when Monaco is ready
  useEffect(() => {
    if (monaco && !themesRegistered) {
      monaco.editor.defineTheme(HYMN_DARK_THEME, hymnDarkTheme)
      monaco.editor.defineTheme(HYMN_LIGHT_THEME, hymnLightTheme)
      setThemesRegistered(true)
    }
  }, [monaco, themesRegistered])

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'))
        }
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return {
    theme: isDark ? HYMN_DARK_THEME : HYMN_LIGHT_THEME,
    isDark,
    isReady: themesRegistered,
  }
}
