const CORPORATE_EMAIL_DOMAINS = [
  'astroturviagens.com',
  'grupoastrotur.com.br',
  'transastro.com.br',
];

export const isCorporateEmail = (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) &&
    normalizedEmail.length <= 255 &&
    CORPORATE_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(`@${domain}`))
  );
};
