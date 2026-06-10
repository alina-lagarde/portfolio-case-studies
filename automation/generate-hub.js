#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "portfolio-case-studies.html");
const orderPath = path.join(rootDir, "order.json");
const hubProjectsPath = path.join(__dirname, "hub-projects.yaml");

const args = process.argv.slice(2);
const outputFlagIndex = args.indexOf("--output");
const explicitOutput = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : null;
const outputPath = path.join(rootDir, explicitOutput || "portfolio-case-studies.generated.html");

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function projectItem(project, index, language) {
  const number = String(index + 1).padStart(2, "0");

  return [
    '        <li class="project-item">',
    `          <a class="project-link" href="${escapeHtml(project.url)}">`,
    `            <span class="project-number">${number}</span>`,
    "            <span>",
    `              <span class="project-title">${escapeHtml(project[`title_${language}`])}</span>`,
    `              <span class="project-description">${escapeHtml(project[`description_${language}`])}</span>`,
    "            </span>",
    `            <span class="project-discipline">${escapeHtml(project[`discipline_${language}`])}</span>`,
    "          </a>",
    "        </li>"
  ].join("\n");
}

function projectList(projects, language) {
  return [
    '      <ol class="project-list">',
    projects.map((project, index) => projectItem(project, index, language)).join("\n"),
    "      </ol>"
  ].join("\n");
}

function replaceNthProjectList(html, listHtml, index) {
  const pattern = /      <ol class="project-list">[\s\S]*?      <\/ol>/g;
  let current = 0;

  return html.replace(pattern, (match) => {
    current += 1;
    return current === index ? listHtml : match;
  });
}

const order = readJson(orderPath);
const hubProjects = readYaml(hubProjectsPath);
const projects = order.map((slug) => {
  if (!hubProjects[slug]) {
    throw new Error(`Missing hub metadata for "${slug}" in automation/hub-projects.yaml`);
  }

  return hubProjects[slug];
});

let html = fs.readFileSync(sourcePath, "utf8");

html = replaceNthProjectList(html, projectList(projects, "fr"), 1);
html = replaceNthProjectList(html, projectList(projects, "en"), 2);
html = html.replaceAll(/<span(?: class="footer-count")?>\d+ use cases<\/span>/g, `<span class="footer-count">${projects.length} use cases</span>`);
html = html.replaceAll(/<span(?: class="footer-count")?>\d+ case studies<\/span>/g, `<span class="footer-count">${projects.length} case studies</span>`);

fs.writeFileSync(outputPath, html, "utf8");

console.log(`Generated ${path.relative(rootDir, outputPath)}`);
