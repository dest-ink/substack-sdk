import { FollowingService } from '@substack-api/internal/services/following-service'
import { HttpClient } from '@substack-api/internal/http-client'
import { createMockHttpClient } from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')

describe('FollowingService', () => {
  let followingService: FollowingService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    followingService = new FollowingService(mockClient)
  })

  describe('getFollowing', () => {
    it('should return following users from GET /api/v1/subscriptions/page', async () => {
      mockClient.get.mockResolvedValue({
        subscriptions: [
          {
            id: 1,
            publication_id: 10,
            publication: {
              id: 10,
              subdomain: 'pub1',
              name: 'Pub One',
              author: { id: 100, handle: 'user1' }
            }
          },
          {
            id: 2,
            publication_id: 20,
            publication: {
              id: 20,
              subdomain: 'pub2',
              name: 'Pub Two',
              author: { id: 200, handle: 'user2' }
            }
          }
        ]
      })

      const result = await followingService.getFollowing()

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/subscriptions/page')
      expect(result).toEqual([
        { id: 100, handle: 'user1' },
        { id: 200, handle: 'user2' }
      ])
    })

    it('should skip subscriptions without author info', async () => {
      mockClient.get.mockResolvedValue({
        subscriptions: [
          { id: 1, publication_id: 10, publication: { id: 10, subdomain: 'pub1', name: 'Pub' } },
          {
            id: 2,
            publication_id: 20,
            publication: {
              id: 20,
              subdomain: 'pub2',
              name: 'Pub Two',
              author: { id: 200, handle: 'user2' }
            }
          }
        ]
      })

      const result = await followingService.getFollowing()
      expect(result).toEqual([{ id: 200, handle: 'user2' }])
    })

    it('should return empty array when no subscriptions', async () => {
      mockClient.get.mockResolvedValue({ subscriptions: [] })
      expect(await followingService.getFollowing()).toEqual([])
    })

    it('should throw when request fails', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'))
      await expect(followingService.getFollowing()).rejects.toThrow('Network error')
    })
  })
})
