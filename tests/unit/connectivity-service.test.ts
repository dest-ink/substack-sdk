import { ConnectivityService } from '@substack-api/internal/services/connectivity-service'
import { HttpClient } from '@substack-api/internal/http-client'
import { createMockHttpClient } from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')

describe('ConnectivityService', () => {
  let connectivityService: ConnectivityService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    connectivityService = new ConnectivityService(mockClient)
  })

  describe('isConnected', () => {
    it('should return true when GET /api/v1/subscriptions/page succeeds', async () => {
      mockClient.get.mockResolvedValue({ subscriptions: [] })

      const result = await connectivityService.isConnected()

      expect(result).toBe(true)
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/subscriptions/page')
    })

    it('should return false when request fails', async () => {
      mockClient.get.mockRejectedValue(new Error('Network error'))
      expect(await connectivityService.isConnected()).toBe(false)
    })
  })
})
