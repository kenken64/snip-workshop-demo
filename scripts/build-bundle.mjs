import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = join(repoRoot, "bundle");
const frontendDir = join(repoRoot, "frontend");
const frontendBuildDir = join(frontendDir, "dist", "snip-frontend", "browser");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const npxCommand = isWindows ? "npx.cmd" : "npx";
const gitCommand = "git";
const shouldPush = process.argv.slice(2).length === 1 && process.argv[2] === "--push";

if (process.argv.slice(2).length > 0 && !shouldPush) {
  throw new Error("Usage: node scripts/build-bundle.mjs [--push]");
}

function run(command, args, cwd) {
  console.log(`$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });
}

function hasStagedChanges(cwd, paths) {
  const result = spawnSync(gitCommand, ["diff", "--cached", "--quiet", "--", ...paths], {
    cwd,
    env: process.env,
    stdio: "ignore",
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status === 0) {
    return false;
  }
  if (result.status === 1) {
    return true;
  }

  throw new Error(`git diff failed with exit code ${result.status}`);
}

function writeGeneratedFile(path, contents) {
  writeFileSync(path, contents, "utf8");
}

function generateBundle() {
  run(gitCommand, ["submodule", "update", "--init", "--remote", "backend", "frontend", "cli"], repoRoot);

  run(npmCommand, ["install"], frontendDir);
  run(npxCommand, ["ng", "build"], frontendDir);

  const frontendIndex = join(frontendBuildDir, "index.html");
  if (!existsSync(frontendIndex)) {
    throw new Error(`Frontend build output is missing: ${frontendIndex}`);
  }

  copyFileSync(join(repoRoot, "backend", "server.js"), join(bundleDir, "server.js"));
  copyFileSync(join(repoRoot, "cli", "cli.js"), join(bundleDir, "cli.js"));

  const publicDir = join(bundleDir, "public");
  rmSync(publicDir, { force: true, recursive: true });
  cpSync(frontendBuildDir, publicDir, { recursive: true });

  writeGeneratedFile(join(bundleDir, ".env"), "PUBLIC_DIR=./public\n");
  writeGeneratedFile(
    join(bundleDir, "package.json"),
    `${JSON.stringify({
      name: "snip-bundle",
      private: true,
      scripts: { start: "bun server.js" },
    }, null, 2)}\n`,
  );
  writeGeneratedFile(
    join(bundleDir, "Dockerfile"),
    [
      "FROM oven/bun:1-alpine",
      "COPY . .",
      "ENV PORT=3000",
      "EXPOSE 3000",
      "CMD [\"bun\", \"server.js\"]",
      "",
    ].join("\n"),
  );
  writeGeneratedFile(
    join(bundleDir, ".dockerignore"),
    [
      ".git",
      ".gitmodules",
      "node_modules",
      "npm-debug.log",
      "*.log",
      "",
    ].join("\n"),
  );
  writeGeneratedFile(
    join(bundleDir, "railway.json"),
    `${JSON.stringify({
      "$schema": "https://railway.com/railway.schema.json",
      build: { builder: "DOCKERFILE" },
    }, null, 2)}\n`,
  );
}

function commitBundle() {
  run(gitCommand, ["add", "-A"], bundleDir);
  if (!hasStagedChanges(bundleDir, ["."])) {
    console.log("bundle: unchanged (nothing to commit)");
    return false;
  }

  run(gitCommand, ["commit", "-m", "Regenerate bundle"], bundleDir);
  return true;
}

function commitMainPointers() {
  const submodulePaths = [".gitmodules", "backend", "frontend", "cli", "bundle"];
  run(gitCommand, ["add", ...submodulePaths], repoRoot);
  if (!hasStagedChanges(repoRoot, submodulePaths)) {
    console.log("main: unchanged (nothing to commit)");
    return false;
  }

  run(gitCommand, ["commit", "-m", "Update source and bundle submodules", "--", ...submodulePaths], repoRoot);
  return true;
}

try {
  generateBundle();
  commitBundle();
  commitMainPointers();

  if (shouldPush) {
    run(gitCommand, ["push", "origin", "HEAD:bundle"], bundleDir);
    run(gitCommand, ["push", "origin", "main"], repoRoot);
  } else {
    console.log("Not pushing; rerun with --push to publish bundle and main.");
  }
} catch (error) {
  console.error(`build-bundle: ${error.message}`);
  process.exitCode = 1;
}
