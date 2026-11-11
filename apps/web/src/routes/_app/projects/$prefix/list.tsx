import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_app/projects/$prefix/list")({
  component: () => <ComingSoon title="List view" />,
});
