import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// Convert plain text (with \n) to HTML paragraphs
function textToHtml(text: string): string {
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// Load Quill 2 JS + CSS from CDN (only once)
function loadQuill(): Promise<any> {
  if ((window as any).__quillPromise) return (window as any).__quillPromise;

  (window as any).__quillPromise = Promise.all([
    new Promise<void>((resolve) => {
      if (document.getElementById('quill-css')) { resolve(); return; }
      const link = document.createElement('link');
      link.id = 'quill-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css';
      link.onload = () => resolve();
      document.head.appendChild(link);
    }),
    new Promise<any>((resolve) => {
      if ((window as any).Quill) { resolve((window as any).Quill); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/quill@2/dist/quill.js';
      script.onload = () => resolve((window as any).Quill);
      document.head.appendChild(script);
    }),
  ]).then(([_, Quill]) => Quill);

  return (window as any).__quillPromise;
}

// Detect text direction based on first strong directional character
function detectTextDirection(text: string): 'rtl' | 'ltr' {
  const rtlRe = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const ltrRe = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
  for (const ch of text) {
    if (rtlRe.test(ch)) return 'rtl';
    if (ltrRe.test(ch)) return 'ltr';
  }
  return 'rtl'; // default for Persian app
}

// Auto-detect and apply direction per line in Quill
function autoFormatDirections(quill: any) {
  const text = quill.getText();
  const lines = text.split('\n');
  let index = 0;
  for (const line of lines) {
    const dir = line.trim() ? detectTextDirection(line) : 'rtl';
    if (dir === 'rtl') {
      quill.formatLine(index, 1, { direction: 'rtl', align: 'right' }, 'silent');
    } else {
      quill.formatLine(index, 1, { direction: false, align: false }, 'silent');
    }
    index += line.length + 1;
  }
}

const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline', 'strike'],
  [{ header: 1 }, { header: 2 }, { header: 3 }],
  [{ list: 'bullet' }, { list: 'ordered' }],
  ['blockquote', 'code-block'],
  ['link', 'image', 'video'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }, { direction: 'rtl' }],
  ['clean'],
];

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const initializedRef = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let cancelled = false;

    loadQuill().then((Quill) => {
      if (cancelled || !editorRef.current) return;

      const quill = new Quill(editorRef.current, {
        theme: 'snow',
        modules: { toolbar: TOOLBAR_OPTIONS },
        placeholder: placeholder || '\u0645\u062a\u0646 \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f...',
      });

      quillRef.current = quill;

      // Prevent toolbar mousedown from stealing editor focus/selection
      const toolbar = editorRef.current?.previousElementSibling;
      if (toolbar?.classList.contains('ql-toolbar')) {
        toolbar.addEventListener('mousedown', (e: Event) => {
          e.preventDefault();
        });
      }

      // Set initial content via clipboard so Quill parses lists/breaks properly
      if (value) {
        const html = textToHtml(value);
        quill.clipboard.dangerouslyPasteHTML(html);
      }

      // Auto-detect direction per line instead of forcing all to RTL
      autoFormatDirections(quill);

      quill.on('text-change', (_delta: any, _oldDelta: any, source: string) => {
        if (source !== 'silent') {
          autoFormatDirections(quill);
        }
        const html = quill.root.innerHTML;
        onChangeRef.current(html === '<p><br></p>' ? '' : html);
      });
    });

    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <div ref={editorRef} />
      <style dangerouslySetInnerHTML={{ __html: DARK_THEME_CSS }} />
    </View>
  );
}

const DARK_THEME_CSS = `
  .ql-toolbar.ql-snow {
    background: #18181b;
    border-color: #27272a;
    border-radius: 6px 6px 0 0;
  }
  .ql-container.ql-snow {
    background: #09090b;
    border-color: #27272a;
    border-radius: 0 0 6px 6px;
    font-family: sans-serif;
    font-size: 14px;
    color: #fafafa;
    min-height: 250px;
  }
  .ql-container.ql-snow:focus-within { border-color: #3f3f46; }

  .ql-editor {
    min-height: 250px;
    line-height: 28px;
  }
  .ql-editor.ql-blank::before {
    color: #52525b;
    font-style: normal;
    right: 15px;
    left: auto;
    direction: rtl;
    text-align: right;
  }

  /* Icon colors */
  .ql-snow .ql-stroke { stroke: #a1a1aa; }
  .ql-snow .ql-fill { fill: #a1a1aa; }
  .ql-snow .ql-picker { color: #a1a1aa; }
  .ql-snow .ql-picker-label { color: #a1a1aa; }
  .ql-snow .ql-picker-options { background: #18181b; border-color: #27272a; }
  .ql-snow .ql-picker-item { color: #a1a1aa; }
  .ql-snow .ql-picker-item:hover { color: #fafafa; }
  .ql-snow .ql-picker-item.ql-selected { color: #8b5cf6; }

  /* Hover */
  .ql-snow button:hover .ql-stroke,
  .ql-snow .ql-picker-label:hover .ql-stroke { stroke: #fafafa; }
  .ql-snow button:hover .ql-fill,
  .ql-snow .ql-picker-label:hover .ql-fill { fill: #fafafa; }
  .ql-snow .ql-picker-label:hover { color: #fafafa; }

  /* Active */
  .ql-snow button.ql-active .ql-stroke,
  .ql-snow .ql-picker-label.ql-active .ql-stroke { stroke: #8b5cf6; }
  .ql-snow button.ql-active .ql-fill,
  .ql-snow .ql-picker-label.ql-active .ql-fill { fill: #8b5cf6; }
  .ql-snow .ql-picker-label.ql-active { color: #8b5cf6; }

  /* Content */
  .ql-editor h1 { font-size: 22px; font-weight: 600; margin: 12px 0 8px; color: #fafafa; }
  .ql-editor h2 { font-size: 18px; font-weight: 600; margin: 12px 0 8px; color: #fafafa; }
  .ql-editor h3 { font-size: 16px; font-weight: 500; margin: 10px 0 6px; color: #fafafa; }
  .ql-editor p { margin: 6px 0; color: #fafafa; }
  .ql-editor ul, .ql-editor ol { padding-right: 24px; padding-left: 0; }
  .ql-editor li { margin-bottom: 4px; color: #fafafa; }
  .ql-editor a { color: #8b5cf6; text-decoration: underline; }
  .ql-editor blockquote {
    border-right: 4px solid #3f3f46;
    border-left: none;
    padding-right: 12px;
    margin: 8px 0;
    color: #a1a1aa;
  }
  /* Quill direction classes */
  .ql-editor .ql-direction-rtl {
    direction: rtl;
    text-align: right;
  }
  .ql-editor [dir="ltr"], .ql-editor .ql-direction-ltr {
    direction: ltr;
    text-align: left;
  }

  /* Quill alignment classes — must override direction defaults */
  .ql-editor .ql-align-center { text-align: center !important; }
  .ql-editor .ql-align-right { text-align: right !important; }
  .ql-editor .ql-align-left { text-align: left !important; }
  .ql-editor .ql-align-justify { text-align: justify !important; }

  /* LTR list/blockquote overrides */
  .ql-editor [dir="ltr"] ul, .ql-editor [dir="ltr"] ol {
    padding-left: 24px;
    padding-right: 0;
  }
  .ql-editor [dir="ltr"] blockquote {
    border-left: 4px solid #3f3f46;
    border-right: none;
    padding-left: 12px;
    padding-right: 0;
  }
  .ql-editor pre.ql-syntax {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 6px;
    padding: 12px;
    color: #e4e4e7;
    font-family: monospace;
    direction: ltr;
    text-align: left;
    overflow-x: auto;
  }
  .ql-editor img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
  .ql-editor .ql-video { width: 100%; min-height: 240px; border-radius: 6px; margin: 8px 0; }

  /* Tooltip */
  .ql-snow .ql-tooltip {
    background: #18181b; border-color: #27272a; color: #fafafa;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  }
  .ql-snow .ql-tooltip input[type=text] {
    background: #09090b; border-color: #27272a; color: #fafafa;
  }
  .ql-snow .ql-tooltip a { color: #8b5cf6; }
`;

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
});
