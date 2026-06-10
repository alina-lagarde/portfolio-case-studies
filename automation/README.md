# Portfolio Automation

This folder contains the local case study generation workflow.

The goal is not to remove the final visual review. The goal is to make each new case study easier to assemble, safer to validate and easier to publish without forgetting links, languages, images or hub entries.

## Files

```text
automation/
  README.md
  case-study-template.html
  case-studies/
    {slug}.yaml
  generate-case-study.js
  validate-portfolio.js
```

Credentials and API keys must never be stored here. Use environment variables or ignored local `.env` files if future tooling needs secrets.

## New Case Study Workflow

For a new project, Alina prepares:

1. Final or near-final FR content, ideally already structured by section.
2. EN translation or a clear instruction to translate from FR.
3. A folder of project images.
4. The desired project order in the portfolio hub.

Then the local workflow is:

1. Create an asset folder:

```text
assets/{slug}/
```

2. Rename images using the project convention:

```text
hero.png
img-01.png
img-02.png
img-03.png
```

3. Create the YAML source:

```text
automation/case-studies/{slug}.yaml
```

4. Add the slug to:

```text
order.json
```

5. Add the hub card metadata to:

```text
automation/hub-projects.yaml
```

6. Generate a comparison page:

```bash
node automation/generate-case-study.js {slug}
```

This creates:

```text
{slug}-case-study.generated.html
```

7. Generate a comparison hub:

```bash
node automation/generate-hub.js
```

This creates:

```text
portfolio-case-studies.generated.html
```

8. Validate the whole portfolio:

```bash
node automation/validate-portfolio.js
```

9. Open the generated HTML files locally and do a visual review.

10. Only after visual validation, create a V1 backup if replacing an existing page, then copy the generated version into the final page name.

11. Commit locally, then push only after explicit validation.

## Commands

Generate a safe comparison page without replacing the final HTML:

```bash
node automation/generate-case-study.js alain-afflelou
```

This creates:

```text
alain-afflelou-case-study.generated.html
```

Generate a specific output file:

```bash
node automation/generate-case-study.js alain-afflelou --output alain-afflelou-case-study-test.html
```

Validate the portfolio content, images and project order:

```bash
node automation/validate-portfolio.js
```

Generate a safe comparison version of the hub:

```bash
node automation/generate-hub.js
```

This creates:

```text
portfolio-case-studies.generated.html
```

The generator does not push, publish or commit anything. GitHub Desktop remains the final validation and commit step.

## Visual Review Checklist

Before replacing a final HTML file, check:

- hero image crop and height
- meta card readability
- FR/EN language switch
- section rhythm and spacing
- approach cards responsive behavior
- image captions and uncropped evidence images
- results / impact distinction
- final takeaway typography
- bottom navigation link
- hub card order and links

Generated pages are working drafts. The final visual pass remains human.
