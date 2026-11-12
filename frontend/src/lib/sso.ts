export type SsoSearch = { ticket?: string };

export const validateSsoSearch = (search: Record<string, unknown>): SsoSearch => ({
  ticket:
    typeof search.ticket === "string" && search.ticket.trim() ? search.ticket.trim() : undefined,
});
