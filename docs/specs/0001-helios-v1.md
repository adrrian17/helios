---
status: ready-for-agent
---

# Helios v1

Vocabulary follows `GLOSSARY.md`. Platform and sign-in follow ADR 0001.

## Problem Statement

A small team wants one place to track its work. Trello is fast and visual, but its cards and lists carry no meaning: nothing says whether a card is done, how urgent it is, or how to refer to it in conversation. Linear has that structure (identifiers, priorities, workflow categories, keyboard-first navigation), but it is heavier than the team needs, with teams, cycles, roadmaps and integrations they will not use. The team wants Linear's structure with Trello's board feel, and nothing else.

## Solution

Helios is a web app for one Workspace. Admins create Projects; each Project is a board whose columns are Workflow States, and every Workflow State belongs to one of five fixed State Categories (`ideas`, `backlog`, `started`, `completed`, `cancelled`). Members create Issues with an Identifier such as `HEL-42`, a Priority, an assignee, Labels, a Checklist, Comments and an Activity history. Issues are dragged between columns and reordered by hand on the Board, or scanned and sorted on a dense List. My Issues shows each Member what they have on their plate. A Cmd+K palette and single-key shortcuts make the app keyboard-first. Members sign in with magic links; the first Admin is seeded and everyone else is invited.

## User Stories

### Sign-in and Members

1. As the person installing Helios, I want a seed step that creates the Workspace and the first Admin from a configured email, so that someone can sign in on day one.
2. As the person installing Helios, I want the seed step to do nothing when the Workspace and Admin already exist, so that I can run it safely on every deploy.
3. As a Member, I want to sign in by entering my email and clicking a link sent to me, so that I never manage a password.
4. As anyone on the sign-in page, I want the same confirmation message whether or not my email has access, so that the page does not reveal who is a Member.
5. As someone without a Member account or Invitation, I want no email to be sent when I request a link, so that Helios cannot be used to spam addresses.
6. As a Member, I want a magic link to expire after a short time and work only once, so that an old or forwarded email cannot be used to sign in.
7. As a Member, I want to stay signed in across visits until I sign out, so that I do not request a link every time.
8. As a Member, I want to sign out, so that I can leave a shared computer safely.
9. As an Admin, I want to invite someone by email, so that they can sign in and become a Member.
10. As an invited person, I want my first sign-in to turn my Invitation into a Member account, so that joining needs no extra step.
11. As an Admin, I want to see pending Invitations and revoke them, so that I can undo a mistaken invite.
12. As an Admin, I want to see every Member with their role and status, so that I know who has access.
13. As an Admin, I want to deactivate a Member, so that someone who left can no longer sign in.
14. As an Admin, I want a deactivated Member's existing sessions to stop working, so that deactivation takes effect immediately.
15. As an Admin, I want deactivated Members to remain visible as authors and past assignees, so that history stays readable.
16. As an Admin, I want to reactivate a deactivated Member, so that a returning person keeps their history.
17. As an Admin, I want to promote a Member to Admin or demote an Admin to Member, so that I can share management work.
18. As an Admin, I want Helios to refuse to demote or deactivate the last active Admin, so that the Workspace is never left unmanaged.
19. As a Member, I want to set my display name, so that teammates recognise me.

### Projects

20. As an Admin, I want to create a Project with a name and an Identifier prefix of 2 to 5 uppercase letters, so that its Issues get handles like `HEL-42`.
21. As an Admin, I want Helios to reject a prefix already used by another Project, including archived ones, so that every Identifier is unique.
22. As an Admin, I want the prefix to be fixed after creation, so that Identifiers people have shared never change.
23. As an Admin, I want a new Project to start with five Workflow States, one per State Category (Ideas, Backlog, In Progress, Done, Cancelled), so that it is usable immediately.
24. As an Admin, I want to rename a Project, so that its name can follow the work.
25. As an Admin, I want to archive a Project, so that finished work leaves the sidebar without being lost.
26. As an Admin, I want to unarchive a Project, so that I can bring it back.
27. As a Member, I want archived Projects hidden from navigation and My Issues but reachable from an archive list, so that old work stays findable.
28. As a Member, I want to see every active Project in a sidebar, so that I can switch boards quickly.

### Workflow States

29. As an Admin, I want to add a Workflow State to a Project and choose its State Category, so that the board matches how we work (for example "In Review" under `started`).
30. As an Admin, I want to rename a Workflow State, so that labels match our language.
31. As an Admin, I want to reorder Workflow States, so that columns read left to right in our order.
32. As an Admin, I want columns grouped by State Category in category order, so that `ideas` is always left of `completed` regardless of custom states.
33. As an Admin, I want to delete a Workflow State only after choosing another state to receive its Issues, so that no Issue is lost.
34. As an Admin, I want Helios to refuse to delete a Project's last `backlog` state, so that new Issues always have a home.
35. As a Member, I want new Issues to land in the Project's first `backlog` state unless I pick another, so that creating an Issue is one step.

### Issues

36. As a Member, I want to create an Issue with just a title, so that capturing work is fast.
37. As a Member, I want each new Issue to get the next number in its Project, so that Identifiers are sequential and never reused, even after deletions.
38. As a Member, I want to open an Issue by its Identifier in the URL, so that I can share links.
39. As a Member, I want to edit an Issue's title, so that it stays accurate.
40. As a Member, I want to write the description in Markdown and preview it rendered, so that I can format without a heavy editor.
41. As a Member, I want rendered Markdown to be sanitised, so that nobody can inject scripts through an Issue.
42. As a Member, I want to set Priority to No priority, Urgent, High, Medium or Low, so that urgency is explicit.
43. As a Member, I want to assign an Issue to one active Member or leave it unassigned, so that ownership is clear.
44. As a Member, I want to move an Issue to any Workflow State of its Project from the Issue view, so that I can change state without the board.
45. As a Member, I want to delete an Issue after confirming, so that mistakes can be removed; `cancelled` is for work we decided not to do.
46. As a Member, I want to see when an Issue was created and last updated, and by whom it was created, so that I have context.

### Labels

47. As a Member, I want to create a Label with a name and a colour, so that I can tag Issues.
48. As a Member, I want Labels to be shared across all Projects, so that a "bug" label means the same everywhere.
49. As a Member, I want Label names to be unique ignoring case, so that we do not get "Bug" and "bug".
50. As a Member, I want to attach and detach any number of Labels on an Issue, so that I can categorise it.
51. As a Member, I want to rename, recolour and delete Labels, so that the set stays tidy; deleting a Label removes it from every Issue.

### Checklist

52. As a Member, I want to add items to an Issue's Checklist, so that I can break work into steps.
53. As a Member, I want to check and uncheck items, so that I can track progress.
54. As a Member, I want to edit, reorder and delete items, so that the Checklist stays accurate.
55. As a Member, I want to see Checklist progress (for example 2/5) on the Board card, so that I can gauge progress at a glance.

### Comments

56. As a Member, I want to comment on an Issue in Markdown, so that discussion lives with the work.
57. As a Member, I want Comments listed oldest first with author and time, so that the conversation reads naturally.
58. As a comment author, I want to edit my Comment and have it marked as edited, so that I can fix mistakes honestly.
59. As a comment author, I want to delete my Comment, so that I can retract it.
60. As an Admin, I want to delete any Comment, so that I can moderate.
61. As a Member, I want Helios to refuse edits to other people's Comments, so that nobody can put words in my mouth.

### Activity

62. As a Member, I want an Issue's Activity to record its creation and every change to title, Workflow State, Priority, assignee and Labels, with who and when, so that I can see how it evolved.
63. As a Member, I want Activity entries to show old and new values (for example "Backlog → In Progress"), so that each change is understandable on its own.
64. As a Member, I want description and Checklist edits left out of Activity, so that the history stays readable.
65. As a Member, I want Activity and Comments interleaved in one timeline, so that I can follow the Issue's story in order.

### Board view

66. As a Member, I want a Project's Board to show one column per Workflow State with its Issue count, so that I see the whole flow.
67. As a Member, I want each card to show Identifier, title, Priority, assignee, Labels and Checklist progress, so that I rarely need to open it.
68. As a Member, I want to drag a card to another column to change its Workflow State, so that updating status feels like Trello.
69. As a Member, I want to drag a card up or down within a column to set its order, so that I can arrange work by hand.
70. As a Member, I want my drag result to persist and be seen by teammates when they load the page, so that the order is shared.
71. As a Member, I want a failed move to snap the card back and show an error, so that the board never lies.
72. As a Member, I want to add an Issue at the bottom of a specific column, so that I can capture work where it belongs.
73. As a Member, I want to click a card to open the Issue, so that I can see its detail.
74. As a keyboard user, I want to move cards between columns without a mouse, so that the board is accessible.

### List view

75. As a Member, I want a List view of the same Project with one dense row per Issue, so that I can scan many Issues quickly.
76. As a Member, I want to sort the List by Identifier, title, Workflow State, Priority, assignee, created or updated date, so that I can find what matters.
77. As a Member, I want to switch between Board and List and have Helios remember my last choice per Project, so that I land where I work.

### Filters

78. As a Member, I want to filter a Project's Board and List by assignee, Label and Priority, so that I can focus.
79. As a Member, I want filters reflected in the URL, so that I can share a filtered view; saved filters are not needed.
80. As a Member, I want to clear all filters in one action, so that I can get back to the full view.

### My Issues

81. As a Member, I want a My Issues view listing Issues assigned to me across all active Projects, limited to `backlog` and `started` State Categories, so that I see my real workload.
82. As a Member, I want My Issues grouped by Project and sorted by Priority, so that I know what to do next.

### Keyboard and command palette

83. As a Member, I want Cmd+K (Ctrl+K elsewhere) to open a command palette, so that I can act without the mouse.
84. As a Member, I want the palette to jump to a Project, open an Issue by Identifier or title, and create an Issue, so that the common actions are one search away.
85. As a Member, I want `C` to create an Issue in the current Project, `/` to focus search and `Esc` to close dialogs, so that the basics are one key.
86. As a Member viewing an Issue, I want `S` to change Workflow State, `P` to change Priority and `A` to change assignee, so that triage is fast.
87. As a Member typing in a field, I want single-key shortcuts disabled, so that I do not trigger actions while writing.

### Access rules

88. As a Member, I want every page and API call to require a signed-in active Member, so that Workspace data is private.
89. As a Member, I want Admin-only actions hidden from me in the UI and rejected by the server, so that permissions hold even if someone crafts a request.

### Mobile layout

90. As a Member on a phone, I want every screen to fit the viewport width without horizontal page scrolling, so that Helios is usable away from my desk.
91. As a Member on a phone, I want the Project sidebar to collapse into a menu I open with a button, so that content gets the full screen.
92. As a Member on a phone, I want the Board to show one column at a time that I swipe between, with snap scrolling and a visible indicator of which Workflow State I am on, so that the board stays readable.
93. As a Member on a phone, I want to move a card to another Workflow State from a "Move to" action on the card or Issue view, and to reorder it within its column by long-press dragging, so that I can update work without precise drag across columns.
94. As a Member on a phone, I want the List view to show each Issue as a compact row with Identifier, title, Priority and assignee, hiding secondary columns, so that it fits narrow screens.
95. As a Member on a phone, I want the Issue view, dialogs and the command palette to open full-screen, so that forms are comfortable to fill in.
96. As a Member on a phone, I want a visible button to open the command palette and to create an Issue, so that keyboard-only actions are reachable by touch.
97. As a Member on a phone, I want tap targets of at least 44 by 44 pixels, so that I do not hit the wrong control.

## Implementation Decisions

### Platform and scaffold

- The project is already scaffolded with better-t-stack (its metadata file records the exact command). The implementation builds on that scaffold, keeps its monorepo layout (web app, server app, and shared api, auth, db, infra, ui and config packages), and does not re-run the scaffold.
- Chosen pieces: TanStack Router for the frontend, Hono server with oRPC as the API layer, Cloudflare Workers runtime, Cloudflare D1 database, Drizzle ORM, Better Auth, pnpm as the package manager, Vite+ toolchain, Alchemy for provisioning and for running the app locally, evlog for structured logging, Playwright for end-to-end tests (to be added).
- UI is Tailwind CSS v4 with shadcn/ui components on Base UI (not Radix), living in the shared ui package. New components are added there with the shadcn CLI.
- The scaffold's PWA addon stays: Helios is installable on a phone's home screen. It must not cache API responses or authenticated pages offline.
- The implementation ends with the app running locally through Alchemy, the seed working and all tests green. Alchemy deployment configuration for Workers, D1 and the email binding is present and documented, but the real deploy is done by the user (it needs their Cloudflare account, the Workers Paid plan and a verified sender domain).
- The layout is responsive and mobile-first: one codebase serves phones (from 360 px wide) and desktops, using Tailwind breakpoints. Below the `md` breakpoint the sidebar becomes a drawer, the Board shows one snap-scrolled column at a time, the List hides secondary columns, and the Issue view, dialogs and command palette are full-screen. Drag and drop supports touch (long-press to start) as well as mouse and keyboard. No separate mobile app or route tree.
- No real-time sync. After a mutation the client refreshes the affected data; other Members see changes on their next load or refetch.

### Modules

- **Auth module**: wraps Better Auth with the magic-link plugin only. Exposes "request link" and "verify link" behaviour plus session lookup. Enforces that a link is sent only to an active Member or a pending Invitation, that deactivated Members cannot create sessions, and that deactivation revokes existing sessions. Responses to link requests are identical whatever the outcome.
- **Mailer port**: one interface, "send magic link (to, url)". Two implementations: Cloudflare Email Service through the Worker `send_email` binding in production, and a capturing implementation in development and tests that logs the link and records it so tests can read it. Selection is by environment configuration, never by request input. The capture is unreachable in production.
- **Seed**: idempotent; creates the Workspace and the first Admin from an `ADMIN_EMAIL` setting.
- **Workspace module** (oRPC): Members, Invitations, roles, activation. Guards the "last active Admin" rule.
- **Projects module** (oRPC): create, rename, archive, unarchive, list. Creates the five default Workflow States in one transaction with the Project.
- **Workflow States module** (oRPC): add, rename, reorder, delete-with-destination. Guards the "at least one `backlog` state" rule.
- **Issues module** (oRPC): create, read by Identifier, update fields, move (state and position), delete, list with filters and sort, My Issues query. Writes Activity entries for the tracked fields in the same transaction as the change.
- **Labels, Checklist and Comments modules** (oRPC): CRUD with the rules in the user stories.
- **Authorization** is enforced in oRPC middleware/procedures: an "authenticated active Member" base and an "Admin" variant. The UI hides Admin actions but the server is the source of truth.
- **Frontend**: routes for sign-in, Project Board, Project List, Issue detail (addressable by Identifier), My Issues, Members/Invitations admin, Labels, Project settings (states). A global command palette and a keyboard shortcut layer.

### Schema (conceptual)

- Workspace (single row), Member (email unique, display name, role Admin|Member, active flag), Invitation (email unique, inviter, created, revoked).
- Project (name, prefix unique and immutable, next issue number counter, archived flag).
- WorkflowState (project, name, category in {ideas, backlog, started, completed, cancelled}, position within category).
- Issue (project, number unique per project, title, description markdown, priority, assignee nullable, workflow state, position within state, creator, timestamps).
- Label (name unique case-insensitive, colour), IssueLabel join.
- ChecklistItem (issue, text, checked, position).
- Comment (issue, author, markdown body, edited flag, timestamps).
- ActivityEntry (issue, actor, kind, old value, new value, timestamp). Stores display values so history stays readable after renames or deletions.
- Auth tables as Better Auth requires, linked one-to-one with Member.

### Rules worth stating precisely

- Identifier number comes from the Project's counter, incremented atomically on create; numbers are never reused.
- Column order on a board is State Category order first, then the state's position inside the category.
- Manual ordering within a column uses a sortable position key so a move updates only the moved Issue (fractional/lexicographic ordering); the List view sorts by fields and does not change positions.
- Moving an Issue is one operation carrying the target Workflow State and the neighbours it lands between; it records an Activity entry only if the state changed.
- Deleting a Workflow State moves its Issues to the chosen destination (appended at the end), recording Activity for each moved Issue, in one transaction.
- Deleting an Issue deletes its Checklist, Comments, Labels links and Activity.
- Markdown is rendered with sanitisation; raw HTML is not trusted.
- Magic links are single-use and short-lived (Better Auth defaults, at most 15 minutes).

## Testing Decisions

- A good test drives Helios through a public surface and asserts observable outcomes: what a Member sees, or what an API call returns. Tests never reach into internal functions, component state or table layout.
- **Seam 1, end-to-end (Playwright)**: the real app running locally through Alchemy with a local D1 and the capturing mailer. Covers the main journeys: seed then Admin sign-in through a captured magic link; inviting a Member who then signs in; creating a Project and seeing the default columns; creating an Issue and seeing `PREFIX-1`; dragging a card across columns and within a column and seeing it persist after reload; List sorting and URL filters; My Issues contents; Cmd+K jump to an Issue by Identifier; a Member not seeing Admin actions. The suite also runs a mobile project (a phone viewport with touch enabled) over the core journeys: sign-in, opening the sidebar drawer, swiping between Board columns, moving an Issue with "Move to", creating an Issue from the visible button, and no horizontal page scroll on each main screen.
- **Seam 2, API (oRPC in-process)**: the oRPC router called in-process against a fresh test D1 per test, with an authenticated Member or Admin context. Covers the domain rules that would be slow or flaky through the browser: Identifier numbering and non-reuse; manual ordering correctness; Workflow State deletion with destination and the last-`backlog` guard; Admin vs Member permissions on every Admin action; last-active-Admin guard; who receives a magic link (Member, Invitation, unknown, deactivated) and identical responses; deactivation revoking sessions; Comment edit/delete ownership; Label name uniqueness; Activity entries for each tracked field and none for description or Checklist; My Issues category and archive filtering.
- No unit tests of components or internal helpers. No third seam unless one of these two cannot express a behaviour.
- There is no prior art in the repository; these suites set the pattern. Tests are written alongside each slice (red, then green), not at the end.

## Out of Scope

- Teams, Cycles, Roadmaps, Initiatives, sub-issues, Issue relations (blocks, duplicates).
- Moving Issues between Projects.
- Integrations (GitHub, Slack), webhooks, public API, email notifications other than magic links, Trello-style power-ups and automations.
- Attachments, cover images, rich-text editor.
- Real-time collaboration and presence.
- Saved filters and custom views.
- Multiple Workspaces, billing, public sign-up, passwords, OAuth.
- Performing the production deploy.
- Native mobile apps and offline support (the responsive layout and installable PWA are in scope).

## Further Notes

- Cloudflare Email Service sending was in public beta when this spec was written and requires the Workers Paid plan to email arbitrary recipients. The Mailer port keeps that dependency in one place.
- Suggested build order for the goal, each slice shippable and tested: (1) replace the scaffold's default auth with magic links, seed, sign-in with the capturing mailer; (2) Members and Invitations; (3) Projects and Workflow States; (4) Issues with Board drag and drop; (5) Issue detail with Labels, Checklist, Comments, Activity; (6) List view, filters, My Issues; (7) command palette and shortcuts; (8) Alchemy deploy configuration and docs.
