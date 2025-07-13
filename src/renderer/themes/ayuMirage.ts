import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Ayu Mirage color scheme
const colors = {
  bg: '#1f2430',
  fg: '#cbccc6',
  selection: '#33415e',
  cursor: '#ffcc66',
  
  // Syntax colors
  comment: '#5c6773',
  keyword: '#ffa759',
  string: '#bae67e',
  number: '#d4bfff',
  operator: '#f29e74',
  function: '#73d0ff',
  type: '#39bae6',
  constant: '#ffdfb3',
  variable: '#cbccc6',
  punctuation: '#cbccc6',
  
  // UI colors
  gutter: '#191e2a',
  gutterText: '#5c6773',
  line: '#232834',
  activeLine: '#2d3b54',
  matchingBracket: '#5ccfe6',
};

// Create the highlighting style
const ayuMirageHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: colors.comment, fontStyle: 'italic' },
  { tag: t.lineComment, color: colors.comment, fontStyle: 'italic' },
  { tag: t.blockComment, color: colors.comment, fontStyle: 'italic' },
  
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: colors.keyword },
  { tag: [t.definitionKeyword, t.modifier], color: colors.keyword },
  
  { tag: [t.string, t.docString], color: colors.string },
  { tag: t.character, color: colors.string },
  
  { tag: [t.number, t.integer, t.float], color: colors.number },
  { tag: [t.bool, t.null], color: colors.number },
  
  { tag: [t.operator, t.operatorKeyword], color: colors.operator },
  { tag: [t.arithmeticOperator, t.logicOperator, t.bitwiseOperator], color: colors.operator },
  { tag: [t.compareOperator, t.updateOperator], color: colors.operator },
  
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: colors.function },
  
  { tag: [t.typeName, t.className], color: colors.type },
  { tag: [t.definition(t.typeName), t.definition(t.className)], color: colors.type },
  
  { tag: [t.constant(t.variableName), t.constant(t.propertyName)], color: colors.constant },
  { tag: [t.standard(t.variableName), t.standard(t.propertyName)], color: colors.constant },
  
  { tag: [t.variableName, t.propertyName], color: colors.variable },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: colors.variable },
  
  { tag: [t.bracket, t.paren, t.brace], color: colors.punctuation },
  { tag: [t.punctuation, t.separator], color: colors.punctuation },
  
  { tag: t.invalid, color: '#ff3333', textDecoration: 'underline' },
]);

// Create the theme extension
export const ayuMirageTheme = EditorView.theme({
  '&': {
    color: colors.fg,
    backgroundColor: colors.bg,
  },
  
  '.cm-content': {
    padding: '16px',
    caretColor: colors.cursor,
  },
  
  '.cm-focused .cm-cursor': {
    borderLeftColor: colors.cursor,
  },
  
  '.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: colors.selection,
  },
  
  '.cm-activeLine': {
    backgroundColor: colors.activeLine,
  },
  
  '.cm-gutters': {
    backgroundColor: colors.gutter,
    color: colors.gutterText,
    border: 'none',
  },
  
  '.cm-activeLineGutter': {
    backgroundColor: colors.activeLine,
  },
  
  '.cm-lineNumbers .cm-gutterElement': {
    color: colors.gutterText,
    padding: '0 8px 0 16px',
  },
  
  '.cm-foldPlaceholder': {
    backgroundColor: colors.selection,
    border: 'none',
    color: colors.fg,
  },
  
  '.cm-matchingBracket, .cm-nonmatchingBracket': {
    backgroundColor: colors.matchingBracket + '40',
    outline: `1px solid ${colors.matchingBracket}`,
  },
  
  '.cm-searchMatch': {
    backgroundColor: colors.matchingBracket + '40',
    outline: `1px solid ${colors.matchingBracket}`,
  },
  
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: colors.matchingBracket + '80',
  },
  
  '.cm-tooltip': {
    backgroundColor: colors.gutter,
    border: `1px solid ${colors.selection}`,
    color: colors.fg,
  },
  
  '.cm-completionLabel': {
    color: colors.fg,
  },
  
  '.cm-completionDetail': {
    color: colors.comment,
    fontStyle: 'italic',
  },
}, { dark: true });

// Light theme for light mode
export const ayuLightTheme = EditorView.theme({
  '&': {
    color: '#5c6166',
    backgroundColor: '#fafafa',
  },
  
  '.cm-content': {
    padding: '16px',
    caretColor: '#ff9940',
  },
  
  '.cm-focused .cm-cursor': {
    borderLeftColor: '#ff9940',
  },
  
  '.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#036dd626',
  },
  
  '.cm-activeLine': {
    backgroundColor: '#f3f4f6',
  },
  
  '.cm-gutters': {
    backgroundColor: '#f8f9fa',
    color: '#828c99',
    border: 'none',
  },
  
  '.cm-activeLineGutter': {
    backgroundColor: '#f3f4f6',
  },
  
  '.cm-lineNumbers .cm-gutterElement': {
    color: '#828c99',
    padding: '0 8px 0 16px',
  },
}, { dark: false });

// Light theme highlighting
const ayuLightHighlightStyle = HighlightStyle.define([
  { tag: t.comment, color: '#787b8099', fontStyle: 'italic' },
  { tag: t.lineComment, color: '#787b8099', fontStyle: 'italic' },
  { tag: t.blockComment, color: '#787b8099', fontStyle: 'italic' },
  
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: '#fa8d3e' },
  { tag: [t.definitionKeyword, t.modifier], color: '#fa8d3e' },
  
  { tag: [t.string, t.docString], color: '#86b300' },
  { tag: t.character, color: '#86b300' },
  
  { tag: [t.number, t.integer, t.float], color: '#a37acc' },
  { tag: [t.bool, t.null], color: '#a37acc' },
  
  { tag: [t.operator, t.operatorKeyword], color: '#ed9366' },
  { tag: [t.arithmeticOperator, t.logicOperator, t.bitwiseOperator], color: '#ed9366' },
  { tag: [t.compareOperator, t.updateOperator], color: '#ed9366' },
  
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: '#4cbf99' },
  
  { tag: [t.typeName, t.className], color: '#399ee6' },
  { tag: [t.definition(t.typeName), t.definition(t.className)], color: '#399ee6' },
  
  { tag: [t.constant(t.variableName), t.constant(t.propertyName)], color: '#f2ae49' },
  { tag: [t.standard(t.variableName), t.standard(t.propertyName)], color: '#f2ae49' },
  
  { tag: [t.variableName, t.propertyName], color: '#5c6166' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: '#5c6166' },
  
  { tag: [t.bracket, t.paren, t.brace], color: '#5c6166' },
  { tag: [t.punctuation, t.separator], color: '#5c6166' },
  
  { tag: t.invalid, color: '#ff3333', textDecoration: 'underline' },
]);

// Export complete themes
export const ayuMirage: Extension = [
  ayuMirageTheme,
  syntaxHighlighting(ayuMirageHighlightStyle),
];

export const ayuLight: Extension = [
  ayuLightTheme,
  syntaxHighlighting(ayuLightHighlightStyle),
];