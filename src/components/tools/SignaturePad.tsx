"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toPngDataUrl: () => string;
};

type SignaturePadProps = {
  className?: string;
};

function getPoint(e: PointerEvent, el: HTMLCanvasElement) {
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (el.width / rect.width);
  const y = (e.clientY - rect.top) * (el.height / rect.height);
  return { x, y };
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(({ className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasInk, setHasInk] = useState(false);
  const hasInkRef = useRef(false);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      clear,
      isEmpty: () => !hasInkRef.current,
      toPngDataUrl: () => canvasRef.current?.toDataURL("image/png") ?? "",
    }),
    [clear]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2c1e4a";

    const onPointerDown = (e: PointerEvent) => {
      drawingRef.current = true;
      if (typeof canvas.setPointerCapture === "function") {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic/unsupported pointer capture scenarios.
        }
      }
      lastRef.current = getPoint(e, canvas);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const last = lastRef.current;
      if (!last) return;
      const next = getPoint(e, canvas);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
      lastRef.current = next;
      hasInkRef.current = true;
      setHasInk(true);
    };

    const onPointerUp = () => {
      drawingRef.current = false;
      lastRef.current = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={900}
        height={300}
        className="w-full h-[120px] bg-white border border-[color:var(--brand-line)] rounded-lg touch-none"
      />
    </div>
  );
});

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
