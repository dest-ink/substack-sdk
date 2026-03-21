import { Note } from '@substack-api/domain/note'
import { HttpClient } from '@substack-api/internal/http-client'
import { NoteService } from '@substack-api/internal/services/note-service'
import { NewNoteService } from '@substack-api/internal/services/new-note-service'
import {
  markdownToProsemirror,
  parseInlineMarks
} from '@substack-api/internal/markdown-to-prosemirror'
import { createMockHttpClient, makeSubstackFeedComment } from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')

// ---------------------------------------------------------------------------
// Note entity
// ---------------------------------------------------------------------------

describe('Note Entity', () => {
  describe('properties', () => {
    it('should expose id, body, and likesCount', () => {
      const note = new Note(makeSubstackFeedComment(789, 'Test note content', 15))
      expect(note.id).toBe(789)
      expect(note.body).toBe('Test note content')
      expect(note.likesCount).toBe(15)
    })

    it('should expose author fields', () => {
      const note = new Note(makeSubstackFeedComment(1, 'body'))
      expect(note.author.id).toBe(123)
      expect(note.author.name).toBe('Test User')
      expect(note.author.handle).toBe('testuser')
      expect(note.author.avatarUrl).toBe('https://example.com/photo.jpg')
    })

    it('should expose publishedAt as Date', () => {
      const note = new Note(makeSubstackFeedComment(1, 'body'))
      expect(note.publishedAt).toBeInstanceOf(Date)
      expect(note.publishedAt.toISOString()).toContain('2023-01-01')
    })

    it('should handle zero likesCount', () => {
      expect(new Note(makeSubstackFeedComment(1, 'body', 0)).likesCount).toBe(0)
    })
  })
})

// ---------------------------------------------------------------------------
// NoteService
// ---------------------------------------------------------------------------

describe('NoteService', () => {
  let noteService: NoteService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    noteService = new NoteService(mockClient)
  })

  describe('getNotesForProfile', () => {
    it('should return notes from feed/profile endpoint with comment filter', async () => {
      const feedComment = makeSubstackFeedComment(10, 'Profile note')
      mockClient.get.mockResolvedValueOnce({
        items: [
          {
            entity_key: 'c-10',
            type: 'comment',
            comment: feedComment,
            post: null,
            publication: null
          }
        ],
        nextCursor: 'cursor-xyz'
      })

      const result = await noteService.getNotesForProfile(123)

      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].body).toBe('Profile note')
      expect(result.nextCursor).toBe('cursor-xyz')
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/reader/feed/profile/123', {
        filter: 'comment'
      })
    })

    it('should pass cursor in params when provided', async () => {
      mockClient.get.mockResolvedValueOnce({
        items: [],
        nextCursor: undefined
      })

      await noteService.getNotesForProfile(123, { cursor: 'test-cursor' })

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/reader/feed/profile/123', {
        filter: 'comment',
        cursor: 'test-cursor'
      })
    })

    it('should filter out non-comment items', async () => {
      mockClient.get.mockResolvedValueOnce({
        items: [
          {
            entity_key: 'p-1',
            type: 'post',
            post: { id: 1, title: 'Post', slug: 'post', post_date: '2023-01-01T00:00:00Z' },
            comment: null,
            publication: null
          },
          {
            entity_key: 'c-2',
            type: 'comment',
            comment: makeSubstackFeedComment(2, 'A note'),
            post: null,
            publication: null
          }
        ],
        nextCursor: null
      })

      const result = await noteService.getNotesForProfile(123)
      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].body).toBe('A note')
    })
  })
})

// ---------------------------------------------------------------------------
// NewNoteService
// ---------------------------------------------------------------------------

describe('NewNoteService', () => {
  let service: NewNoteService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    service = new NewNoteService(mockClient)
  })

  describe('publishNote', () => {
    it('should POST /api/v1/comment/feed with bodyJson and return the note id', async () => {
      mockClient.post.mockResolvedValueOnce({ id: 42 })

      const result = await service.publishNote('Hello world')

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/comment/feed', {
        bodyJson: markdownToProsemirror('Hello world'),
        replyMinimumRole: 'everyone'
      })
      expect(result).toEqual({ id: 42 })
    })

    it('should include attachmentIds when provided', async () => {
      mockClient.post.mockResolvedValueOnce({ id: 99 })

      await service.publishNote('Check this out', ['uuid-123'])

      const body = mockClient.post.mock.calls[0][1] as Record<string, unknown>
      expect(body.attachmentIds).toEqual(['uuid-123'])
    })

    it('should not include attachmentIds when not provided', async () => {
      mockClient.post.mockResolvedValueOnce({ id: 1 })

      await service.publishNote('No attachment here')

      const body = mockClient.post.mock.calls[0][1] as Record<string, unknown>
      expect('attachmentIds' in body).toBe(false)
    })

    it('should throw when response is missing id', async () => {
      mockClient.post.mockResolvedValueOnce({ other: 'field' })
      await expect(service.publishNote('Bad response')).rejects.toThrow(
        'Invalid SubstackCreateNoteResponse'
      )
    })
  })
})

// ---------------------------------------------------------------------------
// Markdown → Prosemirror
// ---------------------------------------------------------------------------

describe('markdownToProsemirror', () => {
  it('should convert plain text to a single paragraph', () => {
    const doc = markdownToProsemirror('Hello world')
    expect(doc.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }
    ])
  })

  it('should split double newlines into separate paragraphs', () => {
    const doc = markdownToProsemirror('First paragraph\n\nSecond paragraph')
    expect(doc.content).toHaveLength(2)
    expect(doc.content[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'First paragraph' }]
    })
    expect(doc.content[1]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Second paragraph' }]
    })
  })

  it('should parse **bold** marks', () => {
    const doc = markdownToProsemirror('This is **bold** text')
    expect(doc.content[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' text' }
      ]
    })
  })

  it('should parse *italic* marks', () => {
    const doc = markdownToProsemirror('This is *italic* text')
    expect(doc.content[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
        { type: 'text', text: ' text' }
      ]
    })
  })

  it('should parse ~~strikethrough~~ marks', () => {
    const doc = markdownToProsemirror('This is ~~struck~~ text')
    expect(doc.content[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is ' },
        { type: 'text', text: 'struck', marks: [{ type: 'strike' }] },
        { type: 'text', text: ' text' }
      ]
    })
  })

  it('should parse `code` marks', () => {
    const doc = markdownToProsemirror('Use `console.log` here')
    expect(doc.content[0]).toEqual({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Use ' },
        { type: 'text', text: 'console.log', marks: [{ type: 'code' }] },
        { type: 'text', text: ' here' }
      ]
    })
  })

  it('should parse bullet lists', () => {
    const doc = markdownToProsemirror('- item one\n- item two\n- item three')
    expect(doc.content).toEqual([
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item one' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item two' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item three' }] }]
          }
        ]
      }
    ])
  })

  it('should parse ordered lists', () => {
    const doc = markdownToProsemirror('1. first\n2. second')
    expect(doc.content).toEqual([
      {
        type: 'orderedList',
        attrs: { start: 1, type: null },
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }]
          }
        ]
      }
    ])
  })

  it('should parse blockquotes', () => {
    const doc = markdownToProsemirror('> This is a quote')
    expect(doc.content).toEqual([
      {
        type: 'blockquote',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a quote' }] }]
      }
    ])
  })

  it('should handle mixed content: paragraph, list, blockquote', () => {
    const md = 'Intro text\n\n- bullet one\n- bullet two\n\n> A quote\n\nClosing text'
    const doc = markdownToProsemirror(md)
    expect(doc.content).toHaveLength(4)
    expect(doc.content[0].type).toBe('paragraph')
    expect(doc.content[1].type).toBe('bulletList')
    expect(doc.content[2].type).toBe('blockquote')
    expect(doc.content[3].type).toBe('paragraph')
  })

  it('should handle inline marks inside list items', () => {
    const doc = markdownToProsemirror('- **bold** item\n- *italic* item')
    const list = doc.content[0] as {
      type: string
      content: Array<{ content: Array<{ content: unknown[] }> }>
    }
    expect(list.content[0].content[0].content).toEqual([
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' item' }
    ])
  })

  it('should return an empty paragraph for empty input', () => {
    const doc = markdownToProsemirror('')
    expect(doc.content).toEqual([{ type: 'paragraph' }])
  })
})

describe('parseInlineMarks', () => {
  it('should return plain text when no marks present', () => {
    expect(parseInlineMarks('plain text')).toEqual([{ type: 'text', text: 'plain text' }])
  })

  it('should handle multiple marks in one line', () => {
    const nodes = parseInlineMarks('**bold** and *italic*')
    expect(nodes).toEqual([
      { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' and ' },
      { type: 'text', text: 'italic', marks: [{ type: 'italic' }] }
    ])
  })
})
