"use client";

import { useQuery } from "@tanstack/react-query";
import { useId, useRef } from "react";
import { useApiClient } from "@/lib/use-api-client";

/**
 * Hover-resolved profile-name tooltip rendered with the native HTML Popover
 * API (`popover="hint"`), available in Chrome 114+ / Edge 114+ / Firefox 125+ /
 * Safari 17+ (Baseline 2024).
 *
 * `hint` popovers were added specifically for hover/focus tooltips: they sit
 * in the top layer (no z-index gymnastics), light-dismiss, return focus, and
 * critically do **not** close any sibling `popover="auto"` (e.g. the QR
 * details modal) when shown.
 *
 * The lookup is lazy — the first hover/focus refetches the profile and
 * subsequent hovers within `staleTime` are instant. We position the tooltip
 * with `getBoundingClientRect()` rather than CSS anchor positioning, since
 * Safari's CSS Anchor Positioning support is still partial.
 *
 * Refs:
 *   - https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using
 *   - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover
 */

type ProfileLookup = {
  id: string;
  display_name?: string | null;
};

type Props = {
  profileId: string;
  /** Visible label for the trigger. Defaults to the (truncated) profileId. */
  triggerLabel?: string;
  /** Extra classes for the trigger `<button>`. */
  className?: string;
};

const HIDE_DELAY_MS = 120;

export function ProfileNameTooltip({
  profileId,
  triggerLabel,
  className = "",
}: Props) {
  const client = useApiClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const reactId = useId();
  const tipId = `profile-tip-${reactId.replace(/:/g, "")}`;

  const query = useQuery({
    queryKey: ["admin-profile-lookup", profileId],
    queryFn: () => client!.fetchJson<ProfileLookup>(`/profiles/${profileId}`),
    enabled: false,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const positionTooltip = () => {
    const trigger = triggerRef.current;
    const tip = tooltipRef.current;
    if (!trigger || !tip) return;
    const rect = trigger.getBoundingClientRect();
    tip.style.position = "fixed";
    tip.style.margin = "0";
    tip.style.top = `${Math.round(rect.bottom + 6)}px`;
    tip.style.left = `${Math.round(rect.left)}px`;
  };

  const show = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (client && !query.data && !query.isFetching && !query.isError) {
      void query.refetch();
    }
    const tip = tooltipRef.current;
    if (!tip) return;
    if (typeof tip.showPopover !== "function") return;
    try {
      positionTooltip();
      tip.showPopover();
    } catch {
      // Already open or unsupported — ignore.
    }
  };

  const hide = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      const tip = tooltipRef.current;
      if (!tip || typeof tip.hidePopover !== "function") return;
      try {
        tip.hidePopover();
      } catch {
        /* not open */
      }
    }, HIDE_DELAY_MS);
  };

  const display = query.data?.display_name?.trim();
  const tooltipText = query.isFetching
    ? "Loading…"
    : query.isError
      ? "Lookup failed"
      : display || "Unnamed profile";

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-describedby={tipId}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={hide}
        className={`cursor-help bg-transparent p-0 text-left font-[inherit] text-[length:inherit] break-all text-(--bearhacks-muted) underline decoration-dotted underline-offset-2 hover:text-(--bearhacks-fg) ${className}`}
      >
        {triggerLabel ?? profileId}
      </button>
      <div
        ref={tooltipRef}
        id={tipId}
        popover="hint"
        role="tooltip"
        onMouseEnter={() => {
          if (hideTimerRef.current !== null) {
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }
        }}
        onMouseLeave={hide}
        className="m-0 max-w-[18rem] rounded-(--bearhacks-radius-md) border border-(--bearhacks-border) bg-(--bearhacks-primary) px-3 py-2 text-xs text-(--bearhacks-on-primary) shadow-lg"
      >
        {tooltipText}
      </div>
    </>
  );
}
