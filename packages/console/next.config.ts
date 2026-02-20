import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const monorepoRoot = path.resolve(__dirname, "../..");
const dtSymlink = path.resolve(__dirname, "../data-terminal");

// Turbopack's filesystem root must encompass both the monorepo and
// data-terminal's real path (symlinked from outside the monorepo).
// Compute the closest common ancestor of their real paths.
const monorepoReal = fs.realpathSync(monorepoRoot);
const dtReal = fs.realpathSync(dtSymlink);
const monoParts = monorepoReal.split(path.sep);
const dtParts = dtReal.split(path.sep);
const commonParts: string[] = [];
for (
  let i = 0;
  i < Math.min(monoParts.length, dtParts.length);
  i++
) {
  if (monoParts[i] === dtParts[i]) commonParts.push(monoParts[i]);
  else break;
}
const turboRoot = commonParts.join(path.sep) || path.sep;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  outputFileTracingRoot: turboRoot,
  transpilePackages: ["data-terminal"],
  turbopack: {
    root: turboRoot,
    resolveAlias: {
      // CSS @import "tailwindcss" breaks with expanded root because
      // node_modules resolution starts from the wrong directory.
      tailwindcss: path.join(__dirname, "node_modules/tailwindcss"),
      // @dt/* aliases resolve to data-terminal workspace package.
      "@dt/atoms": "../data-terminal/src/atoms",
      "@dt/molecules": "../data-terminal/src/molecules",
      "@dt/hooks": "../data-terminal/src/hooks",
      "@dt/providers": "../data-terminal/src/providers",
      "@dt/lib": "../data-terminal/src/lib",
      "@dt/types": "../data-terminal/src/types",
      // @aleph-sdk/message transitively imports `ws` which requires
      // Node.js built-ins unavailable in the browser bundle.
      fs: "./src/lib/empty-module.ts",
      net: "./src/lib/empty-module.ts",
      tls: "./src/lib/empty-module.ts",
      os: "./src/lib/empty-module.ts",
      "node:path": "./src/lib/empty-module.ts",
    },
  },
};

export default nextConfig;
