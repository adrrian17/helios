import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader, PageTitle } from "@/components/page-header";

export const Route = createFileRoute("/_app/my-issues")({
  component: () => (
    <>
      <PageHeader>
        <PageTitle>My Issues</PageTitle>
      </PageHeader>
      <ComingSoon title="My Issues" />
    </>
  ),
});
