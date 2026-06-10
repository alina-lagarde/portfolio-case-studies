# Portfolio Case Studies - Agent Instructions

## Project Context

This repository contains Alina Lagarde's static HTML portfolio case studies, published through GitHub Pages.

The project is intentionally static:
- no CMS
- no Webflow dependency
- no build framework unless explicitly introduced later
- HTML, CSS and assets should remain easy to inspect and edit locally

Alina works locally in this repository before publishing online.

## Working Directory

Always work in the local GitHub repository:

`/Users/alina/_Dev/GitHub/portfolio-case-studies`

Do not use old export folders as the source of truth unless Alina explicitly asks for it.

## Folder Structure

Recommended structure:

```text
portfolio-case-studies/
  AGENTS.md
  order.json
  portfolio-case-studies.html
  index.html
  {slug}-case-study.html
  {slug}-case-study-v1.html
  assets/
    {slug}/
      hero.png
      img-01.png
      img-02.png
      img-N.png
  automation/
    case-study-template.html
    case-studies/
      {slug}.yaml
    generate-case-study.js
    validate-portfolio.js
```

Current legacy pages may not fully match this structure yet. New work should move toward it progressively.

## Slug Naming

Use slugs for case studies and asset folders.

Rules:
- kebab-case only
- lowercase only
- no accents
- no spaces
- no special characters
- keep slugs stable once published

Examples:
- `orange-sosh`
- `cstb-2024`
- `septeo`
- `insee`
- `alain-afflelou`

HTML page naming:

```text
{slug}-case-study.html
```

Backup naming:

```text
{slug}-case-study-v1.html
{slug}-case-study-v2.html
```

## Image Naming

Each case study should have its own folder:

```text
assets/{slug}/
```

Required hero image:

```text
assets/{slug}/hero.png
```

Additional images:

```text
assets/{slug}/img-01.png
assets/{slug}/img-02.png
assets/{slug}/img-03.png
```

Image rules:
- `hero.png` is mandatory for new generated case studies.
- Use `img-01.png` to `img-N.png` for evidence/project images.
- Keep filenames lowercase and ASCII.
- Prefer PNG or JPG.
- Every image in the YAML content must include `alt_fr`, `alt_en`, `caption_fr`, and `caption_en`.

## Navigation Order

Navigation order should be managed through `order.json`, not hardcoded manually in every page.

Recommended format:

```json
[
  "orange-sosh",
  "cstb-2024",
  "septeo",
  "insee",
  "alain-afflelou"
]
```

The generator should use this file to calculate previous/next project links.

## Use Case Workflow

The intended workflow for a new case study is:

1. Create or update the YAML content file:
   `automation/case-studies/{slug}.yaml`
2. Add assets in:
   `assets/{slug}/`
3. Generate the HTML from the template:
   `YAML -> generate-case-study.js -> {slug}-case-study.html`
4. Validate the portfolio:
   `validate-portfolio.js`
5. Preview locally.
6. Ask Alina to validate content and design.
7. Create a V1 backup before replacing any existing published page.
8. Commit locally.
9. Push to GitHub only after explicit validation.

## Required YAML Content

New use case YAML files should include, at minimum:

```yaml
slug:
template:
language_default:
page_title:
title_fr:
title_en:
client:
sector_fr:
sector_en:
role_fr:
role_en:
format_fr:
format_en:
status_fr:
status_en:
sourcing_fr:
sourcing_en:
team_fr:
team_en:
main_outputs_fr:
main_outputs_en:
hero:
  image:
  alt_fr:
  alt_en:
  eyebrow_fr:
  eyebrow_en:
  title_fr_html:
  title_en_html:
  lead_fr:
  lead_en:
context:
  title_fr:
  title_en:
  paragraphs_fr:
  paragraphs_en:
  challenge_fr:
  challenge_en:
objective_fr:
objective_en:
constraints_fr:
constraints_en:
approach:
  title_fr:
  title_en:
  intro_fr:
  intro_en:
  tools_fr:
  tools_en:
  steps:
    - step:
      title_fr:
      title_en:
      text_fr:
      text_en:
evidence_images:
  - file:
    alt_fr:
    alt_en:
    caption_fr:
    caption_en:
results:
  title_fr:
  title_en:
  blocks_fr:
    - title:
      text:
  blocks_en:
    - title:
      text:
key_outcomes_fr:
key_outcomes_en:
impact:
  title_fr:
  title_en:
  before_fr:
  before_en:
  decision_fr:
  decision_en:
  effect_fr:
  effect_en:
takeaway_fr:
takeaway_en:
```

The template may support optional modules, but missing required content should trigger validation warnings.

Legacy/custom pages can temporarily use:

```yaml
template: legacy-copy
source_html: existing-page.html
```

This is acceptable when an existing page has a special hand-built structure that should not be rebuilt blindly. It should be treated as a transitional mode, not the ideal long-term format.

## Template Rules

The canonical template should be:

```text
automation/case-study-template.html
```

The template should remain modular. Not every case study needs every optional section.

Required modules:
- topbar with link back to the hub
- language switch EN/FR
- hero
- meta card
- context
- approach
- project evidence/images
- results
- impact
- takeaway/learning
- next project navigation

Optional modules:
- participants
- MVP scope
- test strategy
- key outcomes
- target flow maps
- special evidence grids

## Versioning Rules

Never overwrite a published/current page without creating a backup first.

Before replacing:

```text
{slug}-case-study.html
```

create:

```text
{slug}-case-study-v1.html
```

If a V1 already exists, ask Alina before creating another version.

Keep temporary V2/V3 files only when useful for visual comparison. Once validated and committed, Git history is the real long-term backup.

## Safety Rules

Never use destructive file operations.

Forbidden:
- `rm -rf`
- `rm -r`
- destructive git reset/checkout unless Alina explicitly asks for it

Use safe alternatives:
- `trash` for deletion when deletion is explicitly requested
- backups before replacing published files
- Git status checks before and after meaningful changes

Do not revert user changes unless Alina explicitly asks.

## Validation Rules

Before proposing a commit or push, run checks equivalent to:

- verify all local `href` links point to existing files
- verify all image `src` paths exist
- verify every generated case study has EN and FR panels
- verify required meta fields exist
- verify `hero.png` exists for generated/new case studies
- verify `order.json` contains every generated/published slug
- warn if important text fields are suspiciously short

Suggested text-length warning:

- warn when a required `text_fr` or `text_en` field has fewer than 80 characters
- warning only, not an automatic blocker

## Git And Publishing

Default publishing workflow:

1. Work locally.
2. Preview locally.
3. Ask Alina to validate.
4. Commit with GitHub Desktop or an explicit Codex-assisted commit.
5. Push to GitHub.
6. GitHub Pages updates the public version.

Do not push without explicit confirmation from Alina.

## Communication With Alina

Explain technical steps in simple French.

Use English for:
- code
- file names
- technical identifiers
- comments inside code

When modifying files, clearly explain:
- before
- after
- why the change is useful
