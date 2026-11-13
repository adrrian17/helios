import type { Sort, SortField } from "@helios/api/domain";

/** Dates read newest first; every other column starts from the top of its order. */
export const firstDirection = (field: SortField): Sort["direction"] =>
  field === "created" || field === "updated" ? "desc" : "asc";

const flipped = { asc: "desc", desc: "asc" } as const;

/** Choosing the current field flips the order; another field starts from its first direction. */
export const nextSort = (sort: Sort, field: SortField): Sort => ({
  field,
  direction:
    field === sort.field ? flipped[sort.direction] : firstDirection(field),
});
