// oxlint-disable sonarjs/no-wildcard-import -- Alchemy and Effect modules are used as namespaces.
import * as Cloudflare from "@alchemy.run/cloudflare";
import * as GitHub from "@alchemy.run/github";
import * as Alchemy from "alchemy";
import * as Output from "alchemy/Output";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import "varlock/auto-load";
// oxlint-enable sonarjs/no-wildcard-import

// Set by portless in `pnpm dev`; unset on deploy.
const portlessServerUrl = process.env.PORTLESS_URL;

export const db = Cloudflare.D1.Database("database", {
  migrations: "../../packages/db/src/migrations",
});

export const server = Cloudflare.Worker("server", {
  main: "../../apps/server/src/index.ts",
  compatibility: {
    flags: ["nodejs_compat"],
  },
  env: {
    DB: db,
    APP_ENV: Config.String("APP_ENV"),
    ADMIN_EMAIL: Config.String("ADMIN_EMAIL"),
    EMAIL_FROM: Config.String("EMAIL_FROM"),
    // Under `alchemy dev` this binding writes .eml files locally; the server uses the capture Mailer there.
    EMAIL: Cloudflare.Email.SendEmail("EMAIL"),
    CORS_ORIGIN: Config.String("CORS_ORIGIN"),
    BETTER_AUTH_SECRET: Config.Redacted("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: portlessServerUrl ?? Cloudflare.Worker.URL,
  },
  dev: {
    // portless assigns both ports; see the dev script in package.json.
    port: Number(process.env.PORT),
    strictPort: true,
  },
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
  "helios",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* deployStack() {
    const stage = yield* Alchemy.Stage;
    const serverWorker = yield* server;

    // CI stages get a fixed name so the workflow can compute CORS_ORIGIN before deploying; the format must match the workflows.
    const webName = /^(?:production|pr-\d+)$/u.test(stage)
      ? { name: `helios-web-${stage}` }
      : {};

    const webWorker = yield* Cloudflare.Website.Vite("web", {
      ...webName,
      rootDir: "../../apps/web",
      assets: {
        htmlHandling: "auto-trailing-slash",
        notFoundHandling: "single-page-application",
      },
      env: {
        VITE_SERVER_URL: portlessServerUrl ?? serverWorker.url.as<string>(),
      },
      dev: {
        port: Number(process.env.WEB_PORT),
        strictPort: true,
      },
    });

    // Set only in GitHub Actions; `pr` only when the workflow passes PULL_REQUEST.
    const github = yield* GitHub.GitHubEnv;

    if (github?.pr !== undefined) {
      yield* GitHub.Comment("preview-comment", {
        owner: github.owner,
        repository: github.repository,
        issueNumber: github.pr,
        // Destroying the preview stage removes the comment with it.
        allowDelete: true,
        body: Output.interpolate`
          ## Preview

          **Web:** ${webWorker.url}
          **API:** ${serverWorker.url}

          Commit \`${(process.env.PR_HEAD_SHA ?? github.sha).slice(0, 7)}\`

          _Este comentario se actualiza con cada push._
        `,
      });
    }

    return {
      web: webWorker.url,
      server: serverWorker.url,
    };
  })
);
