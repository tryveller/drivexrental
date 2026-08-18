import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * QR for a booking. The encoded value is the hub kiosk link, so the same code
 * works whether it is scanned from the rider's phone or from a WhatsApp message.
 */
export function BookingQr({ value, size = 168 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: "M" })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div
      className="flex items-center justify-center rounded-xl bg-white p-2"
      style={{ width: size + 16, height: size + 16 }}
    >
      {src && <img src={src} alt="" width={size} height={size} className="rounded-md" />}
    </div>
  );
}
