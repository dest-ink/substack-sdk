import initCycleTLS from 'cycletls'

// Mock CycleTLS at the module level for integration tests
// CycleTLS requires real TLS connections, so we mock it for integration tests
// that test the full client flow without hitting real Substack servers

const SAMPLE_PROFILE = {
  id: 27968736,
  handle: 'jakubslys',
  name: 'Jakub Slys',
  photo_url: 'https://example.com/jakubslys.jpg',
  bio: 'Ever wonder how Uber matches rides to drivers in real time?'
}

const SAMPLE_FEED_COMMENT = {
  id: 789,
  body: 'Test note body',
  user_id: 27968736,
  date: '2025-01-01T00:00:00Z',
  name: 'Jakub Slys',
  handle: 'jakubslys',
  photo_url: 'https://example.com/jakubslys.jpg',
  reaction_count: 5,
  type: 'feed'
}

const SAMPLE_FULL_POST = {
  id: 167180194,
  title: 'Week of June 24, 2025: Build SaaS Without Code',
  subtitle: 'The New Blueprint for Solopreneurs',
  slug: 'week-of-june-24-2025-build-saas-without',
  canonical_url: 'https://iam.slys.dev/p/week-of-june-24-2025-build-saas-without',
  post_date: '2025-06-24T00:00:00Z',
  body_html:
    '<div class="captioned-image-container">content shatters the myth about no-code limits</div>',
  reactions: { '❤': 4 },
  restacks: 1,
  cover_image: 'https://substack-post-media.s3.amazonaws.com/public/images/cover.jpg'
}

const SAMPLE_COMMENT = {
  id: 999,
  body: 'Great post!',
  date: '2025-01-01T00:00:00Z',
  name: 'Reader',
  handle: 'reader1',
  photo_url: 'https://example.com/reader.jpg',
  reaction_count: 0
}

// Route handler mapping URLs to responses
function routeRequest(url: string, method: string): { status: number; data: unknown } {
  if (method === 'get') {
    // Profile by handle
    if (url.includes('/api/v1/user/jakubslys/public_profile')) {
      return { status: 200, data: SAMPLE_PROFILE }
    }

    // Posts by slug
    if (url.includes('/api/v1/posts/week-of-june-24-2025-build-saas-without')) {
      return { status: 200, data: SAMPLE_FULL_POST }
    }

    // Comments for post
    if (url.includes('/api/v1/post/167180194/comments')) {
      return { status: 200, data: { comments: [SAMPLE_COMMENT] } }
    }

    // Profile feed (posts)
    if (url.includes('/api/v1/reader/feed/profile/27968736') && !url.includes('filter=comment')) {
      return {
        status: 200,
        data: {
          items: [
            {
              entity_key: 'p-167180194',
              type: 'post',
              publication: { id: 1, subdomain: 'iam-slys-dev', name: 'IAM Slys Dev' },
              post: {
                id: 167180194,
                title: 'Week of June 24, 2025: Build SaaS Without Code',
                slug: 'week-of-june-24-2025-build-saas-without',
                post_date: '2025-06-24T00:00:00Z',
                subtitle: 'The New Blueprint for Solopreneurs',
                truncated_body_text: 'Content about no-code...'
              },
              comment: null
            }
          ],
          nextCursor: null
        }
      }
    }

    // Profile feed (notes)
    if (url.includes('/api/v1/reader/feed/profile/27968736') && url.includes('filter=comment')) {
      return {
        status: 200,
        data: {
          items: [
            {
              entity_key: 'c-789',
              type: 'comment',
              publication: null,
              post: null,
              comment: SAMPLE_FEED_COMMENT
            }
          ],
          nextCursor: null
        }
      }
    }

    // Subscriptions
    if (url.includes('/api/v1/subscriptions/page')) {
      return {
        status: 200,
        data: {
          subscriptions: [
            {
              id: 1,
              publication_id: 10,
              publication: {
                id: 10,
                subdomain: 'jennyouyang',
                name: 'Jenny Ouyang',
                author: { id: 282291554, handle: 'jennyouyang' }
              }
            }
          ]
        }
      }
    }
  }

  if (method === 'post') {
    if (url.includes('/api/v1/comment/feed')) {
      return { status: 200, data: { id: 12345 } }
    }
  }

  return { status: 404, data: { error: 'Not Found' } }
}

// Install mock
jest.mock('cycletls')

const mockCycleTLSFn = jest
  .fn()
  .mockImplementation((url: string, _options: unknown, method: string) => {
    const result = routeRequest(url, method || 'get')
    return Promise.resolve({
      status: result.status,
      data: result.data,
      headers: {},
      finalUrl: url
    })
  })

;(initCycleTLS as jest.Mock).mockResolvedValue(
  Object.assign(mockCycleTLSFn, { exit: jest.fn().mockResolvedValue(undefined) })
)

// Export for tests to inspect
declare global {
  var MOCK_CYCLETLS: jest.Mock
}
global.MOCK_CYCLETLS = mockCycleTLSFn
