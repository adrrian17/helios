export const memberWith = {
  with: { user: { columns: { name: true, email: true } } },
} as const;

/** What the UI shows for a Member: their display name, or their email until they set one. */
export const displayName = (user: { name: string; email: string }) =>
  user.name.trim() === "" ? user.email : user.name;

/** The Member shape every procedure returns for authors, assignees and actors. */
export const toMemberSummary = (member: {
  userId: string;
  active: boolean;
  user: { name: string; email: string };
}) => ({
  id: member.userId,
  displayName: displayName(member.user),
  email: member.user.email,
  active: member.active,
});
