# Lab 7 – Cross-Origin Observations

Run each page with VS Code Live Server, open DevTools (F12) → Network tab, click the button, and select the API request.

| Item | Task 1 – Wikipedia | Task 2 – Zippopotam.us | Task 3 – Open Library |
|---|---|---|---|
| Application origin | `http://127.0.0.1:5500` (Live Server default) | same | same |
| API origin | `https://en.wikipedia.org` | `https://api.zippopotam.us` | `https://openlibrary.org` |
| Method | GET | GET | GET |
| Status | 200 | 200 (valid ZIP), 404 (unknown ZIP, e.g. 00000) | 200 |
| Access-Control-Allow-Origin | `*` | `*` | `*` |
| JSON structure | Array: `[term, [titles], [descriptions], [urls]]` | Object: `post code`, `country`, `places[]` → `place name`, `state`, `state abbreviation` | Object: `numFound`, `docs[]` → `title`, `author_name[]`, `first_publish_year`, `edition_count`, `key` |

## Notes
- The origins differ (scheme, host, and port), so these are cross-origin requests. The browser allows the page to read each response because the API returns `Access-Control-Allow-Origin: *`.
- These are simple GET requests with no custom headers, so the browser sends no preflight (OPTIONS) request.
- Wikipedia only sends the CORS header for anonymous requests when `origin=*` is in the query string. That parameter is specific to MediaWiki.
- `fetch()` does **not** reject on HTTP 404, so the code checks `response.ok`. jQuery's `.fail()` does fire on 404.
- No JSONP was used: no `callback=?` and no `dataType: "jsonp"`.
