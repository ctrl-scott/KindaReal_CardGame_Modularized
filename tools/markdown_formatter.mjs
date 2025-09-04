#!/usr/bin/env node
/**
 * markdown_formatter.mjs
 *
 * A zero-dependency Node.js CLI and library to normalize and format plain text
 * into reasonable Markdown. It applies conservative heuristics:
 *   - Paragraph detection and soft-wrapping
 *   - Bullet and numbered list normalization
 *   - Code block detection (triple backticks, or 4-space/tab indents)
 *   - Blockquote normalization ("quote: ..." -> "> ...")
 *   - Heading detection from setext underlines (=== or ---) and optional ALL-CAPS lines
 *   - URL autolinking (http/https)
 *
 * Usage (CLI):
 *   node markdown_formatter.mjs --input input.txt --output output.md --width 80 --title "My Doc" --no-wrap=false --normalize-headings=true
 *
 * Or pipe:
 *   cat input.txt | node markdown_formatter.mjs > output.md
 *
 * Library usage:
 *   import { formatMarkdownText } from './markdown_formatter.mjs'
 *   const md = formatMarkdownText(raw, { width: 88, title: 'Notes' })
 */

import fs from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

function parseArgs(argv) {
  const args = { width: 80, input: null, output: null, title: null, wrap: true, normalizeHeadings: true, debug: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = (v) => (v === undefined ? true : v);
    if (a === '--input' || a === '-i') args.input = argv[++i];
    else if (a === '--output' || a === '-o') args.output = argv[++i];
    else if (a === '--width' || a === '-w') args.width = parseInt(argv[++i], 10) || 80;
    else if (a === '--title' || a === '-t') args.title = argv[++i];
    else if (a === '--no-wrap') args.wrap = false;
    else if (a === '--wrap') args.wrap = true;
    else if (a === '--normalize-headings') args.normalizeHeadings = true;
    else if (a === '--no-normalize-headings') args.normalizeHeadings = false;
    else if (a === '--debug') args.debug = true;
    else if (a === '--help' || a === '-h') {
      console.log(helpText());
      process.exit(0);
    } else {
      // Support --key=value
      const m = a.match(/^--([^=]+)=(.*)$/);
      if (m) {
        const k = m[1];
        const v = m[2];
        if (k === 'input') args.input = v;
        else if (k === 'output') args.output = v;
        else if (k === 'width') args.width = parseInt(v, 10) || 80;
        else if (k === 'title') args.title = v;
        else if (k === 'wrap') args.wrap = v !== 'false';
        else if (k === 'normalize-headings') args.normalizeHeadings = v !== 'false';
        else if (k === 'debug') args.debug = v !== 'false';
      }
    }
  }
  return args;
}

function helpText() {
  return `Markdown Formatter (CLI)

Usage:
  node markdown_formatter.mjs [--input file] [--output file] [--width N] [--title "H1"] [--wrap|--no-wrap] [--normalize-headings|--no-normalize-headings]

Examples:
  node markdown_formatter.mjs --input notes.txt --output notes.md --width 88 --title "Meeting Notes"
  cat notes.txt | node markdown_formatter.mjs > notes.md
`;
}

// Utility: check for URL-like tokens
const URL_RE = /\bhttps?:\/\/[^\s)\]}>,;]+/g;

function autolink(line) {
  return line.replace(URL_RE, (m) => {
    // If already inside <> or markdown link, leave it
    if (m.startsWith('<') && m.endsWith('>')) return m;
    return `<${m}>`;
  });
}

function isAllCapsHeading(line) {
  const trimmed = line.trim();
  if (trimmed.length < 4) return false;
  if (trimmed.length > 80) return false;
  // Must contain letters and be mostly uppercase (allow digits and punctuation)
  const letters = trimmed.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = letters.replace(/[A-Z]/g, '').length === 0;
  // Avoid lines ending with a period that look like sentences
  return upper && !/[.!?]$/.test(trimmed);
}

function normalizeListLine(line) {
  // Numbered lists: 1. text, 1) text, (1) text
  let m = line.match(/^\s*(?:\(?([0-9]+)\)|([0-9]+)[.)])\s+(.*)$/);
  if (m) {
    const n = m[1] || m[2];
    return `${n}. ${m[3]}`;
  }
  // Bulleted lists: -, *, •, ·, –, —
  m = line.match(/^\s*([\-*•·–—])\s+(.*)$/);
  if (m) {
    return `- ${m[2]}`;
  }
  return null;
}

function isFence(line) {
  return /^\s*```/.test(line);
}

function looksLikeCode(line) {
  return /^\s{4,}|\t/.test(line);
}

function wrapParagraph(text, width) {
  if (width <= 0) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  let line = '';
  for (const w of words) {
    if (line.length === 0) {
      line = w;
    } else if ((line.length + 1 + w.length) <= width) {
      line += ' ' + w;
    } else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out.join('\n');
}

function titleCasePreserveAcronyms(s) {
  return s.replace(/\w[^\s-]*/g, (word) => {
    // Preserve all-caps tokens of length <= 5 (likely acronyms)
    if (/^[A-Z0-9]{2,5}$/.test(word)) return word;
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });
}

export function formatMarkdownText(input, opts = {}) {
  const {
    width = 80,
    title = null,
    wrap = true,
    normalizeHeadings = true,
    debug = false,
  } = opts;

  const lines = String(input).replace(/\r\n?/g, '\n').split('\n');

  const out = [];
  let i = 0;
  let inFence = false;
  let para = [];

  function flushPara() {
    if (para.length === 0) return;
    let text = para.join(' ').replace(/\s+/g, ' ').trim();
    if (wrap) text = wrapParagraph(text, width);
    out.push(text);
    para = [];
  }

  // Optional title
  if (title) {
    out.push('# ' + title);
    out.push('');
  }

  // Pass 1: convert setext headings and gather all lines
  // We will scan with lookahead to detect === or --- underlines
  const normalized = [];
  while (i < lines.length) {
    const line = lines[i];
    const next = i + 1 < lines.length ? lines[i + 1] : '';
    if (normalizeHeadings) {
      if (/^\s*(=){3,}\s*$/.test(next) && line.trim()) {
        normalized.push('# ' + line.trim());
        i += 2;
        continue;
      }
      if (/^\s*(-){3,}\s*$/.test(next) && line.trim()) {
        normalized.push('## ' + line.trim());
        i += 2;
        continue;
      }
      if (isAllCapsHeading(line)) {
        normalized.push('## ' + titleCasePreserveAcronyms(line.trim()));
        i += 1;
        // Skip following blank line if present
        if (/^\s*$/.test(lines[i] || '')) i += 1;
        continue;
      }
    }
    normalized.push(line);
    i += 1;
  }

  // Pass 2: build paragraphs, code blocks, lists, blockquotes
  for (const raw of normalized) {
    let line = raw;

    if (isFence(line)) {
      flushPara();
      inFence = !inFence;
      out.push(line.trim());
      continue;
    }

    if (inFence) {
      out.push(line);
      continue;
    }

    // Autolink
    line = autolink(line);

    // Code block by indentation
    if (looksLikeCode(line)) {
      flushPara();
      out.push('```');
      out.push(line.replace(/^\s{4}|^\t/, ''));
      // Collapse consecutive indented lines into same fence
      // Note: handled implicitly by consecutive iterations
      // We will close the fence when the next non-indented line appears
      continue;
    }

    // Close a code fence if previous line was indented and we started one
    const prev = out[out.length - 1];
    if (prev && prev !== '```' && out[out.length - 2] === '```' && !looksLikeCode(line)) {
      out.push('```');
    }

    // Blank line: flush paragraph
    if (/^\s*$/.test(line)) {
      flushPara();
      out.push('');
      continue;
    }

    // Headings already normalized in pass 1: keep as-is if starting with #
    if (/^\s*#[#\s]/.test(line)) {
      flushPara();
      out.push(line.trim());
      continue;
    }

    // Blockquote normalization: "quote: ..." -> "> ..."
    const quoteMatch = line.match(/^\s*quote:\s*(.*)$/i);
    if (quoteMatch) {
      flushPara();
      out.push('> ' + quoteMatch[1]);
      continue;
    }

    // Existing blockquotes pass through
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      out.push(line.replace(/^\s*>\s?/, '> '));
      continue;
    }

    // Lists
    const list = normalizeListLine(line);
    if (list) {
      flushPara();
      out.push(list);
      continue;
    }

    // Otherwise, accumulate into paragraph
    para.push(line.trim());
  }

  // Finalize
  flushPara();

  // Close dangling fenced block opened by indents
  if (out[out.length - 1] === '```') {
    out.push('```');
  }

  // Remove excessive blank lines (max 2)
  const compacted = [];
  let blankCount = 0;
  for (const l of out) {
    if (l.trim() === '') {
      blankCount++;
      if (blankCount <= 2) compacted.push('');
    } else {
      blankCount = 0;
      compacted.push(l);
    }
  }

  const result = compacted.join('\n');
  if (debug) {
    return result + '\n\n<!-- debug: width=' + width + ', wrap=' + wrap + ', normalizeHeadings=' + normalizeHeadings + ' -->\n';
  }
  return result;
}

async function runCli() {
  const args = parseArgs(process.argv);
  let input = '';
  if (args.input) {
    input = await fs.readFile(args.input, 'utf8');
  } else {
    // Read from stdin
    input = await new Promise((resolve) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => resolve(data));
      if (process.stdin.isTTY) resolve('');
    });
  }

  const output = formatMarkdownText(input, {
    width: args.width,
    title: args.title,
    wrap: args.wrap,
    normalizeHeadings: args.normalizeHeadings,
    debug: args.debug,
  });

  if (args.output) {
    await fs.writeFile(args.output, output, 'utf8');
  } else {
    process.stdout.write(output + '\n');
  }
}

const invokedAsScript = (() => {
  const thisUrl = import.meta.url;
  const argv1 = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
  return thisUrl === argv1;
})();

if (invokedAsScript) {
  runCli().catch((err) => {
    console.error('Error:', err?.stack || err?.message || String(err));
    process.exit(1);
  });
}

