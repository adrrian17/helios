import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

const getStatusLabel = (isLoading: boolean, isConnected: boolean): string => {
  if (isLoading) {
    return "Checking...";
  }

  return isConnected ? "Connected" : "Disconnected";
};

const HomeComponent = () => {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const isConnected = healthCheck.data !== undefined;
  // oxlint-disable-next-line shadcn/no-raw-colors -- the theme has no success token yet.
  const statusDotColor = isConnected ? "bg-green-500" : "bg-destructive";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusDotColor}`} />
            <span className="text-muted-foreground text-sm">
              {getStatusLabel(healthCheck.isLoading, isConnected)}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
