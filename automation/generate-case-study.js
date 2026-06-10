#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const templatePath = path.join(__dirname, "case-study-template.html");
const orderPath = path.join(rootDir, "order.json");

const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith("--"));
const outputFlagIndex = args.indexOf("--output");
const explicitOutput = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : null;

if (!slug) {
  console.error("Usage: node automation/generate-case-study.js {slug} [--output file.html]");
  process.exit(1);
}

const yamlPath = path.join(__dirname, "case-studies", `${slug}.yaml`);
const outputPath = path.join(rootDir, explicitOutput || `${slug}-case-study.generated.html`);

function readYaml(filePath) {
  const ruby = [
    "require 'yaml'",
    "require 'json'",
    "puts JSON.generate(YAML.load_file(ARGV[0]))"
  ].join("\n");

  const result = spawnSync("ruby", ["-e", ruby, filePath], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Unable to parse YAML: ${filePath}`);
  }

  return JSON.parse(result.stdout);
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInline(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function breakOnSlash(value) {
  return String(value ?? "").replace(/\s\/\s/g, "\n");
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function htmlTitle(value, fallback) {
  return value || escapeHtml(fallback || "");
}

function paragraphs(values, className = "") {
  const classAttr = className ? ` class="${className}"` : "";
  return toArray(values).map((value) => `<p${classAttr}>${escapeHtml(value)}</p>`).join("");
}

function richParagraphs(values) {
  return toArray(values).map((value) => `<p>${value}</p>`).join("");
}

function callout(data, language) {
  const custom = data.context?.[`callout_${language}`];

  if (custom) {
    const paragraphs = custom.map((item) => `<p><strong>${escapeHtml(item.label)}</strong> ${item.html || escapeHtml(item.text)}</p>`);

    if (data.context.separate_callouts) {
      return paragraphs.map((paragraph) => `<div class="callout">${paragraph}</div>`).join("");
    }

    return `<div class="callout">${paragraphs.join("")}</div>`;
  }

  const label = language === "fr" ? "Le vrai défi." : "The real challenge.";
  return `<div class="callout"><p><strong>${label}</strong> ${escapeHtml(data.context?.[`challenge_${language}`])}</p></div>`;
}

function quoteParagraphs(values) {
  const items = toArray(values);

  return items.map((item) => {
    const isObject = item && typeof item === "object" && !Array.isArray(item);
    const value = isObject ? (item.html || escapeHtml(item.text)) : escapeHtml(item);
    const isHighlighted = isObject ? item.highlight === true : items.length === 1;
    const classAttr = isHighlighted ? ' class="quote"' : "";
    return `<p${classAttr}>${value}</p>`;
  }).join("");
}

function participantSection(data, language) {
  if (!data.participants) return "";

  const cards = (data.participants[`cards_${language}`] || []).map((card) => [
    '<article class="participant-card">',
    `<h3>${escapeHtml(card.title)}</h3>`,
    card.chips ? `<p>${card.chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}</p>` : "",
    ...toArray(card.text).map((text) => `<p>${escapeHtml(text)}</p>`),
    "</article>"
  ].join("")).join("");

  return [
    '<section class="participants">',
    `<div class="section-label">${escapeHtml(labels[`participants_${language}`] || "Participants")}</div>`,
    `<h2 class="section-title">${escapeHtml(data.participants[`title_${language}`])}</h2>`,
    `<p>${escapeHtml(data.participants[`intro_${language}`])}</p>`,
    `<div class="participant-grid">${cards}</div>`,
    "</section>"
  ].join("");
}

function impactSection(data, language) {
  if (data.impact?.show_section === false) return "";

  if (data.impact?.style === "flow") {
    const cards = (data.impact[`cards_${language}`] || []).map((card) => [
      '<article class="impact-flow-card">',
      `<div class="impact-flow-label">${escapeHtml(card.label)}</div>`,
      `<h3>${escapeHtml(card.title)}</h3>`,
      `<p>${escapeHtml(card.text)}</p>`,
      "</article>"
    ].join("")).join("");

    return [
      '<section class="impact-flow">',
      '<div class="section-label">Impact</div>',
      `<h2 class="section-title">${htmlTitle(data.impact?.[`title_${language}_html`], data.impact?.[`title_${language}`])}</h2>`,
      `<div class="impact-flow-grid">${cards}</div>`,
      "</section>"
    ].join("");
  }

  return [
    '<section class="impact">',
    `<div><div class="section-label">Impact</div><h2 class="section-title">${htmlTitle(data.impact?.[`title_${language}_html`], data.impact?.[`title_${language}`])}</h2></div>`,
    `<div class="impact-copy">${paragraphs(data.impact?.[`paragraphs_${language}`])}</div>`,
    "</section>"
  ].join("");
}

function flowMapCard(map, language) {
  return [
    '<figure class="flow-map">',
    `<img src="${escapeHtml(map.file)}" alt="${escapeHtml(map[`alt_${language}`])}">`,
    `<figcaption class="caption">${escapeHtml(map[`caption_${language}`])}</figcaption>`,
    "</figure>"
  ].join("");
}

function resultsBody(data, language) {
  if (data.results?.layout === "flow_maps") {
    const items = (data.results[`items_${language}`] || []).map((item) => [
      '<article class="result-item">',
      `<div class="result-label">${escapeHtml(item.label)}</div>`,
      `<h3>${escapeHtml(item.title)}</h3>`,
      `<p>${escapeHtml(item.text)}</p>`,
      "</article>"
    ].join("")).join("");

    const maps = (data.results.flow_maps || []).map((map) => flowMapCard(map, language)).join("");

    return [
      '<div class="results-layout">',
      `<div class="result-list">${items}</div>`,
      "<div>",
      `<div class="section-label">${escapeHtml(data.results[`flow_maps_label_${language}`])}</div>`,
      `<div class="flow-map-grid">${maps}</div>`,
      "</div>",
      "</div>"
    ].join("");
  }

  const cards = `<div class="results-grid">${data.results[`blocks_${language}`].map(resultCard).join("")}</div>`;
  const outcomes = data.results.show_key_outcomes !== false && (data[`key_outcomes_${language}`] || []).length
    ? [
      '<div class="outcomes-panel">',
      `<h3>${language === "fr" ? "Résultats clés" : "Key outcomes"}</h3>`,
      `<div class="outcomes-list">${data[`key_outcomes_${language}`].map(outcomeRow).join("")}</div>`,
      "</div>"
    ].join("")
    : "";

  return cards + outcomes;
}

function toolsLine(data, language) {
  if (data.approach?.show_tools_line === false) return "";
  const prefix = language === "fr" ? "Outils : " : "Tools: ";
  return `<p>${prefix}${escapeHtml(data.approach?.[`tools_${language}`])}</p>`;
}

function metaCell(label, value) {
  return `<div class="meta-cell"><div class="meta-label">${escapeHtml(label)}</div><div class="meta-value">${formatInline(value)}</div></div>`;
}

function metaChipCell(label, chips) {
  const chipHtml = (chips || []).map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("");
  return `<div class="meta-cell"><div class="meta-label">${escapeHtml(label)}</div><div class="meta-value">${chipHtml}</div></div>`;
}

function sideField(label, value) {
  return `<div class="field"><div class="field-label">${escapeHtml(label)}</div><div class="field-value">${escapeHtml(value)}</div></div>`;
}

function labelledItems(items) {
  return (items || []).map((item) => item.highlight
    ? sideField(item.label, item.value).replace('class="field-value"', 'class="field-value accent"')
    : sideField(item.label, item.value)
  ).join("");
}

function metaItems(items) {
  return (items || []).map((item) => item.chips
    ? metaChipCell(item.label, item.chips)
    : metaCell(item.label, item.value)
  ).join("");
}

function stepCard(step, language) {
  return [
    '<article class="step">',
    `<div class="step-number">${escapeHtml(step.step)}</div>`,
    `<h3>${escapeHtml(step[`title_${language}`])}</h3>`,
    `<p>${escapeHtml(step[`text_${language}`])}</p>`,
    "</article>"
  ].join("");
}

function evidenceCard(image, language) {
  const classes = ["visual-card"];
  if (image.class) classes.push(image.class);
  if (image.wide) classes.push("wide");

  return [
    `<figure class="${classes.join(" ")}">`,
    `<img src="${escapeHtml(image.file)}" alt="${escapeHtml(image[`alt_${language}`])}">`,
    `<figcaption>${escapeHtml(image[`caption_${language}`])}</figcaption>`,
    "</figure>"
  ].join("");
}

function resultCard(block) {
  return `<article class="result-card"><h3>${escapeHtml(block.title)}</h3><p>${escapeHtml(block.text)}</p></article>`;
}

function outcomeRow(row) {
  return `<div class="outcome-row"><div class="outcome-label">${escapeHtml(row.label)}</div><div class="outcome-value">${escapeHtml(row.text)}</div></div>`;
}

function projectTitleFromSlug(projectSlug) {
  const titles = {
    "orange-sosh": "Orange & Sosh",
    "cstb-2024": "CSTB",
    septeo: "Septeo-ADB",
    insee: "INSEE",
    "alain-afflelou": "Alain Afflelou"
  };

  return titles[projectSlug] || projectSlug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function resolveCaseStudyFile(projectSlug) {
  const stablePath = `${projectSlug}-case-study.html`;
  const v2Path = `${projectSlug}-case-study-v2.html`;

  if (fs.existsSync(path.join(rootDir, stablePath))) return stablePath;
  if (fs.existsSync(path.join(rootDir, v2Path))) return v2Path;

  return stablePath;
}

function getNavigation(currentSlug) {
  const order = readJson(orderPath, []);
  const currentIndex = order.indexOf(currentSlug);

  if (currentIndex === -1 || order.length === 0) {
    return {
      nextSlug: "portfolio-case-studies",
      nextUrl: "portfolio-case-studies.html",
      isLoop: false
    };
  }

  const isLoop = currentIndex === order.length - 1;
  const nextSlug = order[(currentIndex + 1) % order.length];

  return {
    nextSlug,
    nextUrl: resolveCaseStudyFile(nextSlug),
    isLoop
  };
}

function replaceAll(template, replacements) {
  return Object.entries(replacements).reduce((html, [token, value]) => {
    return html.replaceAll(`{{${token}}}`, value ?? "");
  }, template);
}

const data = readYaml(yamlPath);
const template = fs.readFileSync(templatePath, "utf8");
const nav = getNavigation(data.slug);
const nextTitle = projectTitleFromSlug(nav.nextSlug);
const labels = data.labels || {};

if (data.template === "legacy-copy") {
  const sourceHtml = path.join(rootDir, data.source_html);
  if (!fs.existsSync(sourceHtml)) {
    console.error(`Generation stopped. Missing source HTML: ${data.source_html}`);
    process.exit(1);
  }

  fs.writeFileSync(outputPath, fs.readFileSync(sourceHtml, "utf8"), "utf8");
  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
  process.exit(0);
}

const replacements = {
  PAGE_TITLE: data.page_title || `${data.client} - ${data.role_en} - Alina Lagarde`,
  TOPBAR_LABEL_EN: labels.topbar_en || "Product Design - Case Study",
  TOPBAR_LABEL_FR: labels.topbar_fr || "Product Design - Use Case",
  HERO_IMAGE: data.hero.image,
  HERO_ALT_EN: data.hero.alt_en,
  HERO_ALT_FR: data.hero.alt_fr,
  HERO_EYEBROW_EN: data.hero.eyebrow_en,
  HERO_EYEBROW_FR: data.hero.eyebrow_fr,
  HERO_TITLE_EN_HTML: htmlTitle(data.hero.title_en_html, data.title_en),
  HERO_TITLE_FR_HTML: htmlTitle(data.hero.title_fr_html, data.title_fr),
  HERO_LEAD_EN: escapeHtml(data.hero.lead_en),
  HERO_LEAD_FR: escapeHtml(data.hero.lead_fr),

  META_CELLS_EN: data.meta_cells_en ? metaItems(data.meta_cells_en) : [
    metaCell("Client", `${data.client}\n${data.sector_en}`),
    metaCell("My role", breakOnSlash(data.role_en)),
    metaCell("Format", data.format_en),
    metaCell("Main outputs", breakOnSlash(data.main_outputs_en)),
    metaCell("Status", data.status_en)
  ].join(""),
  META_CELLS_FR: data.meta_cells_fr ? metaItems(data.meta_cells_fr) : [
    metaCell("Client", `${data.client}\n${data.sector_fr}`),
    metaCell("Mon rôle", breakOnSlash(data.role_fr)),
    metaCell("Format", data.format_fr),
    metaCell("Livrables principaux", breakOnSlash(data.main_outputs_fr)),
    metaCell("Statut", data.status_fr)
  ].join(""),

  CONTEXT_TITLE_EN_HTML: htmlTitle(data.context.title_en_html, data.context.title_en),
  CONTEXT_TITLE_FR_HTML: htmlTitle(data.context.title_fr_html, data.context.title_fr),
  CONTEXT_PARAGRAPHS_EN: data.context.paragraphs_en_html ? richParagraphs(data.context.paragraphs_en_html) : paragraphs(data.context.paragraphs_en),
  CONTEXT_PARAGRAPHS_FR: data.context.paragraphs_fr_html ? richParagraphs(data.context.paragraphs_fr_html) : paragraphs(data.context.paragraphs_fr),
  CALLOUT_EN: callout(data, "en"),
  CALLOUT_FR: callout(data, "fr"),

  SIDE_FIELDS_EN: data.side_fields_en ? labelledItems(data.side_fields_en) : [
    sideField("Objective", data.objective_en),
    sideField("Sourced via", data.sourcing_en),
    sideField("Team", data.team_en),
    sideField("Domain", data.domain_en),
    sideField("Constraints", data.constraints_en)
  ].join(""),
  SIDE_FIELDS_FR: data.side_fields_fr ? labelledItems(data.side_fields_fr) : [
    sideField("Objectif", data.objective_fr),
    sideField("Sourcé via", data.sourcing_fr),
    sideField("Équipe", data.team_fr),
    sideField("Domaine", data.domain_fr),
    sideField("Contraintes", data.constraints_fr)
  ].join(""),

  PARTICIPANTS_SECTION_EN: participantSection(data, "en"),
  PARTICIPANTS_SECTION_FR: participantSection(data, "fr"),
  APPROACH_SECTION_LABEL_EN: labels.approach_en || "Method and approach",
  APPROACH_SECTION_LABEL_FR: labels.approach_fr || "Méthode et approche",
  APPROACH_TITLE_EN_HTML: htmlTitle(data.approach.title_en_html, data.approach.title_en),
  APPROACH_TITLE_FR_HTML: htmlTitle(data.approach.title_fr_html, data.approach.title_fr),
  APPROACH_INTRO_EN: data.approach.intro_en_html || escapeHtml(data.approach.intro_en),
  APPROACH_INTRO_FR: data.approach.intro_fr_html || escapeHtml(data.approach.intro_fr),
  APPROACH_STEPS_EN: data.approach.steps.map((step) => stepCard(step, "en")).join(""),
  APPROACH_STEPS_FR: data.approach.steps.map((step) => stepCard(step, "fr")).join(""),
  TOOLS_LINE_EN: toolsLine(data, "en"),
  TOOLS_LINE_FR: toolsLine(data, "fr"),

  EVIDENCE_SECTION_LABEL_EN: labels.evidence_en || "Project evidence",
  EVIDENCE_SECTION_LABEL_FR: labels.evidence_fr || "Extraits du projet",
  EVIDENCE_TITLE_EN_HTML: htmlTitle(data.evidence?.title_en_html, data.evidence?.title_en),
  EVIDENCE_TITLE_FR_HTML: htmlTitle(data.evidence?.title_fr_html, data.evidence?.title_fr),
  EVIDENCE_CARDS_EN: data.evidence_images.map((image) => evidenceCard(image, "en")).join(""),
  EVIDENCE_CARDS_FR: data.evidence_images.map((image) => evidenceCard(image, "fr")).join(""),

  RESULTS_SECTION_LABEL_EN: labels.results_en || "Results",
  RESULTS_SECTION_LABEL_FR: labels.results_fr || "Résultats",
  RESULTS_TITLE_EN_HTML: htmlTitle(data.results.title_en_html, data.results.title_en),
  RESULTS_TITLE_FR_HTML: htmlTitle(data.results.title_fr_html, data.results.title_fr),
  RESULTS_BODY_EN: resultsBody(data, "en"),
  RESULTS_BODY_FR: resultsBody(data, "fr"),

  IMPACT_TITLE_EN_HTML: htmlTitle(data.impact.title_en_html, data.impact.title_en),
  IMPACT_TITLE_FR_HTML: htmlTitle(data.impact.title_fr_html, data.impact.title_fr),
  IMPACT_PARAGRAPHS_EN: paragraphs(data.impact.paragraphs_en),
  IMPACT_PARAGRAPHS_FR: paragraphs(data.impact.paragraphs_fr),
  IMPACT_SECTION_EN: impactSection(data, "en"),
  IMPACT_SECTION_FR: impactSection(data, "fr"),
  REFLECTION_SECTION_LABEL_EN: labels.reflection_en || "Takeaway",
  REFLECTION_SECTION_LABEL_FR: labels.reflection_fr || "Apprentissage",
  TAKEAWAY_EN: quoteParagraphs(data.takeaway_en),
  TAKEAWAY_FR: quoteParagraphs(data.takeaway_fr),

  NEXT_PROJECT_URL_EN: nav.nextUrl,
  NEXT_PROJECT_URL_FR: nav.nextUrl,
  NEXT_PROJECT_LABEL_EN: nav.isLoop ? "Back to the first project" : "Next project",
  NEXT_PROJECT_LABEL_FR: nav.isLoop ? "Retour au premier projet" : "Projet suivant",
  NEXT_PROJECT_TITLE_EN: nextTitle,
  NEXT_PROJECT_TITLE_FR: nextTitle,
  FOOTER_TEXT_EN: data.footer_text_en || "Alina Lagarde - Product Design Portfolio - 2026",
  FOOTER_TEXT_FR: data.footer_text_fr || "Alina Lagarde - Product Design Portfolio - 2026",
  FOOTER_MARK_EN: data.footer_mark_en || `${data.client} - Case study`,
  FOOTER_MARK_FR: data.footer_mark_fr || `${data.client} - Use case`
};

const html = replaceAll(template, replacements);
const remainingTokens = html.match(/\{\{[A-Z0-9_]+\}\}/g) || [];

if (remainingTokens.length > 0) {
  console.error(`Generation stopped. Missing replacements: ${[...new Set(remainingTokens)].join(", ")}`);
  process.exit(1);
}

fs.writeFileSync(outputPath, html, "utf8");

console.log(`Generated ${path.relative(rootDir, outputPath)}`);
