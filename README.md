# Far Post

Phase 1 strengthened the existing static frontend without changing the site's established editorial look and feel.

## Shared frontend foundations

- `assets/farpost.js` centralises the light shared browser utilities used by the critical pages.
- `assets/farpost.css` provides a consistent premium treatment for loading, empty, and error states.
- The shared JS currently owns:
  - defensive `fetchJson` handling for Netlify function responses
  - `setHTML` so dynamic sections re-bind image fallbacks safely after DOM updates
  - `renderState` and `stateMarkup` for standard loading, empty, and error blocks
  - `initNav` for shared sticky-nav/mobile-menu behaviour
  - podcast RSS helpers and reusable image fallback binding

## State handling conventions

- Use `FarPost.renderState(target, type, options)` for loading, empty, and API failure states.
- Prefer `FarPost.setHTML(target, html)` over raw `innerHTML` for dynamic sections so newly injected images inherit shared fallback handling.
- Dynamic images should use `data-fallback="hide"` for safe collapse or `data-fallback="podcast-art"` for podcast artwork frames that should swap to the inline play-mark fallback.
- Critical pages now guard partial data more intentionally:
  - homepage supporting modules degrade independently
  - players and clubs hubs keep structure and notes intact when feeds fail
  - the match centre collapses missing sections cleanly instead of leaving raw errors

## Regression tests

- The regression suite uses Playwright against the real static HTML pages with a tiny local server in `tests/server.mjs`.
- API calls are mocked at the browser-routing layer so tests cover both success and failure states without depending on live upstreams.

Run locally:

```bash
npm install
npx playwright install
npm run test:regression
```

## Architectural notes

- The site remains static HTML/CSS/JS with Netlify Functions as the data layer.
- Shared foundations were introduced as a lightweight utilities layer rather than a framework or component rewrite.
- Refactoring priority in this phase was:
  - homepage
  - players hub
  - clubs hub
  - match page
  - podcasts

## Phase 2 ideas

- Move more repeated Sanity article-card rendering from `news.html`, `opinions.html`, and `article.html` onto the shared utilities layer.
- Introduce one shared stylesheet for nav, footer, and section chrome once the team is comfortable with the current utility split.
- Add regression checks for article pages, fixtures/results tab behaviour, and club/player detail-page fallback states.
