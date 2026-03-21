import { SubstackClient } from '@substack-api/substack-client'

describe('note publishing integration tests', () => {
  let client: SubstackClient

  beforeEach(() => {
    jest.clearAllMocks()

    client = new SubstackClient({
      substackSid: 'test-sid',
      substackLli: 'test-lli',
      publicationUrl: 'https://test.substack.com',
      handle: 'jakubslys'
    })
  })

  afterEach(async () => {
    await client.close()
  })

  describe('publishNote', () => {
    test('should POST bodyJson content to /api/v1/comment/feed', async () => {
      const profile = await client.ownProfile()
      const result = await profile.publishNote('Hello world')

      expect(result.id).toBe(12345)

      // Verify the CycleTLS call was made correctly
      const postCalls = global.MOCK_CYCLETLS.mock.calls.filter(
        (call: unknown[]) => call[2] === 'post'
      )
      expect(postCalls.length).toBeGreaterThan(0)

      const lastPostCall = postCalls[postCalls.length - 1]
      expect(lastPostCall[0]).toContain('/api/v1/comment/feed')

      const body = JSON.parse(lastPostCall[1].body)
      expect(body.bodyJson).toBeDefined()
      expect(body.bodyJson.type).toBe('doc')
      expect(body.bodyJson.attrs.schemaVersion).toBe('v1')
      expect(body.replyMinimumRole).toBe('everyone')
    })

    test('should return note ID from response', async () => {
      const profile = await client.ownProfile()
      const result = await profile.publishNote('Test note')
      expect(result.id).toBeGreaterThan(0)
    })
  })
})
