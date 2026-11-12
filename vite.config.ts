import ultraciteFmt from "ultracite/oxfmt";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import drizzle from "ultracite/oxlint/drizzle";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import playwright from "ultracite/oxlint/playwright";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";
import vitest from "ultracite/oxlint/vitest";
import { defineConfig } from "vite-plus";

const jsPlugins = selectJsPlugins([
  "github",
  "sonarjs",
  "tsdoc",
  "react-doctor",
]);

// Not covered by Ultracite's shared ignores.
const extraIgnores = [
  "apps/web/.tanstack/**",
  ".agents/**",
  ".claude/**",
  "packages/ui/**",
];

export default defineConfig({
  lint: {
    env: core.env ?? {},
    extends: [
      core,
      react,
      tanstack,
      drizzle,
      playwright,
      vitest,
      tanstackJsPlugins,
      shadcn,
      antiSlop,
      jsPlugins,
    ],
    ignorePatterns: [...(core.ignorePatterns ?? []), ...extraIgnores],
    jsPlugins: [
      ...jsPlugins.jsPlugins,
      ...shadcn.jsPlugins,
      "./oxlint-plugin-helios/index.ts",
    ],
    options: {
      reportUnusedDisableDirectives: "error",
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "helios/require-suppression-reason": "error",
    },
    overrides: [
      {
        // Hono awaits `next`; it is not a Node-style callback.
        files: ["apps/server/**"],
        rules: { "node/callback-return": "off" },
      },
      {
        // CodeRabbit loads this file by name.
        files: [".coderabbit.config.ts"],
        rules: { "github/filenames-match-regex": "off" },
      },
    ],
    settings: jsPluginSettings,
  },
  fmt: {
    ...ultraciteFmt,
    ignorePatterns: [...(ultraciteFmt.ignorePatterns ?? []), ...extraIgnores],
  },
  staged: {
    "*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}": "vp check --fix",
    // knip checks the whole repo, so it takes no file list.
    "{*.{js,jsx,ts,tsx,mjs,cjs,mts,cts},package.json,knip.jsonc}": () => "knip",
  },
});
