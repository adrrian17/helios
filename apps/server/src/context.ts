import { createContext as createApiContext } from "@helios/api/context";

import { createAuth, getDb } from "./services";

export const createContext = async (headers: Headers) => {
  const db = getDb();

  return await createApiContext({ auth: createAuth(db), db, headers });
};
