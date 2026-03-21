/**
 * Phase 4: Test legacy API patterns and remaining unknowns
 */
import initCycleTLS from 'cycletls'
import { config } from 'dotenv'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, 'fixtures')
mkdirSync(FIXTURES_DIR, { recursive: true })

config({ path: resolve(__dirname, '..', '.env') })

const SID = process.env.SUBSTACK_SID!
const LLI = process.env.SUBSTACK_LLI!

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const HEADERS = {
  'Content-Type': 'application/json',
  Cookie: `substack.sid=${SID}; substack.lli=${LLI}`,
}

async function main() {
  const client = await initCycleTLS()

  const tests = [
    // Legacy Substack API patterns (non-v1)
    { name: 'post-by-id-legacy', url: 'https://aalx.substack.com/api/v1/posts/191067613' },
    { name: 'post-by-slug-legacy', url: 'https://aalx.substack.com/api/v1/posts/90-of-your-feed-is-a-lie' },

    // Try Accept header for JSON
    { name: 'post-by-slug-accept-json', url: 'https://aalx.substack.com/api/v1/post/90-of-your-feed-is-a-lie', headers: { ...HEADERS, Accept: 'application/json' } },

    // Check if there's a post detail in the feed by looking for a specific post
    { name: 'reader-post-detail', url: 'https://substack.com/api/v1/reader/post/191067613' },

    // Try post detail endpoint
    { name: 'post-detail', url: 'https://aalx.substack.com/api/v1/post-detail/90-of-your-feed-is-a-lie' },

    // Full post keys from feed - let's check if the feed post has body_html
    // (checked in code below)

    // Note by comment_id - try different patterns
    { name: 'note-detail', url: 'https://substack.com/api/v1/note/217303447' },
    { name: 'feed-comment', url: 'https://substack.com/api/v1/feed/comment/217303447' },

    // Pagination test - following feed with cursor
    { name: 'following-feed-page2', url: 'https://substack.com/api/v1/feed/following?page=1' },
  ]

  for (const test of tests) {
    try {
      console.log(`\n${test.name}: GET ${test.url}`)
      const hdrs = (test as Record<string, unknown>).headers as Record<string, string> || HEADERS
      const resp = await client(test.url, { headers: hdrs, userAgent: USER_AGENT }, 'get')
      const data = typeof resp.data === 'string' ? tryParse(resp.data) : resp.data

      const isObj = data && typeof data === 'object' && !Array.isArray(data)
      const numKeys = isObj ? Object.keys(data as Record<string, unknown>) : undefined
      const hasNumericKeys = numKeys && numKeys.length > 0 && numKeys[0].match(/^\d+$/)

      if (hasNumericKeys) {
        console.log(`  → ${resp.status} (HTML response)`)
      } else if (isObj) {
        const keys = Object.keys(data as Record<string, unknown>).slice(0, 15)
        console.log(`  → ${resp.status} keys: ${keys.join(', ')}`)
      } else {
        console.log(`  → ${resp.status}`)
      }

      if (resp.status === 200 && !hasNumericKeys) {
        writeFileSync(
          resolve(FIXTURES_DIR, `${test.name}.json`),
          JSON.stringify(summarize(data), null, 2) + '\n'
        )
      }
    } catch (err) {
      console.log(`  → ERROR: ${err instanceof Error ? err.message : err}`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

  // Now let's extract all post keys from the profile feed to understand the full shape
  console.log('\n\n=== Post keys from profile feed ===')
  const feedResp = await client(
    'https://substack.com/api/v1/reader/feed/profile/41856304',
    { headers: HEADERS, userAgent: USER_AGENT },
    'get'
  )
  const feedData = typeof feedResp.data === 'string' ? tryParse(feedResp.data) : feedResp.data
  if (feedData && typeof feedData === 'object') {
    const fd = feedData as { items?: Array<Record<string, unknown>> }
    if (fd.items) {
      // Find a post-type item
      const postItem = fd.items.find((i: Record<string, unknown>) => i.type === 'post')
      if (postItem) {
        const post = postItem.post as Record<string, unknown> | undefined
        if (post) {
          console.log(`\nPost keys (${Object.keys(post).length} total):`)
          console.log(Object.keys(post).join(', '))
          console.log('\nHas body_html:', 'body_html' in post)
          console.log('Has body:', 'body' in post)
          console.log('Has truncated_body_text:', 'truncated_body_text' in post)
          console.log('Post date field:', post.post_date)
          console.log('Published at:', post.published_at)

          writeFileSync(
            resolve(FIXTURES_DIR, 'feed-post-full.json'),
            JSON.stringify(post, null, 2) + '\n'
          )
        }
      }
    }
  }

  await client.exit()
}

function tryParse(s: string): unknown {
  try { return JSON.parse(s) } catch { return s }
}

function summarize(data: unknown, depth = 0): unknown {
  if (depth > 5) return data
  if (Array.isArray(data)) {
    const s = data.slice(0, 2).map(i => summarize(i, depth + 1))
    if (data.length > 2) s.push(`... (${data.length} total)`)
    return s
  }
  if (data && typeof data === 'object') {
    const r: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      r[k] = summarize(v, depth + 1)
    }
    return r
  }
  return data
}

main().catch(e => { console.error(e); process.exit(1) })
