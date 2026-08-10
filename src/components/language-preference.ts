export type AppLanguage = "EN" | "FIL";

export async function persistLanguagePreference(
  language: AppLanguage,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request("/api/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language }),
    keepalive: true,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "We couldn't change the language. Try again.");
  }
}
