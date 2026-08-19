import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const MIN = 1;
const MAX = 5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Full-screen bike photo with wheel / pinch zoom and drag to pan. */
export function PhotoZoom({
  open,
  onOpenChange,
  src,
  alt,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  src: string;
  alt: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const stateRef = useRef({ zoom, offset });
  const drag = useRef<{ x: number; y: number } | null>(null);

  stateRef.current = { zoom, offset };

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [open]);

  // React's onWheel is passive, so the listener is attached natively.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const dy =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      const current = stateRef.current;
      const next = clamp(current.zoom * Math.exp(-dy * 0.002), MIN, MAX);
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const k = next / current.zoom;
      setZoom(next);
      setOffset({
        x: px - (px - current.offset.x) * k,
        y: py - (py - current.offset.y) * k,
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  function step(factor: number) {
    const el = boxRef.current;
    const current = stateRef.current;
    const next = clamp(current.zoom * factor, MIN, MAX);
    if (!el) {
      setZoom(next);
      return;
    }
    const rect = el.getBoundingClientRect();
    const px = rect.width / 2;
    const py = rect.height / 2;
    const k = next / current.zoom;
    setZoom(next);
    setOffset({
      x: px - (px - current.offset.x) * k,
      y: py - (py - current.offset.y) * k,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl overflow-hidden border-primary/30 bg-background/95 p-0"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div
          ref={boxRef}
          className="relative h-[70vh] w-full overflow-hidden bg-black"
          style={{ touchAction: "none" }}
          onPointerDown={(event) => {
            drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onDoubleClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className="h-full w-full select-none object-contain"
            style={{
              transformOrigin: "0 0",
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          />
        </div>
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => step(1 / 1.4)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-background/85 text-primary backdrop-blur"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => step(1.4)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-background/85 text-primary backdrop-blur"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Close photo"
            onClick={() => onOpenChange(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-background/85 text-primary backdrop-blur"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}