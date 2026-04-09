import type { User } from "@supabase/supabase-js";

/** True when the active Supabase user last signed in with Discord (guild join path). */
export function isDiscordBackedUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = user.app_metadata;
  return (
    (Array.isArray(meta?.providers) && meta.providers.includes("discord")) ||
    meta?.provider === "discord"
  );
}

function formatProviderId(raw: string): string {
  switch (raw) {
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "facebook":
      return "Meta";
    case "linkedin_oidc":
      return "LinkedIn";
    case "discord":
      return "Discord";
    default:
      return raw.replace(/_/g, " ");
  }
}

/**
 * Human-readable label for how the user signed in.
 * Uses `identities[].last_sign_in_at` so linked accounts don't show the wrong provider
 * (e.g. Google login after a Discord link won't show "Discord").
 */
export function primaryAuthProviderLabel(user: User): string {
  const identities = user.identities;
  if (Array.isArray(identities) && identities.length > 0) {
    const sorted = [...identities].sort((a, b) => {
      const ta = Date.parse(a.last_sign_in_at ?? a.updated_at ?? "") || 0;
      const tb = Date.parse(b.last_sign_in_at ?? b.updated_at ?? "") || 0;
      return tb - ta;
    });
    const raw = sorted[0]?.provider;
    if (typeof raw === "string" && raw.length > 0) {
      return formatProviderId(raw);
    }
  }

  const meta = user.app_metadata;
  const raw =
    (Array.isArray(meta?.providers) &&
      meta.providers.length > 0 &&
      meta.providers[0]) ||
    (typeof meta?.provider === "string" ? meta.provider : null);
  if (typeof raw === "string" && raw.length > 0) {
    return formatProviderId(raw);
  }
  return "OAuth";
}
