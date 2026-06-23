import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { eclipse } from '@uiw/codemirror-theme-eclipse';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const eclipseDarkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0e1319',
      color: '#d4dce8',
    },
    '.cm-content': {
      caretColor: '#21c45d',
      fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '.cm-gutters': {
      backgroundColor: '#171e28',
      color: '#64748b',
      border: 'none',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#1c2533',
      color: '#94a3b8',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(33, 196, 93, 0.06)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(56, 189, 248, 0.22) !important',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#21c45d',
      borderLeftWidth: '2px',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
  },
  { dark: true }
);

const eclipseDarkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#8cb4ff', fontWeight: 'bold' },
  { tag: [tags.definitionKeyword, tags.modifier], color: '#8cb4ff', fontWeight: 'bold' },
  { tag: tags.controlKeyword, color: '#8cb4ff', fontWeight: 'bold' },
  { tag: tags.className, color: '#4ec9b0', fontWeight: 'bold' },
  { tag: tags.typeName, color: '#4ec9b0' },
  { tag: tags.namespace, color: '#4ec9b0' },
  { tag: tags.function(tags.variableName), color: '#dcdcaa', fontWeight: '600' },
  { tag: tags.definition(tags.function(tags.variableName)), color: '#dcdcaa', fontWeight: '600' },
  { tag: tags.variableName, color: '#9cdcfe' },
  { tag: tags.definition(tags.variableName), color: '#9cdcfe' },
  { tag: tags.string, color: '#ce9178' },
  { tag: tags.character, color: '#ce9178' },
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.bool, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.null, color: '#569cd6', fontWeight: 'bold' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.lineComment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.blockComment, color: '#6a9955', fontStyle: 'italic' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.punctuation, color: '#d4d4d4' },
  { tag: tags.meta, color: '#c586c0' },
  { tag: tags.annotation, color: '#dcdcaa' },
]);

export default function JavaCodeEditor({
  value,
  onChange,
  label,
  readOnly = false,
  placeholder,
  minHeight = '280px',
  theme = 'dark',
}) {
  const extensions = useMemo(() => {
    const base = [java(), EditorView.lineWrapping];

    if (theme === 'dark') {
      base.push(eclipseDarkTheme, syntaxHighlighting(eclipseDarkHighlight));
    } else {
      base.push(eclipse);
    }

    if (readOnly) {
      base.push(EditorView.editable.of(false));
    }

    return base;
  }, [readOnly, theme]);

  return (
    <div className="code-editor-panel code-editor-panel--cm">
      {label && (
        <div className="code-editor-panel__label">
          <span className="file-dot" />
          {label}
        </div>
      )}
      <div className="cm-shell" style={{ minHeight }}>
        <CodeMirror
          value={value || ''}
          height="100%"
          minHeight={minHeight}
          theme={theme === 'dark' ? 'dark' : 'light'}
          extensions={extensions}
          onChange={(val) => onChange?.({ target: { value: val } })}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
          }}
        />
      </div>
    </div>
  );
}
