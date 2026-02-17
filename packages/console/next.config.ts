import type { NextConfig } from "next";
import path from "node:path";
import type { ResolvePluginInstance, Resolver } from "webpack";

const monorepoRoot = path.resolve(__dirname, "../..");
const dtRoot = path.resolve(__dirname, "../data-terminal/src");

/**
 * Webpack resolver plugin that contextually resolves @/ imports.
 *
 * Files inside data-terminal resolve @/ to data-terminal/src/.
 * Files inside console resolve @/ to console/src/ (default behavior).
 */
class ContextualAliasPlugin implements ResolvePluginInstance {
  apply(resolver: Resolver): void {
    const target = resolver.ensureHook("resolve");

    resolver
      .getHook("described-resolve")
      .tapAsync(
        "ContextualAliasPlugin",
        (request, resolveContext, callback) => {
          const innerRequest = request.request;
          if (!innerRequest?.startsWith("@/")) {
            return callback();
          }

          const issuer = request.path;
          if (!issuer) {
            return callback();
          }

          const realIssuer = issuer.replace(/\/node_modules\/.*$/, "");
          const isFromDataTerminal = realIssuer.includes("data-terminal/src");

          if (!isFromDataTerminal) {
            return callback();
          }

          const newRequest = innerRequest.replace(
            "@/",
            dtRoot + "/",
          );

          const newResolveRequest = {
            ...request,
            request: newRequest,
          };

          resolver.doResolve(
            target,
            newResolveRequest,
            `ContextualAliasPlugin: @/ → ${dtRoot}/ for data-terminal source`,
            resolveContext,
            callback,
          );
        },
      );
  }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: ["data-terminal"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@dt/atoms": path.join(dtRoot, "atoms"),
      "@dt/molecules": path.join(dtRoot, "molecules"),
      "@dt/hooks": path.join(dtRoot, "hooks"),
      "@dt/providers": path.join(dtRoot, "providers"),
      "@dt/lib": path.join(dtRoot, "lib"),
      "@dt/types": path.join(dtRoot, "types"),
    };
    config.resolve.symlinks = true;
    config.resolve.plugins = [
      ...(config.resolve.plugins ?? []),
      new ContextualAliasPlugin(),
    ];
    return config;
  },
};

export default nextConfig;
