import { createFileRoute } from "@tanstack/react-router";

import { ComingSoon } from "@/components/coming-soon";
import { PageHeader, PageTitle } from "@/components/page-header";

const IssuePage = () => {
  const { identifier } = Route.useParams();

  return (
    <>
      <PageHeader>
        <PageTitle>{identifier.toUpperCase()}</PageTitle>
      </PageHeader>
      <ComingSoon title={identifier.toUpperCase()} />
    </>
  );
};

export const Route = createFileRoute("/_app/issue/$identifier")({
  component: IssuePage,
});
