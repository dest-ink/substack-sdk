# Changelog

All notable changes are documented here. This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.

Forked from [substack-api](https://github.com/jakub-k-slys/substack-api) v3.1.0 by [Jakub Slys](https://github.com/jakub-k-slys).

## [Unreleased]

## [0.1.0] - 2026-03

### Changed
- **Breaking**: All API calls go directly to Substack endpoints; no gateway proxy involved
- **Breaking**: Authentication uses `substack.sid` and `substack.lli` cookies directly instead of a base64-encoded token
- **Breaking**: Renamed package from `substack-api` to `substack-sdk`
- HTTP layer replaced with CycleTLS to bypass Cloudflare bot detection via TLS fingerprint spoofing
- Dual HTTP clients: global (`substack.com`) and publication-scoped endpoints
- `SubstackConfig` requires `substackSid` and `substackLli` instead of `token`
- Added `handle` config option (required for `ownProfile()`)
- `HttpClient` requires explicit `close()` to shut down CycleTLS subprocess

### Removed
- `gatewayUrl` config option
- All gateway-specific types and codecs
