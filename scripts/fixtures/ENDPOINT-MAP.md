# Substack API v1 — Endpoint Map (Discovered 2026-03-16)

All requests require CycleTLS (Cloudflare blocks regular HTTP clients).
Auth: `Cookie: substack.sid=${sid}; substack.lli=${lli}`

## Working Endpoints

### Profile
| Endpoint | Scope | Response Shape |
|---|---|---|
| `GET /api/v1/user/{handle}/public_profile` | global | Profile object (id, name, handle, photo_url, bio, publicationUsers[], subscriptions[], etc.) |
| `GET /api/v1/user/{userId}-{slug}/public_profile/self` | global | Same as above (own profile) |

- `handle` = the Substack handle (e.g. "frankietubs")
- `slug` ≠ `handle` — slug is "frankie-tubesocks" but handle is "frankietubs"
- Profile by userId alone → 404
- `/api/v1/me` → 404
- `/api/v1/user/self` → 403

### Posts
| Endpoint | Scope | Response Shape |
|---|---|---|
| `GET /api/v1/posts/{slug}` | publication | Full post object (71 fields including body_html, truncated_body_text, body_json) |
| `GET /api/v1/reader/feed/profile/{userId}` | global | Feed envelope: `{ items[], originalCursorTimestamp, nextCursor }` |

- **Post by ID → NOT AVAILABLE** on v1 API (both `/api/v1/post/{id}` and `/api/v1/posts/{id}` return 404)
- Post by slug MUST use `/api/v1/posts/{slug}` (plural) on the **publication domain**
- `/api/v1/post/{slug}` (singular) returns HTML
- Feed items have type "post" with nested `publication` and `post` objects
- Post uses `post_date` (not `published_at`), `body_html` (not `html_body`), `truncated_body_text`

### Comments
| Endpoint | Scope | Response Shape |
|---|---|---|
| `GET /api/v1/post/{postId}/comments?all_comments=true&sort=best_first` | publication | `{ comments: Comment[] }` |
| `POST /api/v1/post/{postId}/comment` | publication | New comment (body: `{ body: "text" }`) |

- Comment shape: id, body, body_json, publication_id, post_id, user_id, ancestor_path, type, date, reactions, reaction_count, children[]
- Nested children for reply threads

### Notes
| Endpoint | Scope | Response Shape |
|---|---|---|
| `GET /api/v1/reader/feed/profile/{userId}?filter=comment` | global | Feed envelope with note items |
| `GET /api/v1/notes?for_profile={userId}` | publication | Feed envelope with note items |
| `POST /api/v1/comment/feed` | global | Post a new note |
| `POST /api/v1/image` | global | Upload image → `{ url: s3Url }` |
| `POST /api/v1/comment/attachment` | global | Register attachment → `{ id: uuid }` |

- Notes are "comments" with type="feed" and post_id=null
- Note-by-ID endpoint → NOT FOUND (tried /comment/{id}, /note/{id}, /reader/note/{id})
- Notes in feed have: id, body, body_json, user_id, type="feed", date, reactions, reaction_count, children_count, attachments[]

### Following
| Endpoint | Scope | Response Shape |
|---|---|---|
| `GET /api/v1/subscriptions/page` | global | `{ subscriptions[], publications[], user_subscriptions[] }` |
| `GET /api/v1/feed/following` | global | Feed envelope |

### Reactions
| Endpoint | Scope | Response Shape |
|---|---|---|
| `POST /api/v1/post/{postId}/reaction` | global? | body: `{ reaction: "❤", surface: "reader" }` |
| `POST /api/v1/comment/{commentId}/reaction` | publication | body: `{ reaction: "❤" }` |

### Feed
| Endpoint | Scope | Response Shape |
|---|---|---|
| `GET /api/v1/reader/feed` | global | Feed envelope (general reader feed) |
| `GET /api/v1/feed/following` | global | Feed envelope (following only) |

## Feed Envelope Shape
```typescript
{
  items: FeedItem[]           // array of feed items
  originalCursorTimestamp: string  // ISO timestamp
  nextCursor: string          // base64-encoded cursor for next page
}
```

## FeedItem Shape
```typescript
{
  entity_key: string          // "p-{postId}" or "c-{commentId}"
  type: "post" | "comment"
  context: { type, timestamp, users[], source, page, page_rank }
  publication: Publication | null
  post: Post | null
  comment: Comment | null     // present when type="comment" (notes)
  parentComments: Comment[]
  canReply: boolean
  isMuted: boolean
}
```

## Key Differences from Gateway API
| Gateway | Substack Direct |
|---|---|
| `avatar_url` | `photo_url` |
| `published_at` | `post_date` |
| `html_body` | `body_html` |
| Token: `Bearer base64(...)` | Cookie: `substack.sid=...; substack.lli=...` |
| Single base URL | Global (substack.com) vs Publication ({pub}.substack.com) |
| `GET /posts/{id}` | No post-by-ID; use `GET /api/v1/posts/{slug}` on pub domain |
| `GET /notes/{id}` | No note-by-ID endpoint found |
| `GET /me` | `GET /api/v1/user/{userId}-{handle}/public_profile/self` |

## Not Found / Not Available
- `GET /api/v1/me` → 404
- `GET /api/v1/user/{userId}/public_profile` (without slug) → 404
- `GET /api/v1/post/{id}` → 404
- `GET /api/v1/posts/{id}` (numeric) → 404 (only slug works)
- `GET /api/v1/comment/{id}` → 404
- `GET /api/v1/notes` on global domain → 404
- `GET /api/v1/activity` → 404
- `GET /api/v1/notifications` → 404
- `GET /api/v1/search/*` → 404
