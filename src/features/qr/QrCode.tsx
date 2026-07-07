import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Renders a QR code encoding the asset's deep link (auth-gated on scan). */
export function AssetQr({ assetId, size = 128 }: { assetId: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const url = `${window.location.origin}/assets/${assetId}`;
    QRCode.toDataURL(url, { width: size * 2, margin: 1, color: { dark: '#1A1714' } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [assetId, size]);
  if (!src) return <div style={{ width: size, height: size }} className="bg-surface-panel rounded" />;
  return <img src={src} width={size} height={size} alt="Asset QR code" className="rounded" />;
}
