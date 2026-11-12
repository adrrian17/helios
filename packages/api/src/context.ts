import type { Auth, Session } from "@helios/auth";
import type { Database } from "@helios/db";

export interface Context {
  session: Session | null;
  db: Database;
}

export const createContext = async ({
  auth,
  db,
  headers,
}: {
  auth: Auth;
  db: Database;
  headers: Headers;
}): Promise<Context> => ({
  db,
  session: await auth.api.getSession({ headers }),
});
