/**
 * io-ts codecs and inferred types for Substack API response shapes.
 *
 * These match the real Substack API responses (not the gateway proxy).
 * Fields are validated loosely — only the fields used by domain entities
 * are required; extra fields from Substack are ignored by io-ts.
 */
import * as t from 'io-ts'

// ------------------------------------------------------------------
// Profile
// ------------------------------------------------------------------

export const SubstackProfileC = t.intersection([
  t.type({
    id: t.number,
    handle: t.string,
    name: t.string,
    photo_url: t.string
  }),
  t.partial({
    bio: t.union([t.string, t.null])
  })
])
export type SubstackProfile = t.TypeOf<typeof SubstackProfileC>

// ------------------------------------------------------------------
// Feed envelope (shared by posts, notes, following feeds)
// ------------------------------------------------------------------

export const SubstackFeedItemPostC = t.intersection([
  t.type({
    id: t.number,
    title: t.string,
    slug: t.string,
    post_date: t.string
  }),
  t.partial({
    subtitle: t.union([t.string, t.null]),
    truncated_body_text: t.union([t.string, t.null]),
    body_html: t.union([t.string, t.null]),
    canonical_url: t.union([t.string, t.null]),
    reactions: t.union([t.record(t.string, t.number), t.null]),
    restacks: t.union([t.number, t.null]),
    cover_image: t.union([t.string, t.null]),
    publication_id: t.number,
    comment_count: t.number,
    type: t.string
  })
])
export type SubstackFeedItemPost = t.TypeOf<typeof SubstackFeedItemPostC>

export const SubstackFeedPublicationC = t.intersection([
  t.type({
    id: t.number,
    subdomain: t.string,
    name: t.string
  }),
  t.partial({
    custom_domain: t.union([t.string, t.null]),
    logo_url: t.union([t.string, t.null]),
    author_id: t.number
  })
])
export type SubstackFeedPublication = t.TypeOf<typeof SubstackFeedPublicationC>

export const SubstackFeedCommentC = t.intersection([
  t.type({
    id: t.number,
    body: t.string,
    user_id: t.number,
    date: t.string
  }),
  t.partial({
    name: t.union([t.string, t.null]),
    handle: t.union([t.string, t.null]),
    photo_url: t.union([t.string, t.null]),
    body_json: t.unknown,
    publication_id: t.union([t.number, t.null]),
    post_id: t.union([t.number, t.null]),
    type: t.string,
    reaction_count: t.number,
    reactions: t.union([t.record(t.string, t.number), t.null]),
    restacks: t.number,
    children_count: t.number,
    attachments: t.array(t.unknown),
    ancestor_path: t.string,
    edited_at: t.union([t.string, t.null]),
    reply_minimum_role: t.union([t.string, t.null])
  })
])
export type SubstackFeedComment = t.TypeOf<typeof SubstackFeedCommentC>

export const SubstackFeedItemC = t.intersection([
  t.type({
    entity_key: t.string,
    type: t.string
  }),
  t.partial({
    publication: t.union([SubstackFeedPublicationC, t.null]),
    post: t.union([SubstackFeedItemPostC, t.null]),
    comment: t.union([SubstackFeedCommentC, t.null])
  })
])
export type SubstackFeedItem = t.TypeOf<typeof SubstackFeedItemC>

export const SubstackFeedPageC = t.intersection([
  t.type({
    items: t.array(SubstackFeedItemC)
  }),
  t.partial({
    nextCursor: t.union([t.string, t.null]),
    originalCursorTimestamp: t.union([t.string, t.null])
  })
])
export type SubstackFeedPage = t.TypeOf<typeof SubstackFeedPageC>

// ------------------------------------------------------------------
// Full post (from GET /api/v1/posts/{slug})
// ------------------------------------------------------------------

export const SubstackFullPostC = t.intersection([
  t.type({
    id: t.number,
    title: t.string,
    slug: t.string,
    post_date: t.string
  }),
  t.partial({
    subtitle: t.union([t.string, t.null]),
    body_html: t.union([t.string, t.null]),
    truncated_body_text: t.union([t.string, t.null]),
    canonical_url: t.union([t.string, t.null]),
    reactions: t.union([t.record(t.string, t.number), t.null]),
    restacks: t.union([t.number, t.null]),
    cover_image: t.union([t.string, t.null]),
    publication_id: t.number,
    type: t.string,
    is_published: t.boolean,
    comment_count: t.number
  })
])
export type SubstackFullPost = t.TypeOf<typeof SubstackFullPostC>

// ------------------------------------------------------------------
// Comments (from GET /api/v1/post/{id}/comments)
// ------------------------------------------------------------------

export const SubstackCommentC: t.Type<SubstackComment> = t.recursion('SubstackComment', () =>
  t.intersection([
    t.type({
      id: t.number,
      body: t.string
    }),
    t.partial({
      body_json: t.unknown,
      publication_id: t.union([t.number, t.null]),
      post_id: t.union([t.number, t.null]),
      user_id: t.number,
      ancestor_path: t.string,
      type: t.string,
      date: t.string,
      name: t.union([t.string, t.null]),
      handle: t.union([t.string, t.null]),
      photo_url: t.union([t.string, t.null]),
      reaction_count: t.number,
      reactions: t.union([t.record(t.string, t.number), t.null]),
      restacks: t.number,
      deleted: t.boolean,
      children: t.array(SubstackCommentC)
    })
  ])
)
export interface SubstackComment {
  id: number
  body: string
  body_json?: unknown
  publication_id?: number | null
  post_id?: number | null
  user_id?: number
  ancestor_path?: string
  type?: string
  date?: string
  name?: string | null
  handle?: string | null
  photo_url?: string | null
  reaction_count?: number
  reactions?: Record<string, number> | null
  restacks?: number
  deleted?: boolean
  children?: SubstackComment[]
}

export const SubstackCommentsResponseC = t.type({
  comments: t.array(SubstackCommentC)
})
export type SubstackCommentsResponse = t.TypeOf<typeof SubstackCommentsResponseC>

// ------------------------------------------------------------------
// Subscriptions / Following (from GET /api/v1/subscriptions/page)
// ------------------------------------------------------------------

const SubscriptionPublicationAuthorC = t.intersection([
  t.type({
    id: t.number,
    handle: t.string
  }),
  t.partial({
    name: t.union([t.string, t.null]),
    photo_url: t.union([t.string, t.null])
  })
])

const SubscriptionPublicationC = t.intersection([
  t.type({
    id: t.number,
    subdomain: t.string,
    name: t.string
  }),
  t.partial({
    author: SubscriptionPublicationAuthorC
  })
])

const SubscriptionC = t.intersection([
  t.type({
    id: t.number,
    publication_id: t.number
  }),
  t.partial({
    membership_state: t.string,
    publication: SubscriptionPublicationC
  })
])

export const SubstackSubscriptionsResponseC = t.type({
  subscriptions: t.array(SubscriptionC)
})
export type SubstackSubscriptionsResponse = t.TypeOf<typeof SubstackSubscriptionsResponseC>

// ------------------------------------------------------------------
// Create note response (from POST /api/v1/comment/feed)
// ------------------------------------------------------------------

export const SubstackCreateNoteResponseC = t.type({ id: t.number })
export type SubstackCreateNoteResponse = t.TypeOf<typeof SubstackCreateNoteResponseC>
