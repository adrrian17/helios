import type { ServerEnv } from "@helios/infra/alchemy.run";

// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/cloudflare/compute/workers

export type CloudflareEnv = ServerEnv;

declare global {
  // oxlint-disable-next-line sonarjs/redundant-type-aliases -- exposes the inferred env as the global Workers `Env`.
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- module augmentation needs an interface to merge into.
    export interface Env extends CloudflareEnv {}
  }
}
