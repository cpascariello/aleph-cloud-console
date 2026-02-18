import type { NextConfig } from "next";
import path from "node:path";
import fs from "node:fs";

// Turbopack rejects symlinks that point outside the filesystem root.
// packages/data-terminal is a symlink to an external repo, so we widen
// the root to the nearest common ancestor of both paths.
const monorepoRoot = path.resolve(__dirname, "../..");
const dtPath = path.resolve(__dirname, "../data-terminal");
const dtStat = fs.lstatSync(dtPath);
const dtTarget = dtStat.isSymbolicLink() ? fs.readlinkSync(dtPath) : dtPath;
const monoSegments = monorepoRoot.split(path.sep);
const dtSegments = dtTarget.split(path.sep);
const shared: string[] = [];
for (let i = 0; i < Math.min(monoSegments.length, dtSegments.length); i++) {
  if (monoSegments[i] === dtSegments[i]) shared.push(monoSegments[i]!);
  else break;
}
const fsRoot = shared.join(path.sep) || path.sep;

const nextConfig: NextConfig = {
  outputFileTracingRoot: fsRoot,
  transpilePackages: ["data-terminal"],
  // Wider filesystem root causes next build's tsc to pick up
  // data-terminal type errors (duplicate @types/react Ref types).
  // Console's `pnpm typecheck` filters these properly.
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    resolveAlias: {
      "@dt/atoms": "../data-terminal/src/atoms",
      "@dt/molecules": "../data-terminal/src/molecules",
      "@dt/hooks": "../data-terminal/src/hooks",
      "@dt/lib": "../data-terminal/src/lib",
      "@dt/providers": "../data-terminal/src/providers",
      "@dt/types": "../data-terminal/src/types",
      fs: { browser: "./src/lib/empty.ts" },
      net: { browser: "./src/lib/empty.ts" },
      tls: { browser: "./src/lib/empty.ts" },
      os: { browser: "./src/lib/empty.ts" },
      path: { browser: "./src/lib/empty.ts" },
    },
  },
};

export default nextConfig;
