import { $ } from "bun";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

const IMAGE_NAME = "pi-sandbox:latest";
const BUILD_SCRIPT = `${process.env.HOME}/.pi/sandbox/build.sh`;
const SECRETS_FILE = `${process.env.HOME}/.pi/agent-secrets.env`;
const SESSIONS_DIR = `${process.env.HOME}/.pi/agent/sessions`;
const LEARNINGS_DIR = `${process.env.HOME}/Documents/obsidian/agents/learnings`;
const OP_CACHE_DIR = `${process.env.HOME}/.cache/op_env`;
const OP_CACHE_TTL_HOURS = parseInt(process.env.OP_CACHE_TTL_HOURS ?? "24", 10);

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4-6";

export interface NewSessionOptions {
  name: string;
  model?: string;
  dir?: string;
  sandbox?: boolean;
  worktreeBranch?: string;
}

async function imageExists(): Promise<boolean> {
  const result = await $`docker image inspect ${IMAGE_NAME}`.quiet().nothrow();
  return result.exitCode === 0;
}

async function buildImage(): Promise<void> {
  if (!existsSync(BUILD_SCRIPT)) {
    throw new Error(`Docker image ${IMAGE_NAME} missing and build script not found at ${BUILD_SCRIPT}`);
  }
  console.error(`Docker image ${IMAGE_NAME} is missing. Building now...`);
  await $`bash ${BUILD_SCRIPT} ${IMAGE_NAME}`;
}

async function ensurePrereqs(): Promise<void> {
  await mkdir(SESSIONS_DIR, { recursive: true });
  await mkdir(LEARNINGS_DIR, { recursive: true });

  if (!existsSync(SECRETS_FILE)) {
    throw new Error(`Missing secrets file: ${SECRETS_FILE}`);
  }

  if (!(await imageExists())) {
    await buildImage();
  }
}

function cacheKeyFor(ref: string): string {
  return `${OP_CACHE_DIR}/${ref.replace(/\//g, "_")}`;
}

async function opCachedResolve(ref: string): Promise<string> {
  const cacheFile = cacheKeyFor(ref);

  if (existsSync(cacheFile)) {
    const stat = await Bun.file(cacheFile).stat();
    const ageHours = (Date.now() - stat.mtime.getTime()) / (1000 * 3600);
    if (ageHours < OP_CACHE_TTL_HOURS) {
      return await Bun.file(cacheFile).text();
    }
  }

  try {
    const result = await $`echo ${ref} | op inject`.quiet();
    const value = result.stdout.toString().trim();
    await mkdir(OP_CACHE_DIR, { recursive: true });
    await Bun.write(cacheFile, value);
    await $`chmod 600 ${cacheFile}`.quiet();
    return value;
  } catch {
    if (existsSync(cacheFile)) {
      console.error(`Warning: 1Password unavailable, using stale cached secret for ${ref}`);
      return await Bun.file(cacheFile).text();
    }
    throw new Error(`Failed to fetch secret from 1Password: ${ref}`);
  }
}

async function resolveSecretsToEnvArgs(): Promise<string[]> {
  const args: string[] = [];
  const content = await Bun.file(SECRETS_FILE).text();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const ref = trimmed.slice(eqIdx + 1).trim();

    const value = ref.startsWith("op://") ? await opCachedResolve(ref) : ref;
    args.push("-e", `${key}=${value}`);
  }

  return args;
}

async function createWorktree(startDir: string, branch: string, name: string): Promise<string> {
  const repoRoot = (await $`git -C ${startDir} rev-parse --show-toplevel`.quiet().nothrow()).stdout.toString().trim();
  if (!repoRoot) throw new Error("Cannot create a worktree outside of a git repository.");

  const worktreeDir = `${repoRoot}/.worktrees/${name}`;
  if (existsSync(worktreeDir)) throw new Error(`Worktree path already exists: ${worktreeDir}`);

  await mkdir(`${repoRoot}/.worktrees`, { recursive: true });

  const branchExists = (await $`git -C ${repoRoot} rev-parse --verify ${branch}`.quiet().nothrow()).exitCode === 0;
  if (branchExists) {
    await $`git -C ${repoRoot} worktree add ${worktreeDir} ${branch}`;
  } else {
    await $`git -C ${repoRoot} worktree add -b ${branch} ${worktreeDir}`;
  }

  return worktreeDir;
}

export function containerName(sessionName: string): string {
  return `pi-${sessionName}`;
}

export async function buildDockerCommand(opts: NewSessionOptions): Promise<string[]> {
  const model = opts.model ?? DEFAULT_MODEL;
  const cname = containerName(opts.name);

  const envArgs = await resolveSecretsToEnvArgs();
  const workdir = opts.dir ?? process.cwd();

  return [
    "docker", "run", "--rm", "-it", "--name", cname,
    "-v", `${workdir}:/workspace`,
    "-v", `${SESSIONS_DIR}:/home/dev/.pi/agent/sessions`,
    "-v", `${LEARNINGS_DIR}:/home/dev/.pi/agent/self-learning-memory`,
    "-v", `${process.env.HOME}/.cache/qmd:/home/dev/.cache/qmd`,
    "-v", `${process.env.HOME}/.gitconfig:/home/dev/.gitconfig:ro`,
    "-v", `${process.env.HOME}/AGENTS.md:/home/dev/AGENTS.md:ro`,
    ...envArgs,
    "-w", "/workspace",
    IMAGE_NAME,
    "--model", model,
  ];
}

export async function killContainer(name: string): Promise<void> {
  await $`docker rm -f ${containerName(name)}`.quiet().nothrow();
}

export async function prepareSession(opts: NewSessionOptions): Promise<{ workdir: string; command: string[] }> {
  let workdir = opts.dir ? await resolveDir(opts.dir) : process.cwd();

  if (opts.sandbox !== false) {
    await ensurePrereqs();
    startQmdRefresh();

    if (opts.worktreeBranch) {
      workdir = await createWorktree(workdir, opts.worktreeBranch, opts.name);
    }

    const command = await buildDockerCommand({ ...opts, dir: workdir });
    return { workdir, command };
  } else {
    const model = opts.model ?? DEFAULT_MODEL;
    return { workdir, command: ["pi", "--model", model] };
  }
}

async function resolveDir(dir: string): Promise<string> {
  if (!existsSync(dir)) throw new Error(`Directory does not exist: ${dir}`);
  return (await $`cd ${dir} && pwd -P`.quiet()).stdout.toString().trim();
}

function startQmdRefresh(): void {
  Bun.spawn(["qmd", "update", "--collection", "agent-learnings"], {
    stdout: "ignore",
    stderr: "ignore",
  });
}
