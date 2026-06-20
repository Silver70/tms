import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/admin/overview")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/admin/overview"!</div>;
}
