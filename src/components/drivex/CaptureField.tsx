import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RefreshCw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadKycFile, type KycSlot } from "@/lib/kyc-upload";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function CameraSheet({
  open,
  facing,
  title,
  onClose,
  onShot,
}: {
  open: boolean;
  facing: "user" | "environment";
  title: string;
  onClose: () => void;
  onShot: (blob: Blob) => void;
}) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("cameraNotSupported"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        setError(t("cameraDenied"));
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facing, stop, t]);

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onShot(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          stop();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden rounded-2xl border border-border bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn(
              "aspect-[3/4] w-full object-cover",
              facing === "user" && "[transform:scaleX(-1)]",
            )}
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{t("holdSteady")}</p>
        )}
        <Button className="w-full" onClick={shoot} disabled={!ready || Boolean(error)}>
          <Camera className="mr-2 h-4 w-4" />
          {t("takePhoto")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function CaptureField({
  bookingId,
  slot,
  label,
  hint,
  facing = "environment",
  value,
  onChange,
  allowFile = true,
}: {
  bookingId: string;
  slot: KycSlot;
  label: string;
  hint?: string;
  facing?: "user" | "environment";
  value: string | null;
  onChange: (path: string | null) => void;
  allowFile?: boolean;
}) {
  const { t } = useLanguage();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function handleBlob(blob: Blob, fileName?: string) {
    setError(null);
    setBusy(true);
    const localUrl = blob.type.startsWith("image/") ? URL.createObjectURL(blob) : null;
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return localUrl;
    });
    try {
      const path = await uploadKycFile(bookingId, slot, blob, fileName);
      onChange(path);
    } catch (uploadError) {
      onChange(null);
      setError(uploadError instanceof Error ? uploadError.message : t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const done = Boolean(value) && !busy;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3",
        done ? "border-primary/50 bg-primary/5" : "border-border bg-card/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
          />
        ) : done ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Check className="h-4 w-4 text-primary" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={done ? "outline" : "default"}
          onClick={() => setCameraOpen(true)}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : done ? (
            <RefreshCw className="mr-2 h-4 w-4" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          {busy ? t("uploadingPhoto") : done ? t("retakePhoto") : t("openCamera")}
        </Button>
        {allowFile && (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("chooseFromPhone")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture={facing === "user" ? "user" : undefined}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void handleBlob(file, file.name);
              }}
            />
          </>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <CameraSheet
        open={cameraOpen}
        facing={facing}
        title={label}
        onClose={() => setCameraOpen(false)}
        onShot={(blob) => {
          setCameraOpen(false);
          void handleBlob(blob);
        }}
      />
    </div>
  );
}
