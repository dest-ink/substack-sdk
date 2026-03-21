/**
 * Converts a subset of markdown to Substack's Prosemirror JSON format.
 *
 * Supported:
 *  - Paragraphs (double newline separated)
 *  - Inline marks: **bold**, *italic*, ~~strikethrough~~, `code`
 *  - Bullet lists (lines starting with - or *)
 *  - Ordered lists (lines starting with 1. 2. etc.)
 *  - Blockquotes (lines starting with >)
 *
 * Unsupported markdown passes through as plain text.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PmMark {
  type: 'bold' | 'italic' | 'strike' | 'code'
}

export interface PmTextNode {
  type: 'text'
  text: string
  marks?: PmMark[]
}

export interface PmParagraphNode {
  type: 'paragraph'
  content?: PmTextNode[]
}

export interface PmListItemNode {
  type: 'listItem'
  content: PmParagraphNode[]
}

export interface PmBulletListNode {
  type: 'bulletList'
  content: PmListItemNode[]
}

export interface PmOrderedListNode {
  type: 'orderedList'
  attrs: { start: number; type: null }
  content: PmListItemNode[]
}

export interface PmBlockquoteNode {
  type: 'blockquote'
  content: PmParagraphNode[]
}

export type PmNode = PmParagraphNode | PmBulletListNode | PmOrderedListNode | PmBlockquoteNode

export interface PmDoc {
  type: 'doc'
  attrs: { schemaVersion: 'v1' }
  content: PmNode[]
}

// ─── Inline mark parsing ────────────────────────────────────────────────────

/**
 * Parses inline markdown marks within a single line of text.
 * Handles: **bold**, *italic*, ~~strikethrough~~, `code`
 * Returns an array of text nodes with appropriate marks.
 */
export function parseInlineMarks(text: string): PmTextNode[] {
  if (!text) return []

  const nodes: PmTextNode[] = []

  // Regex matches inline patterns in priority order:
  // 1. **bold**  2. *italic*  3. ~~strikethrough~~  4. `code`
  const inlinePattern = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlinePattern.exec(text)) !== null) {
    // Add any plain text before this match
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    if (match[2] != null) {
      // **bold**
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    } else if (match[3] != null) {
      // *italic*
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    } else if (match[4] != null) {
      // ~~strikethrough~~
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'strike' }] })
    } else if (match[5] != null) {
      // `code`
      nodes.push({ type: 'text', text: match[5], marks: [{ type: 'code' }] })
    }

    lastIndex = match.index + match[0].length
  }

  // Add any remaining plain text
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}

// ─── Block parsing ──────────────────────────────────────────────────────────

function makeParagraph(text: string): PmParagraphNode {
  const content = parseInlineMarks(text)
  return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' }
}

/**
 * Converts a markdown string to a Prosemirror document.
 */
export function markdownToProsemirror(markdown: string): PmDoc {
  const content: PmNode[] = []

  const lines = markdown.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (!line.trim()) {
      i++
      continue
    }

    // Bullet list: collect consecutive lines starting with - or *
    if (/^\s*[-*]\s+/.test(line)) {
      const items: PmListItemNode[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, '')
        items.push({ type: 'listItem', content: [makeParagraph(itemText)] })
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    // Ordered list: collect consecutive lines starting with digits.
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: PmListItemNode[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+[.)]\s+/, '')
        items.push({ type: 'listItem', content: [makeParagraph(itemText)] })
        i++
      }
      content.push({ type: 'orderedList', attrs: { start: 1, type: null }, content: items })
      continue
    }

    // Blockquote: collect consecutive lines starting with >
    if (/^\s*>\s*/.test(line)) {
      const quoteParagraphs: PmParagraphNode[] = []
      while (i < lines.length && /^\s*>\s*/.test(lines[i])) {
        const quoteText = lines[i].replace(/^\s*>\s*/, '')
        if (quoteText.trim()) {
          quoteParagraphs.push(makeParagraph(quoteText))
        }
        i++
      }
      if (quoteParagraphs.length > 0) {
        content.push({ type: 'blockquote', content: quoteParagraphs })
      }
      continue
    }

    // Regular paragraph: collect consecutive non-empty, non-special lines
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*>\s*/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      content.push(makeParagraph(paraLines.join(' ')))
    }
  }

  // Ensure we always have at least one node
  if (content.length === 0) {
    content.push({ type: 'paragraph' })
  }

  return {
    type: 'doc',
    attrs: { schemaVersion: 'v1' },
    content
  }
}
