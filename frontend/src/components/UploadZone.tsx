import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, importExportZip } from "../api/client";

/** Fallback path: upload the Letterboxd export ZIP (Settings -> Data -> Export). */
export function UploadZone({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { id } = await importExportZip(file);
      navigate(`/analysis/${id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Upload failed. Try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full rounded-lg border border-dashed border-night-border bg-night-soft
                   px-4 py-6 text-fog hover:border-fog disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload your Letterboxd export ZIP"}
        <span className="mt-1 block text-xs">
          letterboxd.com → Settings → Data → Export your data
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        aria-label="Letterboxd export ZIP"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-amber">
          {error}
        </p>
      )}
    </div>
  );
}
