// tools/search_file_refs.mjs
// Usage: node tools/search_file_refs.mjs <search-term> [start-dir]
// Example: node tools/search_file_refs.mjs life_generic.json

import fs from "fs";
import path from "path";
import readline from "readline";

const term = process.argv[2];
if (!term) {
  console.error("❌ Please provide a search term (e.g. main.js or image.png)");
  process.exit(1);
}

const startDir = process.argv[3] || process.cwd();

async function searchFile(file, regex) {
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity
  });
  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    if (regex.test(line)) {
      console.log(`${file}:${lineNo}: ${line.trim()}`);
    }
  }
}

async function walk(dir, regex) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue; // skip heavy dirs
      await walk(fullPath, regex);
    } else {
      // check only text-like files
      if (/\.(js|mjs|html|css|json|md)$/i.test(entry.name)) {
        await searchFile(fullPath, regex);
      }
    }
  }
}

const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape special chars, case-insensitive
walk(startDir, regex).catch(err => {
  console.error("Search failed:", err);
  process.exit(1);
});

