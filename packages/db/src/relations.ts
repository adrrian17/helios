import { defineRelations } from "drizzle-orm";

// oxlint-disable-next-line sonarjs/no-wildcard-import -- defineRelations needs every table.
import * as schema from "./schema";

export const relations = {
  ...defineRelations(schema),
  ...schema.authRelations,
};
