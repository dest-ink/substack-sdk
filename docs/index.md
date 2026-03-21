# Substack SDK

A TypeScript client library for interacting with Substack. All requests go directly to Substack's API using CycleTLS to bypass Cloudflare bot detection. No third-party proxy required.

> Based on [substack-api](https://github.com/jakub-k-slys/substack-api) by [Jakub Slys](https://github.com/jakub-k-slys). This fork removes the gateway proxy dependency and authenticates directly with Substack using session cookies.

## Who This Is For

**Content creators** - publish notes, read comments on your posts, explore your following network programmatically.

**Developers** - integrate Substack data into applications, build automation workflows around note publishing, extract and analyse content from Substack profiles.

## Features

- **Entity-oriented API** - navigate Substack data through rich objects (`profile.posts()`, `post.comments()`)
- **Async iterators** - pagination handled automatically with `for await` syntax
- **Full TypeScript support** - all entities and config types are strongly typed
- **Direct API access** - connects to Substack via CycleTLS, no gateway or proxy
- **Cookie authentication** - authenticates using `substack.sid` and `substack.lli` session cookies
- **Note publishing** - publish notes with optional link attachments via `publishNote(content, options?)`
- **Smart pagination** - offset-based for posts, cursor-based for notes; configurable limits

## Architecture

```
SubstackClient
  ↓ CycleTLS (direct to Substack API)
Profile, OwnProfile, PreviewPost, FullPost, Note, Comment
  ↓
Async iterators for paginated collections
```

All HTTP requests go directly to Substack with:
- `Cookie: substack.sid=...; substack.lli=...` header
- TLS fingerprint spoofing via CycleTLS

## Quick Links

- [GitHub Repository](https://github.com/dest-ink/substack-sdk)
- [Issue Tracker](https://github.com/dest-ink/substack-sdk/issues)

## Contents

- [Quickstart](quickstart.md) - install, authenticate, and make your first API call
- [API Reference](api-reference.md) - complete class, method, and type documentation
- [Examples](examples.md) - practical usage patterns
- [Development](development.md) - contributing and project internals
- [Changelog](changelog.md)
