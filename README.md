# Far Post

Phase 1 strengthened the existing static frontend without changing the site's established editorial look and feel.

Phase 3 begins by adding lightweight editorial controls, stronger related/discovery behaviour, and standard metadata/social patterns while keeping the existing dark editorial product intact.

## Shared frontend foundations

- `assets/farpost.js` centralises the light shared browser utilities used by the critical pages.
- `assets/farpost.css` provides a consistent premium treatment for loading, empty, and error states.
- The shared JS currently owns:
  - defensive `fetchJson` handling for Netlify function responses
  - `setHTML` so dynamic sections re-bind image fallbacks safely after DOM updates
  - `renderState` and `stateMarkup` for standard loading, empty, and error blocks
  - `initNav` for shared sticky-nav/mobile-menu behaviour
  - podcast RSS helpers and reusable image fallback binding
  - shared editorial helpers for labels, homepage priority rules, and related-content signals
  - shared metadata helpers for canonical URLs, Open Graph, Twitter cards, and lightweight JSON-LD

## Phase 3 editorial conventions

- Sanity post queries now tolerate an optional `editorial` object without requiring a wider CMS rebuild.
- The current lightweight homepage conventions are:
  - `editorial.homeHero: true` to force a story into homepage hero consideration
  - `editorial.homeHeroRank: number` to order hero-priority stories
  - `editorial.editorsPick: true` to force a story into the Editor's picks stack
  - `editorial.editorsPickRank: number` to order explicit picks
  - `editorial.suppressHomepage: true` to keep a lower-priority story out of premium homepage slots
  - `editorial.suppressHomeHero: true` if a story can appear elsewhere but should not lead the homepage hero
- Optional content labels can be supplied through `editorial.label`, `editorial.labels`, or legacy `labels`; the first value becomes the primary on-card label.
- Optional discovery hints can be supplied through `editorial.relatedTeams`, `editorial.relatedPlayers`, and `editorial.topics`.

## State handling conventions

- Use `FarPost.renderState(target, type, options)` for loading, empty, and API failure states.
- Prefer `FarPost.setHTML(target, html)` over raw `innerHTML` for dynamic sections so newly injected images inherit shared fallback handling.
- Dynamic images should use `data-fallback="hide"` for safe collapse or `data-fallback="podcast-art"` for podcast artwork frames that should swap to the inline play-mark fallback.
- Critical pages now guard partial data more intentionally:
  - homepage supporting modules degrade independently
  - players and clubs hubs keep structure and notes intact when feeds fail
  - the match centre collapses missing sections cleanly instead of leaving raw errors

## Discovery and growth conventions

- Article pages now score related content using a mix of category, editorial labels/topics, explicit club/player hints, and body-text mentions instead of simple recency alone.
- Article pages also surface contextual club/player links when Far Post can infer a useful onward route.
- The Phase 3 growth feature is a restrained `Stay with Far Post this week` module on article pages:
  - one latest article route
  - one latest podcast route
  - no signup flow, pop-up, or noisy widget treatment

## Metadata conventions

- Key pages now ship baseline `description`, `canonical`, Open Graph, and Twitter-card tags in static HTML.
- Dynamic article, club, player, and match pages upgrade those tags client-side once page data loads, and also inject lightweight JSON-LD.
- Because the site remains a static HTML plus client-rendered-data architecture, this is an interim SEO/share improvement rather than full crawler-grade deep-page rendering. A later prerender/SSR phase would unlock the next step.

## Regression tests

- The regression suite uses Playwright against the real static HTML pages with a tiny local server in `tests/server.mjs`.
- API calls are mocked at the browser-routing layer so tests cover both success and failure states without depending on live upstreams.
- Phase 3 coverage currently protects:
  - homepage editorial override and explicit editor-pick behaviour
  - deep-page metadata updates on article and match routes
  - article contextual linking and the new weekly cross-promotion module

Run locally:

```bash
npm install
npx playwright install
npm run test:regression
```

## Architectural notes

- The site remains static HTML/CSS/JS with Netlify Functions as the data layer.
- Shared foundations were introduced as a lightweight utilities layer rather than a framework or component rewrite.
- Refactoring priority in the current codebase has been:
  - homepage
  - players hub
  - clubs hub
  - match page
  - podcasts

## Follow-up notes

- If Far Post wants stronger SEO on article, club, player, and match pages, the next step is prerendering or server-rendered head generation for deep routes.
- If editorial teams want richer curation, the current `editorial.*` conventions can later harden into proper Sanity schema fields without changing the homepage/client-side ordering logic.
- If player- and club-specific editorial coverage becomes a stronger product surface, extend the same related-content scoring used on articles to dedicated coverage modules on player and match pages.
