import { HttpClient } from '@substack-api/internal/http-client'

export function createMockHttpClient(): jest.Mocked<HttpClient> {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    close: jest.fn()
  } as unknown as jest.Mocked<HttpClient>
  return mockClient
}
