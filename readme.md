# exmxc-crawl-lite

Lightweight homepage crawler for exmxc.

Used for:
- Single URL EEI audits
- Crawl health checks
- Fast diagnostics

## Design
- Homepage only
- No rendering
- Stateless
- Never batched

## Endpoint

POST `/crawl-lite`

```json
{ "url": "https://example.com" }
