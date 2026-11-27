import { prefixLength } from "@helios/db/enums";
import type { StateCategory } from "@helios/db/enums";
import { z } from "zod";

export { stateCategories } from "@helios/db/enums";

/** Longest accepted values; the web app sets its field limits from these. */
export const limits = {
  title: 500,
  description: 100_000,
  name: 120,
  displayName: 80,
  comment: 50_000,
} as const;

export const prefixRule = {
  ...prefixLength,
  message: `Usa de ${prefixLength.min} a ${prefixLength.max} letras mayúsculas.`,
};

const required = (max: number) => z.string().trim().min(1).max(max);

export const titleSchema = required(limits.title);
export const descriptionSchema = z.string().max(limits.description);
export const nameSchema = required(limits.name);
export const displayNameSchema = required(limits.displayName);
export const commentSchema = required(limits.comment);

export const prefixSchema = z
  .string()
  .regex(
    new RegExp(`^[A-Z]{${prefixLength.min},${prefixLength.max}}$`, "u"),
    prefixRule.message
  );

const identifierPattern = new RegExp(
  `^(?<prefix>[A-Za-z]{${prefixLength.min},${prefixLength.max}})-(?<number>\\d+)$`,
  "u"
);

/** An Issue's Identifier, such as `HEL-42`. */
export const formatIdentifier = (prefix: string, number: number) =>
  `${prefix}-${number}`;

export const parseIdentifier = (identifier: string) => {
  const { prefix, number } =
    identifierPattern.exec(identifier.trim())?.groups ?? {};

  return prefix === undefined || number === undefined
    ? undefined
    : { prefix: prefix.toUpperCase(), number: Number(number) };
};

/** One Workflow State per State Category, so a new Project is usable at once. */
export const defaultStates: { name: string; category: StateCategory }[] = [
  { name: "Ideas", category: "ideas" },
  { name: "Pendiente", category: "backlog" },
  { name: "En curso", category: "started" },
  { name: "Completada", category: "completed" },
  { name: "Cancelada", category: "cancelled" },
];

/** Board and List filters; each list matches any of its values, and filters combine with AND. */
export const filtersSchema = z
  .object({
    assigneeIds: z.array(z.string()).optional(),
    unassigned: z.boolean().optional(),
  })
  .default({});

export type IssueFilters = z.output<typeof filtersSchema>;

export const sortFields = [
  "identifier",
  "title",
  "state",
  "assignee",
  "created",
  "updated",
] as const;

export type SortField = (typeof sortFields)[number];

export const sortDirections = ["asc", "desc"] as const;

/** How the List orders its rows; it never changes the Board's manual order. */
export const sortSchema = z
  .object({
    field: z.enum(sortFields),
    direction: z.enum(sortDirections),
  })
  .default({ field: "identifier", direction: "asc" });

export type Sort = z.output<typeof sortSchema>;
