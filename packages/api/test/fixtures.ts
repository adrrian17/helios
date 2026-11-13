import { z } from "zod";

import { ADMIN_EMAIL } from "./harness";
import type { Harness } from "./harness";

export const signInAsAdmin = async (harness: Harness) =>
  harness.clientFor(await harness.signIn(ADMIN_EMAIL));

export type Client = Awaited<ReturnType<typeof signInAsAdmin>>;

export const addMember = async (
  harness: Harness,
  admin: Client,
  email: string
) => {
  await admin.workspace.invite({ email });
  const client = harness.clientFor(await harness.signIn(email));
  const { id } = await client.me();

  return { client, id };
};

export const createProject = async (admin: Client, prefix = "HEL") => {
  await admin.projects.create({ name: `${prefix} project`, prefix });

  return await admin.projects.get({ prefix });
};

export const stateNamed = (
  project: Awaited<ReturnType<typeof createProject>>,
  name: string
) => {
  const state = project.states.find((candidate) => candidate.name === name);

  if (state === undefined) {
    throw new Error(`No Workflow State named ${name}`);
  }

  return state;
};

const rpcError = z.object({ code: z.string() });

/** The oRPC error code `call` fails with, or "ok" when it succeeds. */
export const outcomeOf = async (call: Promise<unknown>) => {
  try {
    await call;

    return "ok";
  } catch (error) {
    const parsed = rpcError.safeParse(error);

    return parsed.success ? parsed.data.code : "unexpected";
  }
};
