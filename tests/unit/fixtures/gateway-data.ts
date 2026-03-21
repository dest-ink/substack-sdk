export const makeSubstackProfile = (id: number, handle: string, name: string) => ({
  id,
  handle,
  name,
  photo_url: `https://example.com/${handle}.jpg`,
  bio: `Bio for ${name}`
})

export const makeSubstackFeedComment = (id: number, body: string, reactionCount = 0) => ({
  id,
  body,
  user_id: 123,
  date: '2023-01-01T00:00:00Z',
  name: 'Test User',
  handle: 'testuser',
  photo_url: 'https://example.com/photo.jpg',
  reaction_count: reactionCount,
  type: 'feed'
})

export const makeSubstackFeedItemPost = (id: number, title: string) => ({
  id,
  title,
  slug: `post-${id}`,
  subtitle: 'Test subtitle',
  truncated_body_text: 'Truncated...',
  post_date: '2023-01-01T00:00:00Z'
})

export const makeSubstackFullPost = (id: number, title: string) => ({
  id,
  title,
  slug: `post-${id}`,
  subtitle: 'Test subtitle',
  canonical_url: `https://example.substack.com/p/post-${id}`,
  post_date: '2023-01-01T00:00:00Z',
  body_html: '<p>Full HTML content with <strong>formatting</strong></p>',
  truncated_body_text: 'Truncated content',
  reactions: { '❤️': 5 },
  restacks: 2,
  cover_image: 'https://example.com/cover.jpg'
})

export const makeSubstackComment = (id: number, body: string) => ({
  id,
  body,
  date: '2023-01-01T00:00:00Z',
  name: 'Commenter',
  handle: 'commenter',
  photo_url: 'https://example.com/commenter.jpg',
  reaction_count: 0
})

export const makeSubstackFeedItem = (id: number, title: string, subdomain = 'testpub') => ({
  entity_key: `p-${id}`,
  type: 'post' as const,
  publication: { id: 1, subdomain, name: 'Test Pub' },
  post: makeSubstackFeedItemPost(id, title),
  comment: null
})
