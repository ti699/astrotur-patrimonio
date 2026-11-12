import { createFileRoute } from "@tanstack/react-router";
import { SsoReceiver } from "@/components/SsoReceiver";
import { validateSsoSearch } from "@/lib/sso";

export const Route = createFileRoute("/sso/callback")({
  validateSearch: validateSsoSearch,
  component: SsoCallback,
});

function SsoCallback() {
  const { ticket } = Route.useSearch();
  return <SsoReceiver ticket={ticket} />;
}
