#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const caseStudiesDir = path.join(__dirname, "case-studies");
const orderPath = path.join(rootDir, "order.json");
const hubProjectsPath = path.join(__dirname, "hub-projects.yaml");

const requiredFields = [
  "slug",
  "title_fr",
  "title_en",
  "client",
  "sector_fr",
  "sector_en",
  "role_fr",
  "role_en",
  "format_fr",
  "format_en",
  "status_fr",
  "status_en",
  "sourcing_fr",
  "sourcing_en",
  "team_fr",
  "team_en",
  "main_outputs_fr",
  "main_outputs_en",
  "objective_fr",
  "objective_en",
  "constraints_fr",
  "constraints_en",
  "approach",
  "evidence_images",
  "results",
  "key_outcomes_fr",
  "key_outcomes_en",
  "impact",
  "takeaway_fr",
  "takeaway_en"
];

const errors = [];
const warnings = [];

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

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return String(value).trim() === "";
}

function stableSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function resolveCaseStudyFile(slug) {
  const candidates = [
    `${slug}-case-study.html`,
    `${slug}-case-study-v2.html`,
    `${slug}-case-study.generated.html`
  ];

  return candidates.find((file) => fs.existsSync(path.join(rootDir, file))) || null;
}

function textLength(value) {
  return String(value || "").trim().replace(/\s+/g, " ").length;
}

function warnIfShort(slug, label, value, minimum = 80) {
  if (textLength(value) > 0 && textLength(value) < minimum) {
    warnings.push(`${slug}: ${label} is short (${textLength(value)} chars, expected at least ${minimum}).`);
  }
}

function validateYaml(data, fileName) {
  const slug = data.slug || fileName.replace(/\.ya?ml$/, "");

  if (!stableSlug(slug)) {
    errors.push(`${fileName}: slug "${slug}" must be kebab-case, lowercase, ASCII, with no accents.`);
  }

  requiredFields.forEach((field) => {
    if (isBlank(data[field])) {
      errors.push(`${slug}: missing required field "${field}".`);
    }
  });

  if (data.hero?.image && !fs.existsSync(path.join(rootDir, data.hero.image))) {
    errors.push(`${slug}: missing hero image "${data.hero.image}".`);
  }

  (data.evidence_images || []).forEach((image, index) => {
    const label = `evidence_images[${index}]`;

    if (!image.file) {
      errors.push(`${slug}: ${label} is missing file.`);
    } else if (!fs.existsSync(path.join(rootDir, image.file))) {
      errors.push(`${slug}: missing image "${image.file}".`);
    }

    ["alt_fr", "alt_en", "caption_fr", "caption_en"].forEach((field) => {
      if (isBlank(image[field])) {
        errors.push(`${slug}: ${label} is missing ${field}.`);
      }
    });
  });

  if (!Array.isArray(data.approach?.steps) || data.approach.steps.length === 0) {
    errors.push(`${slug}: approach.steps must contain at least one step.`);
  }

  warnIfShort(slug, "context.paragraphs_fr[0]", data.context?.paragraphs_fr?.[0]);
  warnIfShort(slug, "context.paragraphs_en[0]", data.context?.paragraphs_en?.[0]);
  warnIfShort(slug, "impact.effect_fr", data.impact?.effect_fr);
  warnIfShort(slug, "impact.effect_en", data.impact?.effect_en);

  return slug;
}

const order = readJson(orderPath, []);
const hubProjects = fs.existsSync(hubProjectsPath) ? readYaml(hubProjectsPath) : {};

if (!Array.isArray(order) || order.length === 0) {
  errors.push("order.json must contain at least one slug.");
} else {
  order.forEach((slug) => {
    if (!stableSlug(slug)) {
      errors.push(`order.json: "${slug}" is not a stable kebab-case slug.`);
    }

    if (!resolveCaseStudyFile(slug)) {
      warnings.push(`order.json: no local HTML file found for "${slug}".`);
    }

    if (!hubProjects[slug]) {
      errors.push(`hub-projects.yaml: missing hub metadata for "${slug}".`);
    } else {
      ["url", "title_fr", "title_en", "description_fr", "description_en", "discipline_fr", "discipline_en"].forEach((field) => {
        if (isBlank(hubProjects[slug][field])) {
          errors.push(`hub-projects.yaml: "${slug}" is missing "${field}".`);
        }
      });

      if (hubProjects[slug]?.url && !fs.existsSync(path.join(rootDir, hubProjects[slug].url))) {
        warnings.push(`hub-projects.yaml: "${slug}" points to missing file "${hubProjects[slug].url}".`);
      }
    }
  });
}

const yamlFiles = fs.existsSync(caseStudiesDir)
  ? fs.readdirSync(caseStudiesDir).filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
  : [];

if (yamlFiles.length === 0) {
  warnings.push("No YAML case study files found in automation/case-studies/.");
}

const yamlSlugs = yamlFiles.map((file) => {
  try {
    return validateYaml(readYaml(path.join(caseStudiesDir, file)), file);
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
    return null;
  }
}).filter(Boolean);

yamlSlugs.forEach((slug) => {
  if (Array.isArray(order) && order.length > 0 && !order.includes(slug)) {
    warnings.push(`${slug}: YAML exists but slug is not listed in order.json.`);
  }
});

console.log("Portfolio validation");
console.log(`YAML files: ${yamlFiles.length}`);
console.log(`Ordered projects: ${Array.isArray(order) ? order.length : 0}`);

if (warnings.length > 0) {
  console.log("\nWarnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length > 0) {
  console.error("\nErrors:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log("\nValidation passed.");
