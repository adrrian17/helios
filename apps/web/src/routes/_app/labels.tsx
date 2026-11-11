import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader, PageTitle } from "@/components/page-header";

export const Route = createFileRoute("/_app/labels")({
  component: () => (
    <>
      <PageHeader>
        <PageTitle>Labels</PageTitle>
      </PageHeader>
      <ComingSoon title="Labels" />
    </>
  ),
});
