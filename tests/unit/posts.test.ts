import { FullPost, PreviewPost } from '@substack-api/domain/post'
import { Comment } from '@substack-api/domain/comment'
import { HttpClient } from '@substack-api/internal/http-client'
import { CommentService } from '@substack-api/internal/services/comment-service'
import { PostService } from '@substack-api/internal/services/post-service'
import {
  createMockHttpClient,
  makeSubstackFeedItemPost,
  makeSubstackFullPost,
  makeSubstackComment,
  makeSubstackFeedItem
} from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')

// ---------------------------------------------------------------------------
// PreviewPost entity
// ---------------------------------------------------------------------------

describe('PreviewPost Entity', () => {
  let mockCommentService: jest.Mocked<CommentService>
  let mockPostService: jest.Mocked<PostService>
  let post: PreviewPost

  beforeEach(() => {
    mockCommentService = { getCommentsForPost: jest.fn() } as unknown as jest.Mocked<CommentService>
    mockPostService = {
      getPostBySlug: jest.fn(),
      getPostsForProfile: jest.fn()
    } as unknown as jest.Mocked<PostService>

    post = new PreviewPost(
      makeSubstackFeedItemPost(456, 'Test Post'),
      mockCommentService,
      mockPostService,
      'testpub'
    )
  })

  describe('properties', () => {
    it('should expose id, title, slug, and publishedAt', () => {
      expect(post.id).toBe(456)
      expect(post.title).toBe('Test Post')
      expect(post.slug).toBe('post-456')
      expect(post.publishedAt).toBeInstanceOf(Date)
    })
  })

  describe('comments()', () => {
    it('should iterate through post comments as Comment instances', async () => {
      const mockComments = [
        makeSubstackComment(1, 'Comment 1'),
        makeSubstackComment(2, 'Comment 2')
      ]
      mockCommentService.getCommentsForPost.mockResolvedValue(mockComments)

      const comments = []
      for await (const comment of post.comments()) {
        comments.push(comment)
      }

      expect(comments).toHaveLength(2)
      expect(comments[0]).toBeInstanceOf(Comment)
      expect(comments[0].body).toBe('Comment 1')
      expect(comments[1].body).toBe('Comment 2')
      expect(mockCommentService.getCommentsForPost).toHaveBeenCalledWith(456, 'testpub')
    })

    it('should respect limit parameter', async () => {
      mockCommentService.getCommentsForPost.mockResolvedValue([
        makeSubstackComment(1, 'Comment 1'),
        makeSubstackComment(2, 'Comment 2')
      ])

      const comments = []
      for await (const comment of post.comments({ limit: 1 })) {
        comments.push(comment)
      }

      expect(comments).toHaveLength(1)
    })

    it('should handle empty comments', async () => {
      mockCommentService.getCommentsForPost.mockResolvedValue([])

      const comments = []
      for await (const comment of post.comments()) {
        comments.push(comment)
      }

      expect(comments).toHaveLength(0)
    })

    it('should throw when API fails', async () => {
      mockCommentService.getCommentsForPost.mockRejectedValue(new Error('API error'))

      await expect(async () => {
        for await (const _ of post.comments()) {
          // consume
        }
      }).rejects.toThrow()
    })
  })

  describe('fullPost()', () => {
    it('should fetch full post by slug and return FullPost instance', async () => {
      const mockFullPost = makeSubstackFullPost(456, 'Test Post')
      mockPostService.getPostBySlug.mockResolvedValue(mockFullPost)

      const fullPost = await post.fullPost()

      expect(fullPost).toBeInstanceOf(FullPost)
      expect(fullPost.id).toBe(456)
      expect(mockPostService.getPostBySlug).toHaveBeenCalledWith('post-456', 'testpub')
    })

    it('should throw when PostService fails', async () => {
      mockPostService.getPostBySlug.mockRejectedValue(new Error('API error'))
      await expect(post.fullPost()).rejects.toThrow()
    })
  })

  describe('like() and addComment()', () => {
    it('should throw not-implemented error for like()', async () => {
      await expect(post.like()).rejects.toThrow('Post liking not implemented yet')
    })

    it('should throw not-implemented error for addComment()', async () => {
      await expect(post.addComment({ body: 'Test' })).rejects.toThrow(
        'Comment creation not implemented yet'
      )
    })
  })
})

// ---------------------------------------------------------------------------
// FullPost entity
// ---------------------------------------------------------------------------

describe('FullPost Entity', () => {
  let mockCommentService: jest.Mocked<CommentService>
  let fullPost: FullPost

  beforeEach(() => {
    mockCommentService = { getCommentsForPost: jest.fn() } as unknown as jest.Mocked<CommentService>
    fullPost = new FullPost(makeSubstackFullPost(789, 'Full Test Post'), mockCommentService)
  })

  describe('properties', () => {
    it('should expose id, title, htmlBody, subtitle, and publishedAt', () => {
      expect(fullPost.id).toBe(789)
      expect(fullPost.title).toBe('Full Test Post')
      expect(fullPost.htmlBody).toBe('<p>Full HTML content with <strong>formatting</strong></p>')
      expect(fullPost.subtitle).toBe('Test subtitle')
      expect(fullPost.publishedAt).toBeInstanceOf(Date)
    })

    it('should have like, addComment, and comments methods', () => {
      expect(typeof fullPost.like).toBe('function')
      expect(typeof fullPost.addComment).toBe('function')
      expect(typeof fullPost.comments).toBe('function')
    })
  })
})

// ---------------------------------------------------------------------------
// PostService
// ---------------------------------------------------------------------------

describe('PostService', () => {
  let postService: PostService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    postService = new PostService(mockClient)
  })

  describe('getPostBySlug', () => {
    it('should return post from GET /api/v1/posts/{slug} on publication', async () => {
      const mockPost = makeSubstackFullPost(123, 'Test Post')
      mockClient.get.mockResolvedValueOnce(mockPost)

      expect(await postService.getPostBySlug('test-post')).toEqual(mockPost)
      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/posts/test-post',
        undefined,
        'publication'
      )
    })

    it('should use custom subdomain when provided', async () => {
      const mockPost = makeSubstackFullPost(123, 'Test Post')
      mockClient.get.mockResolvedValueOnce(mockPost)

      await postService.getPostBySlug('test-post', 'otherpub')

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/posts/test-post', undefined, {
        subdomain: 'otherpub'
      })
    })

    it('should throw when request fails', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 404'))
      await expect(postService.getPostBySlug('bad-slug')).rejects.toThrow('HTTP 404')
    })
  })

  describe('getPostsForProfile', () => {
    it('should return posts from reader/feed/profile endpoint', async () => {
      const feedItems = [makeSubstackFeedItem(1, 'Post 1'), makeSubstackFeedItem(2, 'Post 2')]
      mockClient.get.mockResolvedValueOnce({ items: feedItems, nextCursor: 'abc' })

      const result = await postService.getPostsForProfile(123)

      expect(result.posts).toHaveLength(2)
      expect(result.nextCursor).toBe('abc')
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/reader/feed/profile/123', {})
    })

    it('should pass cursor when provided', async () => {
      mockClient.get.mockResolvedValueOnce({ items: [], nextCursor: null })

      await postService.getPostsForProfile(123, { cursor: 'test-cursor' })

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/reader/feed/profile/123', {
        cursor: 'test-cursor'
      })
    })

    it('should filter out non-post items', async () => {
      mockClient.get.mockResolvedValueOnce({
        items: [
          makeSubstackFeedItem(1, 'Post 1'),
          {
            entity_key: 'c-99',
            type: 'comment',
            comment: { id: 99, body: 'note', user_id: 1, date: '2023-01-01T00:00:00Z' },
            post: null,
            publication: null
          }
        ],
        nextCursor: null
      })

      const result = await postService.getPostsForProfile(123)
      expect(result.posts).toHaveLength(1)
    })

    it('should return empty when no posts', async () => {
      mockClient.get.mockResolvedValueOnce({ items: [], nextCursor: null })
      const result = await postService.getPostsForProfile(123)
      expect(result.posts).toEqual([])
    })

    it('should throw when request fails', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('HTTP 500'))
      await expect(postService.getPostsForProfile(123)).rejects.toThrow('HTTP 500')
    })
  })
})
