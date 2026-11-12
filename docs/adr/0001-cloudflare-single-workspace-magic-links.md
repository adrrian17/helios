# Cloudflare-only platform, one Workspace, magic-link sign-in

Helios runs entirely on Cloudflare (Workers, D1, Cloudflare Email Service), provisioned with Alchemy from a better-t-stack scaffold, serves exactly one Workspace per installation, and signs Members in only through magic links: the first Admin is seeded from configuration and everyone else enters by Invitation. We chose this to keep a small team's tracker to one platform with no passwords and no multi-tenancy, accepting lock-in to D1 and a beta email product.

## Consequences

- Sending magic links to arbitrary addresses needs the Workers Paid plan and a verified sender domain; Email Sending was in public beta when this was decided.
- Email delivery sits behind one port so dev and tests capture links instead of sending mail.
- Adding a second Workspace later means introducing tenancy into every table and query.
