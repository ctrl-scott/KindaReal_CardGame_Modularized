// tools/dir_tree.mjs
// Usage:
//   node tools/dir_tree.mjs ../card_json
//   node tools/dir_tree.mjs . > tree.txt

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

async function walk(dir, prefix = "") {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.error("❌ Failed to read " + dir + ": " + e.message);
    return "";
  }

  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  const lines = [];
  const last = entries.length - 1;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const connector = (i === last) ? "└── " : "├── ";
    const line = prefix + connector + e.name;
    lines.push(line);

    if (e.isDirectory()) {
      const childPrefix = prefix + (i === last ? "    " : "│   ");
      const subtree = await walk(path.join(dir, e.name), childPrefix);
      if (subtree) lines.push(subtree);
    }
  }
  return lines.join("\n");
}

async function main() {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  console.log(target);
  const tree = await walk(target);
  console.log(tree);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

