#!/usr/bin/env bun

// Exports the current Claude Code session JSONL to a markdown file
// in the Obsidian agents vault for indexing by QMD.
//
// Reads session_id from hook JSON on stdin, falls back to
// most recently modified JSONL if run manually.
// Idempotent — re-running overwrites the same output file.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "fs";
import { execSync } from "child_process";
import { join, basename } from "path";
import { homedir } from "os";

const VAULT_SESSIONS = join(homedir(), "Documents/obsidian/agents/sessions");
const PROJECTS_DIR = join(homedir(), ".claude/projects");

interface Message {
  type: string;
  message?: {
    role: string;
    content: string | ContentBlock[];
  };
  timestamp?: string;
  cwd?: string;
  sessionId?: string;
  gitBranch?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
}

function readStdinSync(): string {
  try {
    return readFileSync("/dev/stdin", "utf-8");
  } catch {
    return "";
  }
}

function getSessionIdFromStdin(): string | null {
  const input = readStdinSync();
  if (!input) return null;
  try {
    const data = JSON.parse(input);
    return data.session_id || null;
  } catch {
    return null;
  }
}

function getSessionId(): string {
  // Try hook stdin JSON first, then env var fallback for manual runs
  const fromStdin = getSessionIdFromStdin();
  if (fromStdin) return fromStdin;

  const fromEnv = process.env.CLAUDE_SESSION_ID;
  if (fromEnv) return fromEnv;

  // Fallback: find most recently modified JSONL in projects dir
  let newest = { path: "", mtime: 0 };
  for (const projectDir of readdirSync(PROJECTS_DIR)) {
    const dir = join(PROJECTS_DIR, projectDir);
    try {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".jsonl")) continue;
        const stat = Bun.file(join(dir, file));
        // Use the file itself
      }
    } catch {}
  }

  // Try flat JSONL files in each project dir
  for (const projectDir of readdirSync(PROJECTS_DIR)) {
    const projectPath = join(PROJECTS_DIR, projectDir);
    try {
      const files = readdirSync(projectPath).filter((f) =>
        f.endsWith(".jsonl"),
      );
      for (const file of files) {
        const filePath = join(projectPath, file);
        const stat = Bun.file(filePath);
        if (stat.lastModified > newest.mtime) {
          newest = { path: filePath, mtime: stat.lastModified };
        }
      }
    } catch {}
  }

  if (newest.path) {
    return basename(newest.path, ".jsonl");
  }

  console.error("No CLAUDE_SESSION_ID set and no JSONL files found");
  process.exit(1);
}

function findJsonlFile(sessionId: string): string | null {
  // Search all project directories for matching JSONL
  for (const projectDir of readdirSync(PROJECTS_DIR)) {
    const candidate = join(PROJECTS_DIR, projectDir, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function extractText(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text!)
    .join("\n");
}

function main() {
  const sessionId = getSessionId();
  const jsonlPath = findJsonlFile(sessionId);
  if (!jsonlPath) {
    console.error(`No JSONL file found for session ${sessionId}`);
    process.exit(1);
  }

  const lines = readFileSync(jsonlPath, "utf-8").split("\n").filter(Boolean);
  const messages: { role: string; text: string; timestamp: string }[] = [];
  let cwd = "";
  let gitBranch = "";
  let firstTimestamp = "";
  let projectDir = "";

  for (const line of lines) {
    let obj: Message;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    if (!obj.message?.role) continue;
    if (!firstTimestamp && obj.timestamp) firstTimestamp = obj.timestamp;
    if (obj.cwd && !cwd) cwd = obj.cwd;
    if (obj.gitBranch && !gitBranch) gitBranch = obj.gitBranch;

    const role = obj.message.role;
    if (role === "user") {
      const text = extractText(obj.message.content);
      // Skip tool results and empty messages
      if (!text.trim()) continue;
      messages.push({ role: "user", text, timestamp: obj.timestamp || "" });
    } else if (role === "assistant") {
      const text = extractText(obj.message.content);
      if (!text.trim()) continue;
      messages.push({
        role: "assistant",
        text,
        timestamp: obj.timestamp || "",
      });
    }
  }

  if (messages.length === 0) {
    console.log("No messages to export");
    process.exit(0);
  }

  // Derive project from the JSONL parent directory name
  const parentDir = basename(join(jsonlPath, ".."));
  projectDir = parentDir.replace(/^-/, "/").replace(/-/g, "/");

  const date = new Date(firstTimestamp);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const timeStr = `${pad(date.getHours())}-${pad(date.getMinutes())}`;
  const shortId = sessionId.slice(0, 8);
  const filename = `${dateStr}_${timeStr}_${shortId}.md`;

  // Build markdown
  const frontmatter = [
    "---",
    `date: "${firstTimestamp}"`,
    `session_id: "${sessionId}"`,
    `project: "${projectDir}"`,
    `working_directory: "${cwd}"`,
    `git_branch: "${gitBranch}"`,
    `message_count: ${messages.length}`,
    "---",
  ].join("\n");

  const body = messages
    .map((m) => {
      const prefix = m.role === "user" ? "## User" : "## Assistant";
      return `${prefix}\n\n${m.text}`;
    })
    .join("\n\n---\n\n");

  const markdown = `${frontmatter}\n\n# Session ${dateStr}\n\n${body}\n`;

  mkdirSync(VAULT_SESSIONS, { recursive: true });
  const outPath = join(VAULT_SESSIONS, filename);
  writeFileSync(outPath, markdown);
  console.log(`Exported ${messages.length} messages to ${outPath}`);

  // Re-index QMD
  try {
    execSync("qmd update", { stdio: "inherit", timeout: 30000 });
  } catch {
    // QMD not available or not configured yet — not fatal
  }
}

main();
