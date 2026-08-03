#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const comicsDir = path.join(rootDir, "comics");
const manifestPath = path.join(comicsDir, "comics.json");

function warn(message) {
  console.warn(`[comics] ${message}`);
}

function parseScalar(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === "true";
  }

  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseFrontMatter(markdown) {
  const match = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);

  if (!match) {
    throw new Error("Missing YAML front matter");
  }

  const lines = match[1].split(/\r?\n/);
  const data = {};
  let currentListKey = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (currentListKey && line.startsWith("-")) {
      const listValue = parseScalar(line.replace(/^-\s*/, ""));
      if (!Array.isArray(data[currentListKey])) {
        data[currentListKey] = [];
      }
      data[currentListKey].push(listValue);
      continue;
    }

    const fieldMatch = line.match(/^([A-Za-z0-9_-]+):(.*)$/);

    if (!fieldMatch) {
      warn(`Skipping unrecognized front matter line: ${rawLine}`);
      continue;
    }

    const [, key, valuePart] = fieldMatch;
    const value = valuePart.trim();

    if (value === "") {
      const nextLine = lines[i + 1] || "";
      if (nextLine.trim().startsWith("-")) {
        data[key] = [];
        currentListKey = key;
      } else {
        data[key] = "";
        currentListKey = null;
      }
      continue;
    }

    data[key] = parseScalar(value);
    currentListKey = null;
  }

  return {
    data,
    body: markdown.slice(match[0].length).trim()
  };
}

function buildManifest() {
  if (!fs.existsSync(comicsDir)) {
    throw new Error(`Comics directory not found: ${comicsDir}`);
  }

  const folders = fs
    .readdirSync(comicsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const manifest = [];

  for (const folderName of folders) {
    const folderPath = path.join(comicsDir, folderName);
    const comicMdPath = path.join(folderPath, "comic.md");
    const comicImagePath = path.join(folderPath, "comic.png");

    if (!fs.existsSync(comicMdPath)) {
      warn(`${folderName}: missing comic.md; skipping`);
      continue;
    }

    if (!fs.existsSync(comicImagePath)) {
      warn(`${folderName}: missing comic.png; skipping`);
      continue;
    }

    let markdown;
    try {
      markdown = fs.readFileSync(comicMdPath, "utf8");
    } catch (error) {
      warn(`${folderName}: could not read comic.md; skipping`);
      continue;
    }

    let parsed;
    try {
      parsed = parseFrontMatter(markdown);
    } catch (error) {
      warn(`${folderName}: ${error.message}; skipping`);
      continue;
    }

    const { data, body } = parsed;

    if (!data.slug || !data.title) {
      warn(`${folderName}: missing slug or title; skipping`);
      continue;
    }

    if (!Number.isInteger(Number(data.id))) {
      warn(`${folderName}: invalid or missing numeric id; skipping`);
      continue;
    }

    const published = data.published === true || String(data.published).toLowerCase() === "true";

    if (!published) {
      warn(`${folderName}: published is false; skipping`);
      continue;
    }

    const characters = Array.isArray(data.characters)
      ? data.characters
      : data.characters
        ? [data.characters]
        : [];

    const tags = Array.isArray(data.tags)
      ? data.tags
      : data.tags
        ? [data.tags]
        : [];

    manifest.push({
      id: Number(data.id),
      slug: String(data.slug),
      title: String(data.title),
      version: data.version ?? 1,
      date: data.date ?? "",
      location: data.location ?? "",
      image: `comics/${folderName}/comic.png`,
      alt: data.alt ?? "",
      summary: data.summary ?? "",
      published: true,
      featured: data.featured === true,
      story_type: data.story_type ?? "",
      characters,
      tags,
      body
    });
  }

  manifest.sort((a, b) => a.id - b.id);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`[comics] Built ${manifest.length} published comic(s) into ${path.relative(rootDir, manifestPath)}`);
}

function watchForChanges() {
  fs.watch(comicsDir, (eventType) => {
    if (eventType === "change" || eventType === "rename") {
      buildManifest();
    }
  });

  console.log("[comics] Watching comics folder. Press Ctrl+C to stop.");
}

const shouldWatch = process.argv.includes("--watch");

buildManifest();

if (shouldWatch) {
  watchForChanges();
}
