# Clean URLs and favicon

## Goal

Create cleaner shareable URLs for the portfolio hub and case studies, and add the provided favicon.

## Scope

- Keep the current validated `.html` pages as source pages.
- Add clean static routes using folders with `index.html`.
- Add the favicon asset under `assets/`.
- Add favicon links to final HTML pages and generated templates.
- Update navigation links so the public journey uses clean URLs.

## URL convention

- Hub:
  - `hub/en/`
  - `hub/fr/`
- Case studies:
  - `orange-sosh/en/`
  - `orange-sosh/fr/`
  - `cstb-2024/en/`
  - `cstb-2024/fr/`
  - `septeo/en/`
  - `septeo/fr/`
  - `insee/en/`
  - `insee/fr/`
  - `alain-afflelou/en/`
  - `alain-afflelou/fr/`

## Approach

1. Copy the favicon to `assets/favicon.gif`.
2. Add `<link rel="icon" href="...">` to the hub, case studies, and template.
3. Generate clean route files from the validated final pages.
4. In clean route files, rewrite asset paths and internal links relative to their folder depth.
5. Make the language script understand `/en/` and `/fr/` path segments.
6. Validate the portfolio.

## Safety

- No destructive deletion.
- Keep existing `.html` URLs working.
- Keep the current visual structure untouched.
- Do not commit automatically.
