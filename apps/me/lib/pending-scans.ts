"use client";

const PENDING_SCANS_KEY = "bearhacks.pendingScans.v1";

type PendingScan = {
  profileId: string;
  scannedAt: string;
};

function isPendingScan(value: unknown): value is PendingScan {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.profileId === "string" && typeof obj.scannedAt === "string";
}

export function readPendingScans(): PendingScan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_SCANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, PendingScan>();
    for (const item of parsed) {
      if (!isPendingScan(item)) continue;
      unique.set(item.profileId, item);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

function writePendingScans(items: PendingScan[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(items));
}

export function queuePendingScan(profileId: string) {
  const trimmed = profileId.trim();
  if (!trimmed) return;
  const existing = readPendingScans();
  const next = new Map(existing.map((item) => [item.profileId, item]));
  next.set(trimmed, { profileId: trimmed, scannedAt: new Date().toISOString() });
  writePendingScans([...next.values()]);
}

export function removePendingScansByProfileIds(profileIds: string[]) {
  if (profileIds.length === 0) return;
  const ids = new Set(profileIds.map((id) => id.trim()).filter(Boolean));
  if (ids.size === 0) return;
  const remaining = readPendingScans().filter((item) => !ids.has(item.profileId));
  writePendingScans(remaining);
}
