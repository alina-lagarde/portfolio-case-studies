#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const orderPath = path.join(rootDir, "order.json");
const hubProjectsPath = path.join(__dirname, "hub-projects.yaml");
const languages = ["en", "fr"];

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

function stripDecorations(value) {
  return value.split("#")[0].split("?")[0];
}

function splitHref(href) {
  const [beforeHash, hash = ""] = href.split("#");
  const [pathname, query = ""] = beforeHash.split("?");

  return { pathname, query, hash };
}

function joinHref(pathname, query, hash) {
  return pathname + (query ? `?${query}` : "") + (hash ? `#${hash}` : "");
}

function isExternalHref(href) {
  return /^(?:[a-z]+:)?\/\//i.test(href)
    || href.startsWith("#")
    || href.startsWith("mailto:")
    || href.startsWith("tel:");
}

function cleanRouteForSlug(slug, language) {
  return `${slug}/${language}/`;
}

function createFileRouteMap(projects) {
  const map = new Map([
    ["portfolio-case-studies.html", "hub"],
    ["index.html", "hub"]
  ]);

  Object.entries(projects).forEach(([slug, project]) => {
    map.set(project.url, slug);
    map.set(`${slug}-case-study.html`, slug);
    map.set(`${slug}-case-study-v2.html`, slug);
    map.set(`${slug}-case-study.generated.html`, slug);
  });

  return map;
}

function rewriteHref(href, language, fileRouteMap, prefix) {
  if (isExternalHref(href)) return href;

  const { pathname, query, hash } = splitHref(href);
  const normalizedPath = pathname.replace(/^\.\//, "");
  const cleanPath = stripDecorations(normalizedPath);
  const fileRoute = fileRouteMap.get(cleanPath);

  if (fileRoute) {
    return joinHref(`${prefix}${cleanRouteForSlug(fileRoute, language)}`, query, hash);
  }

  const routeMatch = normalizedPath.match(/^(hub|[a-z0-9]+(?:-[a-z0-9]+)*)\/(?:en|fr)\/?$/);
  if (routeMatch) {
    return joinHref(`${prefix}${routeMatch[1]}/${language}/`, query, hash);
  }

  return href;
}

function rewriteRouteHtml(html, language, fileRouteMap, prefix) {
  return html
    .replace(/<html lang="[^"]*"/, `<html lang="${language}"`)
    .replaceAll('href="assets/', `href="${prefix}assets/`)
    .replaceAll('src="assets/', `src="${prefix}assets/`)
    .replace(/href="([^"]+)"/g, (match, href) => `href="${rewriteHref(href, language, fileRouteMap, prefix)}"`);
}

function writeRoute(sourceFile, routeSlug, language, fileRouteMap) {
  const sourcePath = path.join(rootDir, sourceFile);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing source file for route "${routeSlug}": ${sourceFile}`);
  }

  const outputDir = path.join(rootDir, routeSlug, language);
  const outputPath = path.join(outputDir, "index.html");
  const prefix = "../../";
  const html = rewriteRouteHtml(fs.readFileSync(sourcePath, "utf8"), language, fileRouteMap, prefix);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, html, "utf8");

  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
}

const order = readJson(orderPath);
const hubProjects = readYaml(hubProjectsPath);
const fileRouteMap = createFileRouteMap(hubProjects);

languages.forEach((language) => {
  writeRoute("portfolio-case-studies.html", "hub", language, fileRouteMap);
});

order.forEach((slug) => {
  const project = hubProjects[slug];

  if (!project) {
    throw new Error(`Missing hub metadata for "${slug}"`);
  }

  languages.forEach((language) => {
    writeRoute(project.url, slug, language, fileRouteMap);
  });
});
