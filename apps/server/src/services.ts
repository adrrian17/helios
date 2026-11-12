import { createAuth as createConfiguredAuth } from "@helios/auth";
import { createDb } from "@helios/db";
import type { Database } from "@helios/db";

import { ENV } from "./env.server";

export const getDb = (): Database => createDb(ENV);

export const createAuth = (database: Database = getDb()) =>
  createConfiguredAuth(ENV, database);
