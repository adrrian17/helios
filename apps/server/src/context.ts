import type { Context as ApiContext } from "@helios/api/context";

import { getDb, createAuth } from "./services";

export interface CreateContextOptions {
  headers: Headers;
}

export const createContext = async ({
  headers,
}: CreateContextOptions): Promise<ApiContext> => {
  const db = getDb();
  const session = await createAuth(db).api.getSession({ headers });

  return {
    db,
    session,
  };
};
