import { HttpClient } from '@substack-api/internal/http-client'
import initCycleTLS from 'cycletls'

jest.mock('cycletls')

const mockCycleTLSFn = jest.fn()
const mockExit = jest.fn()

;(initCycleTLS as jest.Mock).mockResolvedValue(Object.assign(mockCycleTLSFn, { exit: mockExit }))

describe('HttpClient', () => {
  let client: HttpClient

  beforeEach(() => {
    jest.clearAllMocks()
    client = new HttpClient({
      substackSid: 'test-sid',
      substackLli: 'test-lli',
      publicationUrl: 'https://testpub.substack.com'
    })
  })

  afterEach(async () => {
    await client.close()
  })

  describe('get', () => {
    it('should make successful GET request with cookie auth', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 200, data: { result: 'ok' } })

      const result = await client.get('/api/v1/test')

      expect(mockCycleTLSFn).toHaveBeenCalledWith(
        'https://substack.com/api/v1/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'substack.sid=test-sid; substack.lli=test-lli'
          })
        }),
        'get'
      )
      expect(result).toEqual({ result: 'ok' })
    })

    it('should append query params when provided', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 200, data: {} })

      await client.get('/api/v1/test', { limit: 10, offset: 0 })

      const calledUrl = mockCycleTLSFn.mock.calls[0][0]
      expect(calledUrl).toContain('limit=10')
      expect(calledUrl).toContain('offset=0')
    })

    it('should use publication base URL when scope is publication', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 200, data: {} })

      await client.get('/api/v1/posts/test-slug', undefined, 'publication')

      expect(mockCycleTLSFn.mock.calls[0][0]).toBe(
        'https://testpub.substack.com/api/v1/posts/test-slug'
      )
    })

    it('should use custom subdomain when scope is an object', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 200, data: {} })

      await client.get('/api/v1/post/123/comments', undefined, { subdomain: 'otherpub' })

      expect(mockCycleTLSFn.mock.calls[0][0]).toBe(
        'https://otherpub.substack.com/api/v1/post/123/comments'
      )
    })

    it('should throw on 401 auth error', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 401, data: 'Unauthorized' })
      await expect(client.get('/api/v1/test')).rejects.toThrow('Authentication failed')
    })

    it('should throw on non-2xx response', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 404, data: 'Not Found' })
      await expect(client.get('/api/v1/test')).rejects.toThrow('HTTP 404')
    })

    it('should parse JSON string responses', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({
        status: 200,
        data: '{"name":"test"}'
      })

      const result = await client.get('/api/v1/test')
      expect(result).toEqual({ name: 'test' })
    })
  })

  describe('post', () => {
    it('should make successful POST request with body', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 200, data: { id: 42 } })

      const result = await client.post('/api/v1/comment/feed', { content: 'hello' })

      expect(mockCycleTLSFn).toHaveBeenCalledWith(
        'https://substack.com/api/v1/comment/feed',
        expect.objectContaining({
          body: JSON.stringify({ content: 'hello' })
        }),
        'post'
      )
      expect(result).toEqual({ id: 42 })
    })

    it('should throw on non-2xx response', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 500, data: 'Server Error' })
      await expect(client.post('/api/v1/test', {})).rejects.toThrow('HTTP 500')
    })
  })

  describe('close', () => {
    it('should exit CycleTLS client', async () => {
      mockCycleTLSFn.mockResolvedValueOnce({ status: 200, data: {} })
      await client.get('/api/v1/test') // init the client
      await client.close()

      expect(mockExit).toHaveBeenCalled()
    })

    it('should be safe to call close multiple times', async () => {
      await client.close()
      await client.close()
      // no error
    })
  })
})
