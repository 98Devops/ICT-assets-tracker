import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { Camera, CameraOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/** Camera QR scanner. Decodes IATS asset URLs or raw asset IDs; manual tag fallback. */
export function ScanPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTag, setManualTag] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let stopped = false;
    const reader = new BrowserQRCodeReader();
    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (!result || stopped) return;
        const text = result.getText();
        const m = text.match(/\/assets\/([0-9a-f-]{36})/i) ?? text.match(/^([0-9a-f-]{36})$/i);
        if (m) {
          stopped = true;
          controls?.stop();
          navigate(`/assets/${m[1]}`);
        }
      })
      .then((c) => {
        controls = c;
        if (stopped) c.stop();
      })
      .catch(() => setCameraError('Camera unavailable — check permissions, or use the tag search below.'));
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [navigate]);

  const findByTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    const { data } = await supabase
      .from('assets')
      .select('id')
      .ilike('asset_tag', manualTag.trim())
      .maybeSingle();
    if (data) navigate(`/assets/${data.id}`);
    else setManualError(`No asset found with tag “${manualTag.trim()}”.`);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan asset tag</h1>
        <p className="text-sm text-ink-muted">Point the camera at an IATS QR label.</p>
      </div>

      <div className="card overflow-hidden">
        {cameraError ? (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <CameraOff size={28} className="text-ink-muted" />
            <p className="text-sm text-ink-muted">{cameraError}</p>
          </div>
        ) : (
          <video ref={videoRef} className="w-full aspect-square object-cover" muted playsInline />
        )}
      </div>

      <form onSubmit={(e) => void findByTag(e)} className="card p-5 space-y-3">
        <label htmlFor="manual_tag" className="block text-sm font-medium">
          Or type the asset tag
        </label>
        <div className="flex gap-2">
          <input
            id="manual_tag"
            className="input font-mono"
            placeholder="ICT-0001"
            value={manualTag}
            onChange={(e) => setManualTag(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={!manualTag.trim()}>
            <Camera size={15} /> Open
          </button>
        </div>
        {manualError && (
          <p role="alert" className="text-sm text-status-faulty">
            {manualError}
          </p>
        )}
      </form>
    </div>
  );
}
