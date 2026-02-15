import React from 'react';
import { View, Text, StyleSheet, Platform, Linking, type TextStyle } from 'react-native';
import { colors, fonts, accent } from '../../lib/theme';

interface HtmlRendererProps {
  html: string;
}

// Check if string contains HTML tags
function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

// Extract Quill alignment from class attribute
function getQuillAlign(attrs?: Record<string, string>): TextStyle['textAlign'] | undefined {
  const cls = attrs?.class || '';
  if (cls.includes('ql-align-center')) return 'center';
  if (cls.includes('ql-align-right')) return 'right';
  if (cls.includes('ql-align-left')) return 'left';
  if (cls.includes('ql-align-justify')) return 'justify';
  return undefined;
}

// Extract Quill direction from class attribute
function getQuillDirection(attrs?: Record<string, string>): 'rtl' | 'ltr' | undefined {
  const cls = attrs?.class || '';
  if (cls.includes('ql-direction-rtl')) return 'rtl';
  if (cls.includes('ql-direction-ltr')) return 'ltr';
  return undefined;
}

// Simple HTML tokenizer for trusted content
interface Token {
  type: 'text' | 'open' | 'close' | 'selfclose';
  tag?: string;
  content?: string;
  attrs?: Record<string, string>;
}

function parseAttrs(tagStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-z-]+)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(tagStr)) !== null) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<\/?([a-z][a-z0-9]*)\b([^>]*)\/?>/gi;
  let lastIndex = 0;
  let match;

  while ((match = re.exec(html)) !== null) {
    // Text before this tag
    if (match.index > lastIndex) {
      const text = html.slice(lastIndex, match.index);
      if (text) tokens.push({ type: 'text', content: decodeEntities(text) });
    }

    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    const attrStr = match[2] || '';

    if (fullTag.startsWith('</')) {
      tokens.push({ type: 'close', tag: tagName });
    } else if (fullTag.endsWith('/>') || tagName === 'br' || tagName === 'hr') {
      tokens.push({ type: 'selfclose', tag: tagName, attrs: parseAttrs(attrStr) });
    } else {
      tokens.push({ type: 'open', tag: tagName, attrs: parseAttrs(attrStr) });
    }

    lastIndex = re.lastIndex;
  }

  // Remaining text
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    if (text) tokens.push({ type: 'text', content: decodeEntities(text) });
  }

  return tokens;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Recursive node tree builder
interface HtmlNode {
  tag: string;
  attrs?: Record<string, string>;
  children: (HtmlNode | string)[];
}

function buildTree(tokens: Token[]): (HtmlNode | string)[] {
  const root: (HtmlNode | string)[] = [];
  const stack: HtmlNode[] = [];

  const current = () => (stack.length > 0 ? stack[stack.length - 1].children : root);

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.content) current().push(token.content);
        break;
      case 'open': {
        const node: HtmlNode = { tag: token.tag!, attrs: token.attrs, children: [] };
        current().push(node);
        stack.push(node);
        break;
      }
      case 'close':
        if (stack.length > 0 && stack[stack.length - 1].tag === token.tag) {
          stack.pop();
        }
        break;
      case 'selfclose':
        current().push({ tag: token.tag!, attrs: token.attrs, children: [] });
        break;
    }
  }

  return root;
}

// Render tree to React Native components
let keyCounter = 0;

function renderNode(node: HtmlNode | string, depth: number = 0): React.ReactNode {
  const key = `html-${keyCounter++}`;

  if (typeof node === 'string') {
    return node;
  }

  const children = node.children.map((child) => renderNode(child, depth + 1));
  const align = getQuillAlign(node.attrs);
  const quillDir = getQuillDirection(node.attrs);
  // Auto-detect direction for block elements when Quill didn't set one
  const isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'li'].includes(node.tag);
  const dir = quillDir ?? (isBlock ? detectTextDirection(getTextContent(node)) : undefined);
  const overrideStyle: TextStyle | undefined = (align || dir) ? {
    ...(dir ? { writingDirection: dir, textAlign: align || (dir === 'rtl' ? 'right' : 'left') } : {}),
    ...(!dir && align ? { textAlign: align } : {}),
  } : undefined;

  switch (node.tag) {
    case 'h1':
      return <Text key={key} style={[styles.h1, overrideStyle]}>{children}</Text>;
    case 'h2':
      return <Text key={key} style={[styles.h2, overrideStyle]}>{children}</Text>;
    case 'h3':
      return <Text key={key} style={[styles.h3, overrideStyle]}>{children}</Text>;
    case 'p':
    case 'div':
      return <Text key={key} style={[styles.p, overrideStyle]}>{children}</Text>;
    case 'strong':
    case 'b':
      return <Text key={key} style={styles.bold}>{children}</Text>;
    case 'em':
    case 'i':
      return <Text key={key} style={styles.italic}>{children}</Text>;
    case 'a': {
      const rawHref = node.attrs?.href;
      const href = rawHref && !/^https?:\/\//i.test(rawHref) ? `https://${rawHref}` : rawHref;
      return (
        <Text
          key={key}
          style={styles.link}
          onPress={href ? () => Linking.openURL(href) : undefined}
        >
          {children}
        </Text>
      );
    }
    case 'ul':
      return <View key={key} style={styles.list}>{children}</View>;
    case 'ol':
      return (
        <View key={key} style={styles.list}>
          {node.children.map((child, i) => {
            if (typeof child === 'string') return null;
            const innerKey = `ol-${keyCounter++}`;
            const liChildren = child.children.map((c) => renderNode(c, depth + 1));
            return (
              <View key={innerKey} style={styles.listItem}>
                <Text style={styles.bullet}>{`${i + 1}.`}</Text>
                <Text style={styles.listItemText}>{liChildren}</Text>
              </View>
            );
          })}
        </View>
      );
    case 'li':
      return (
        <View key={key} style={styles.listItem}>
          <Text style={styles.bullet}>{'\u2022'}</Text>
          <Text style={styles.listItemText}>{children}</Text>
        </View>
      );
    case 'br':
      return <Text key={key}>{'\n'}</Text>;
    case 'span':
      return <Text key={key}>{children}</Text>;
    default:
      return <Text key={key}>{children}</Text>;
  }
}

const webFontFamily = fonts.family ? `${fonts.family}, sans-serif` : '-apple-system, BlinkMacSystemFont, sans-serif';

// Auto-detect text direction based on first strong directional character
function detectTextDirection(text: string): 'rtl' | 'ltr' {
  const rtlRe = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const ltrRe = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
  for (const ch of text) {
    if (rtlRe.test(ch)) return 'rtl';
    if (ltrRe.test(ch)) return 'ltr';
  }
  return 'rtl';
}

// Extract plain text from an HtmlNode tree
function getTextContent(node: HtmlNode | string): string {
  if (typeof node === 'string') return node;
  return node.children.map(getTextContent).join('');
}

export default function HtmlRenderer({ html }: HtmlRendererProps) {
  // Reset key counter each render
  keyCounter = 0;

  // Strip inline styles but keep classes (for Quill alignment parsing)
  const cleanHtml = html.replace(/\s+style="[^"]*"/gi, '');

  // If no HTML tags, render as plain text (backward compatible)
  if (!isHtml(cleanHtml)) {
    return <Text style={styles.plainText}>{cleanHtml}</Text>;
  }

  // Web: use dangerouslySetInnerHTML for perfect rendering
  if (Platform.OS === 'web') {
    // Fix links without protocol and ensure they open externally
    const fixedHtml = cleanHtml.replace(
      /href="([^"]*?)"/g,
      (_, url) => {
        const fixed = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        return `href="${fixed}" target="_blank" rel="noopener noreferrer"`;
      }
    );

    return (
      <>
        <div
          className="html-content"
          dangerouslySetInnerHTML={{ __html: fixedHtml }}
          style={{
            color: '#fafafa',
            fontFamily: webFontFamily,
            fontSize: 15,
            lineHeight: '28px',
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: `
          .html-content a { color: #8b5cf6; text-decoration: underline; }
          .html-content a:hover { color: #a78bfa; }
          .html-content h1 { font-size: 22px; font-weight: 600; margin: 12px 0 8px; }
          .html-content h2 { font-size: 18px; font-weight: 600; margin: 12px 0 8px; }
          .html-content h3 { font-size: 16px; font-weight: 500; margin: 10px 0 6px; }
          .html-content p { margin: 6px 0; }
          .html-content li { margin-bottom: 6px; }
          .html-content ul, .html-content ol { margin: 8px 0; }
          /* Auto-detect direction for paragraphs without explicit Quill direction class */
          .html-content p:not(.ql-direction-rtl):not(.ql-direction-ltr),
          .html-content h1:not(.ql-direction-rtl):not(.ql-direction-ltr),
          .html-content h2:not(.ql-direction-rtl):not(.ql-direction-ltr),
          .html-content h3:not(.ql-direction-rtl):not(.ql-direction-ltr),
          .html-content li:not(.ql-direction-rtl):not(.ql-direction-ltr) {
            unicode-bidi: plaintext;
          }
          /* Explicit direction from Quill */
          .html-content .ql-direction-rtl { direction: rtl; text-align: right; }
          .html-content .ql-direction-rtl ul, .html-content .ql-direction-rtl ol { padding-right: 24px; padding-left: 0; }
          .html-content .ql-direction-ltr { direction: ltr; text-align: left; }
          .html-content .ql-direction-ltr ul, .html-content .ql-direction-ltr ol { padding-left: 24px; padding-right: 0; }
          .html-content .ql-align-center { text-align: center; }
          .html-content .ql-align-right { text-align: right; }
          .html-content .ql-align-left { text-align: left; }
          .html-content .ql-align-justify { text-align: justify; }
        `}} />
      </>
    );
  }

  // Mobile: parse and render as RN components
  const tokens = tokenize(cleanHtml);
  const tree = buildTree(tokens);
  const rendered = tree.map((node) => renderNode(node));

  return <View style={styles.container}>{rendered}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  plainText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 28,
    fontFamily: fonts.family,
  },
  h1: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.family,
    marginBottom: 8,
    marginTop: 4,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    fontFamily: fonts.family,
    marginBottom: 6,
    marginTop: 4,
  },
  h3: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    fontFamily: fonts.family,
    marginBottom: 4,
    marginTop: 4,
  },
  p: {
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.family,
    lineHeight: 28,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  link: {
    color: accent.primary,
    textDecorationLine: 'underline',
  },
  list: {
    marginBottom: 8,
    gap: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    color: colors.textMuted,
    fontFamily: fonts.family,
    lineHeight: 28,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.family,
    lineHeight: 28,
  },
});
