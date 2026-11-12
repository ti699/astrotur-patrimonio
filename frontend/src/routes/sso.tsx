import { createFileRoute } from "@tanstack/react-router";
import { SsoReceiver } from "@/components/SsoReceiver";
import { validateSsoSearch } from "@/lib/sso";

export const Route = createFileRoute("/sso")({
  validateSearch: validateSsoSearch,
  component: SsoRouteReceiver,
});

function SsoRouteReceiver() {
  const { ticket } = Route.useSearch();
  return <SsoReceiver ticket={ticket} />;
}
