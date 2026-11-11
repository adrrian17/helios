import { createFileRoute } from "@tanstack/react-router";

const HomeComponent = () => (
  <main className="grid h-svh place-items-center">
    <h1 className="text-4xl font-semibold">Helios</h1>
  </main>
);

export const Route = createFileRoute("/")({
  component: HomeComponent,
});
