"use client";

import { createLogger } from "@bearhacks/logger";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

const log = createLogger("me/qr-preview");

type QrPreviewProps = {
  qrId: string;
  /**
   * Visible label under the QR. Defaults to a generic instruction; pass a
   * tailored string when this preview belongs to a specific person.
   */
  label?: string;
  /**
   * Pixel width of the rendered image. Defaults to 256, which fits most cards.
   */
  size?: number;
};

export function QrPreview({ qrId, label, size = 256 }: QrPreviewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const claimUrl = useMemo(() => {
    if (!qrId || typeof window === "undefined") return null;
    return `${window.location.origin}/claim/${qrId}`;
  }, [qrId]);

  useEffect(() => {
    let active = true;
    if (!claimUrl) return;
    QRCode.toDataURL(claimUrl, {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((dataUrl: string) => {
        if (active) setImageUrl(dataUrl);
      })
      .catch((error: unknown) => {
        log.warn("Failed to generate QR preview", { qrId, error });
        if (active) setImageUrl(null);
      });
    return () => {
      active = false;
    };
  }, [claimUrl, qrId, size]);

  if (!claimUrl) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="rounded-(--bearhacks-radius-md) border border-(--bearhacks-border) bg-white p-3"
        style={{ width: size + 24, height: size + 24 }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Networking QR code"
            width={size}
            height={size}
            className="h-auto w-full"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-(--bearhacks-muted)">
            Rendering…
          </div>
        )}
      </div>
      {label ? (
        <p className="text-center text-xs text-(--bearhacks-text-marketing)/70">
          {label}
        </p>
      ) : null}
    </div>
  );
}
