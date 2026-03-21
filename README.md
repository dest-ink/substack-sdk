# Substack SDK

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A modern, type-safe TypeScript client for the Substack API. Connects directly to Substack's endpoints using CycleTLS to bypass Cloudflare bot detection. No third-party proxy or gateway required.

## Why This Fork?

This project is based on [substack-api](https://github.com/jakub-k-slys/substack-api) by [Jakub Slys](https://github.com/jakub-k-slys). The original library routes all API requests through a third-party gateway proxy (`substack-gateway.vercel.app`), which means your Substack session cookies pass through a server you don't control. That's a dealbreaker for anyone handling user data or building a production application.

This fork takes a different architectural approach:

| | substack-api | substack-sdk |
|---|---|---|
| **HTTP layer** | Plain axios through a gateway proxy | CycleTLS directly to Substack (bypasses Cloudflare) |
| **Authentication** | Cookies sent to a third-party proxy | Cookies sent directly to Substack |
| **Credentials** | Single base64-encoded token | Two explicit cookies (`substack.sid` + `substack.lli`) |
| **TLS handling** | Relies on gateway to handle Cloudflare | Spoofs browser TLS fingerprints via CycleTLS |
| **Infrastructure** | Requires the gateway to be running | No external dependencies |

The entity-based API, async iterators, and io-ts runtime validation from the original are preserved.

## QuickStart

```bash
pnpm add @destink/substack-sdk
```

```typescript
import { SubstackClient } from '@destink/substack-sdk';

const client = new SubstackClient({
  substackSid: process.env.SUBSTACK_SID!,
  substackLli: process.env.SUBSTACK_LLI!,
  publicationUrl: 'https://yoursite.substack.com',
  handle: 'yourhandle'
});

// Get your profile and iterate through posts
const profile = await client.ownProfile();
for await (const post of profile.posts({ limit: 5 })) {
  console.log(`"${post.title}" - ${post.publishedAt?.toLocaleDateString()}`);
}

// Test connectivity
const isConnected = await client.testConnectivity();

// Always close when done (shuts down the CycleTLS subprocess)
await client.close();
```

## Authentication

All requests go directly to Substack's API. Authentication requires two session cookies from your browser.

### Step 1: Obtain your session cookies

1. Log in to [substack.com](https://substack.com) in your browser.
2. Open DevTools > Application > Cookies > `substack.com`.
3. Copy the values of **`substack.sid`** and **`substack.lli`**.

### Step 2: Pass the cookies to the client

```typescript
const client = new SubstackClient({
  substackSid: '<value of substack.sid cookie>',
  substackLli: '<value of substack.lli cookie>',
  publicationUrl: 'https://yoursite.substack.com',
  handle: 'yourhandle'  // required for ownProfile()
});
```

## Documentation

- [Installation Guide](docs/installation.md) - Setup and requirements
- [QuickStart Tutorial](docs/quickstart.md) - Get started in minutes
- [API Reference](docs/api-reference.md) - Complete method documentation
- [Entity Model](docs/entity-model.md) - Modern object-oriented API
- [Examples](docs/examples.md) - Real-world usage patterns

## License

MIT
