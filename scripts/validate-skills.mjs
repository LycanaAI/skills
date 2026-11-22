#!/usr/bin/env node
// Validates every skills/*/SKILL.md. Usage: node scripts/validate-skills.mjs [dir]
// [dir] defaults to the repository's skills/ folder.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = resolve(process.argv[2] ?? join(root, "skills"));
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_DESCRIPTION = 1024;

const problems = [];
let checked = 0;

// Reads top-level scalar keys from a YAML frontmatter block, including
// quoted values and folded or literal block scalars (> and |).
function parseFrontmatter(block) {
  const fields = {};
  const lines = block.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (/^[>|][+-]?$/.test(value)) {
      const body = [];
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === "")) {
        body.push(lines[++i].trim());
      }
      value = value.startsWith(">") ? body.join(" ").replace(/\s+/g, " ").trim() : body.join("\n").trim();
    } else if (/^".*"$/.test(value)) {
      value = JSON.parse(value);
    } else if (/^'.*'$/.test(value)) {
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    fields[key] = value;
  }
  return fields;
}

function checkSkill(folder) {
  const label = `skills/${folder}/SKILL.md`;
  const skillPath = join(skillsDir, folder, "SKILL.md");
  if (!existsSync(skillPath)) {
    problems.push(`${label}: missing`);
    return;
  }
  checked++;
  const text = readFileSync(skillPath, "utf8");
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!fm) {
    problems.push(`${label}: does not start with YAML frontmatter between --- lines`);
    return;
  }
  const fields = parseFrontmatter(fm[1]);

  if (!fields.name) {
    problems.push(`${label}: frontmatter has no name`);
  } else {
    if (!NAME_PATTERN.test(fields.name)) {
      problems.push(`${label}: name "${fields.name}" must be lowercase letters, digits and hyphens`);
    }
    if (fields.name !== folder) {
      problems.push(`${label}: name "${fields.name}" does not match folder "${folder}"`);
    }
  }

  if (!fields.description) {
    problems.push(`${label}: frontmatter has no description`);
  } else if (fields.description.length > MAX_DESCRIPTION) {
    problems.push(`${label}: description is ${fields.description.length} characters (max ${MAX_DESCRIPTION})`);
  }

  // Reference files named in markdown links or in backticks.
  const refs = new Set();
  for (const m of text.matchAll(/\]\((?:\.\/)?(references\/[^)\s#]+\.md)(?:#[^)]*)?\)/g)) refs.add(m[1]);
  for (const m of text.matchAll(/`(?:\.\/)?(references\/[^`\s]+\.md)`/g)) refs.add(m[1]);
  for (const ref of refs) {
    if (!existsSync(join(skillsDir, folder, ref))) {
      problems.push(`${label}: references ${ref}, which does not exist`);
    }
  }
}

if (existsSync(skillsDir)) {
  for (const entry of readdirSync(skillsDir).sort()) {
    if (entry.startsWith(".")) continue;
    if (statSync(join(skillsDir, entry)).isDirectory()) checkSkill(entry);
  }
}

if (problems.length > 0) {
  console.error(`Found ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`All ${checked} skill(s) are valid.`);
