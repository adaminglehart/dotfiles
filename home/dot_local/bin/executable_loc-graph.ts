#!/usr/bin/env bun

// Graphs lines of code in a git repo over time with monthly granularity.
// Uses tokei for counting and renders a bar chart in the terminal.
//
// Usage:
//   loc-graph [repo-path] [options]
//
// Options:
//   --lang <lang>     Filter to a specific language (e.g. TypeScript, Rust)
//   --months <n>      How many months back to graph (default: 24)
//   --width <n>       Chart width in characters (default: terminal width)
//   --metric <m>      One of: code, lines, comments, blanks (default: code)

import { execSync, spawnSync } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { resolve, join } from "path";
import { tmpdir } from "os";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Options {
  repoPath: string;
  lang: string | null;
  months: number;
  width: number;
  metric: "code" | "lines" | "comments" | "blanks";
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const opts: Options = {
    repoPath: ".",
    lang: null,
    months: 24,
    width: process.stdout.columns ?? 80,
    metric: "code",
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--lang") opts.lang = args[++i];
    else if (a === "--months") opts.months = parseInt(args[++i], 10);
    else if (a === "--width") opts.width = parseInt(args[++i], 10);
    else if (a === "--metric") {
      const m = args[++i];
      if (m === "code" || m === "lines" || m === "comments" || m === "blanks") {
        opts.metric = m;
      } else {
        die(`Unknown metric "${m}". Use: code, lines, comments, blanks`);
      }
    } else if (!a.startsWith("--")) {
      opts.repoPath = a;
    }
  }

  opts.repoPath = resolve(opts.repoPath);
  return opts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function die(msg: string): never {
  console.error(`\x1b[31merror:\x1b[0m ${msg}`);
  process.exit(1);
}

function run(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Git: collect one commit SHA per month
// ---------------------------------------------------------------------------

interface MonthPoint {
  label: string; // "2024-03"
  sha: string;
}

function getMonthlyCommits(repoPath: string, months: number): MonthPoint[] {
  const points: MonthPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const label = `${year}-${month}`;

    // Last commit on or before end-of-month
    const nextMonth = new Date(year, d.getMonth() + 1, 1);
    const before = nextMonth.toISOString().split("T")[0];

    const sha = run(
      `git log --before="${before}" --format="%H" -1`,
      repoPath
    );

    if (sha) points.push({ label, sha });
  }

  return points;
}

// ---------------------------------------------------------------------------
// Tokei: count lines at a given commit
// ---------------------------------------------------------------------------

interface TokeiLanguage {
  code: number;
  comments: number;
  blanks: number;
  reports: Array<{ name: string; stats: { code: number; comments: number; blanks: number } }>;
  children: Record<string, TokeiLanguage[]>;
}

type TokeiOutput = Record<string, TokeiLanguage>;

function countAtCommit(repoPath: string, sha: string, lang: string | null, metric: Options["metric"]): number {
  const tmpDir = join(tmpdir(), `loc-graph-${sha.slice(0, 8)}-${process.pid}`);
  try {
    mkdirSync(tmpDir, { recursive: true });

    // Extract the commit into a temp directory
    const extract = spawnSync(
      "git",
      ["archive", "--format=tar", sha],
      { cwd: repoPath, maxBuffer: 512 * 1024 * 1024 }
    );
    if (extract.status !== 0) return 0;

    const untar = spawnSync("tar", ["-x", "-C", tmpDir], {
      input: extract.stdout,
      maxBuffer: 512 * 1024 * 1024,
    });
    if (untar.status !== 0) return 0;

    const tokeiArgs = ["--output", "json"];
    if (lang) tokeiArgs.push("--types", lang);
    tokeiArgs.push(tmpDir);

    const tokei = spawnSync("tokei", tokeiArgs, {
      maxBuffer: 64 * 1024 * 1024,
      encoding: "utf8",
    });

    if (tokei.status !== 0 || !tokei.stdout) return 0;

    let parsed: TokeiOutput;
    try {
      parsed = JSON.parse(tokei.stdout) as TokeiOutput;
    } catch {
      return 0;
    }

    let total = 0;
    for (const [name, data] of Object.entries(parsed)) {
      if (name === "Total") continue;
      if (lang && name.toLowerCase() !== lang.toLowerCase()) continue;
      total += data[metric];
    }
    return total;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

interface DataPoint {
  label: string;
  value: number;
}

function renderChart(points: DataPoint[], metric: string, width: number): void {
  if (points.length === 0) {
    console.log("No data to display.");
    return;
  }

  const maxValue = Math.max(...points.map((p) => p.value));
  const minValue = Math.min(...points.map((p) => p.value));
  const labelWidth = points[0].label.length; // "2024-03" = 7
  const valueWidth = String(maxValue).length;

  // Reserve space for: "  YYYY-MM  " + value label + space
  const reserved = labelWidth + valueWidth + 4;
  const barMax = Math.max(10, width - reserved);

  // Color gradient: dim for low, bright cyan for high
  const color = (v: number): string => {
    if (maxValue === 0) return "\x1b[36m";
    const ratio = v / maxValue;
    if (ratio > 0.85) return "\x1b[96m"; // bright cyan
    if (ratio > 0.6) return "\x1b[36m";  // cyan
    if (ratio > 0.35) return "\x1b[34m"; // blue
    return "\x1b[90m";                    // dim
  };

  const reset = "\x1b[0m";
  const dim = "\x1b[2m";

  console.log();
  console.log(
    `  ${dim}Lines of ${metric} per month${reset}` +
    (minValue === 0 && maxValue === 0 ? " (no data)" : "")
  );
  console.log();

  for (const { label, value } of points) {
    const barLen = maxValue > 0 ? Math.round((value / maxValue) * barMax) : 0;
    const bar = "█".repeat(barLen);
    const valueStr = String(value).padStart(valueWidth);
    console.log(
      `  ${dim}${label}${reset}  ${color(value)}${bar}${reset}  ${dim}${valueStr}${reset}`
    );
  }

  console.log();

  // Summary stats
  const nonZero = points.filter((p) => p.value > 0);
  if (nonZero.length >= 2) {
    const first = nonZero[0];
    const last = nonZero[nonZero.length - 1];
    const delta = last.value - first.value;
    const sign = delta >= 0 ? "+" : "";
    const pct = first.value > 0
      ? ` (${sign}${((delta / first.value) * 100).toFixed(1)}%)`
      : "";
    console.log(
      `  ${dim}${first.label} → ${last.label}:  ` +
      `${first.value.toLocaleString()} → ${last.value.toLocaleString()}  ` +
      `${sign}${delta.toLocaleString()}${pct}${reset}`
    );
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const opts = parseArgs();

// Verify it's a git repo
const gitCheck = run("git rev-parse --is-inside-work-tree", opts.repoPath);
if (gitCheck !== "true") die(`${opts.repoPath} is not a git repository`);

// Verify tokei is available
const tokeiCheck = spawnSync("tokei", ["--version"]);
if (tokeiCheck.status !== 0) die("tokei not found — install with: brew install tokei");

console.log(`\x1b[2mScanning ${opts.repoPath} (${opts.months} months)...\x1b[0m`);

const monthPoints = getMonthlyCommits(opts.repoPath, opts.months);
if (monthPoints.length === 0) die("No commits found in the requested range");

const data: DataPoint[] = [];
let i = 0;
for (const { label, sha } of monthPoints) {
  i++;
  process.stderr.write(`\r\x1b[2m  [${i}/${monthPoints.length}] ${label}\x1b[0m`);
  const value = countAtCommit(opts.repoPath, sha, opts.lang, opts.metric);
  data.push({ label, value });
}
process.stderr.write("\r\x1b[2K"); // clear progress line

renderChart(data, opts.metric, opts.width);
