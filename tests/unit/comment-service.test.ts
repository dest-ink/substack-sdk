import { CommentService } from '@substack-api/internal/services/comment-service'
import { HttpClient } from '@substack-api/internal/http-client'
import { createMockHttpClient, makeSubstackComment } from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')

describe('CommentService', () => {
  let commentService: CommentService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    commentService = new CommentService(mockClient)
  })

  describe('getCommentsForPost', () => {
    it('should return comments from GET /api/v1/post/{id}/comments', async () => {
      const mockComments = [
        makeSubstackComment(1, 'Test comment 1'),
        makeSubstackComment(2, 'Test comment 2')
      ]
      mockClient.get.mockResolvedValue({ comments: mockComments })

      const result = await commentService.getCommentsForPost(123)

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/post/123/comments',
        { all_comments: true, sort: 'best_first' },
        'publication'
      )
      expect(result).toEqual(mockComments)
    })

    it('should use custom subdomain when provided', async () => {
      mockClient.get.mockResolvedValue({ comments: [] })

      await commentService.getCommentsForPost(123, 'otherpub')

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/post/123/comments',
        { all_comments: true, sort: 'best_first' },
        { subdomain: 'otherpub' }
      )
    })

    it('should return empty array when no comments', async () => {
      mockClient.get.mockResolvedValue({ comments: [] })
      expect(await commentService.getCommentsForPost(123)).toEqual([])
    })

    it('should throw when request fails', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'))
      await expect(commentService.getCommentsForPost(123)).rejects.toThrow('Network error')
    })
  })
})
