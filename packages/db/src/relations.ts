import { defineRelations } from "drizzle-orm";

// oxlint-disable-next-line sonarjs/no-wildcard-import -- defineRelations needs every table.
import * as auth from "./schema/auth";
// oxlint-disable-next-line sonarjs/no-wildcard-import -- defineRelations needs every table.
import * as tracker from "./schema/tracker";

export const relations = {
  ...defineRelations({ ...auth, ...tracker }),
  ...auth.authRelations,
  ...tracker.trackerRelations,
};
