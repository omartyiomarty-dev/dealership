/**
 * Node resolve hooks that let unit tests import the real TypeScript sources:
 *  1. map the "@/..." alias used by the app onto src/
 *  2. allow extensionless relative imports ("./x" → "./x.ts")
 * This way tests exercise production code instead of a duplicated copy.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

function withTs(specifier, parentPath) {
  if (!parentPath) return null;
  const base = new URL(".", pathToFileURL(parentPath).href);
  const candidate = fileURLToPath(new URL(specifier + ".ts", base));
  return existsSync(candidate) ? candidate : null;
}

export async function resolve(specifier, context, next) {
  const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : undefined;

  if (specifier.startsWith("@/")) {
    const target = fileURLToPath(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url));
    return next(target, { ...context, parentURL: undefined });
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]s$/.test(specifier)) {
    const resolved = withTs(specifier, parentPath);
    if (resolved) return next(resolved, { ...context, parentURL: undefined });
  }
  return next(specifier, context);
}
