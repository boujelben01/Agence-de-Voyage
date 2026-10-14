/** N'accepte qu'une URL interne (évite les redirections ouvertes via ?returnUrl=). */
export function safeReturnUrl(raw: string | null): string | null {
  return raw !== null && raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')
    ? raw
    : null;
}
