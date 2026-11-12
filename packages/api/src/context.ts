import type { Session } from "@helios/auth";
import type { Database } from "@helios/db";

export interface Context {
  session: Session | null;
  db: Database;
}
