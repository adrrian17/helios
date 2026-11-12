import type { PublicCoercedEnvSchema } from "./env";

declare global {
  interface ImportMetaEnv {
    readonly VITE_SERVER_URL: PublicCoercedEnvSchema["VITE_SERVER_URL"];
  }
}
