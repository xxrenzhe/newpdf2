"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

export type RedactionMode = "select" | "redact";

export type RedactionCanvasApi = {
  deleteSelection: () => void;
  hasSelection: () => boolean;
  serialize: () => string;
  applySerializedJson: (json: string) => Promise<void>;
};

type PdfRedactionCanvasProps = {
  width: number;
  height: number;
  mode: RedactionMode;
  initialJson?: string;
  onChange: (json: string) => void;
  onSelectionChange?: (hasSelection: boolean) => void;
  onApiReady?: (api: RedactionCanvasApi | null) => void;
};

const MIN_REDACTION_SIZE = 12;

export default function PdfRedactionCanvas({
  width,
  height,
  mode,
  initialJson,
  onChange,
  onSelectionChange,
  onApiReady,
}: PdfRedactionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const currentRef = useRef<fabric.Rect | null>(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const syncingRef = useRef(false);

  const notifySelection = useCallback(() => {
    if (!onSelectionChange) return;
    const canvas = fabricRef.current;
    onSelectionChange(!!canvas && canvas.getActiveObjects().length > 0);
  }, [onSelectionChange]);

  const loadCanvasJson = useCallback(
    async (canvas: fabric.Canvas, json?: string) => {
      syncingRef.current = true;
      canvas.clear();
      if (json) {
        const loadResult = (
          canvas as unknown as { loadFromJSON: (value: string, callback?: () => void) => unknown }
        ).loadFromJSON(json, () => {});
        if (loadResult instanceof Promise) {
          await loadResult;
        } else {
          await new Promise<void>((resolve) => {
            (
              canvas as unknown as { loadFromJSON: (value: string, callback: () => void) => void }
            ).loadFromJSON(json, () => resolve());
          });
        }
      }
      canvas.renderAll();
      notifySelection();
      syncingRef.current = false;
    },
    [notifySelection]
  );

  const save = useCallback(() => {
    if (syncingRef.current) return;
    const canvas = fabricRef.current;
    if (!canvas) return;
    onChange(JSON.stringify(canvas.toJSON()));
  }, [onChange]);

  const deleteSelection = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (!active.length) return;
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    notifySelection();
  }, [notifySelection]);

  useEffect(() => {
    const api: RedactionCanvasApi = {
      deleteSelection,
      hasSelection: () => {
        const canvas = fabricRef.current;
        return !!canvas && canvas.getActiveObjects().length > 0;
      },
      serialize: () => {
        const canvas = fabricRef.current;
        if (!canvas) return "";
        return JSON.stringify(canvas.toJSON());
      },
      applySerializedJson: async (json: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        await loadCanvasJson(canvas, json);
        save();
      },
    };
    onApiReady?.(api);
    return () => {
      onApiReady?.(null);
    };
  }, [deleteSelection, loadCanvasJson, onApiReady, save]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      selection: true,
    });
    fabricRef.current = canvas;

    canvas.on("object:added", save);
    canvas.on("object:modified", save);
    canvas.on("object:removed", save);
    canvas.on("selection:created", notifySelection);
    canvas.on("selection:updated", notifySelection);
    canvas.on("selection:cleared", notifySelection);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [height, notifySelection, save, width]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width, height });
  }, [width, height]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.selection = mode === "select";
    canvas.defaultCursor = mode === "select" ? "default" : "crosshair";
    canvas.forEachObject((obj) => {
      obj.selectable = mode === "select";
      obj.evented = mode === "select";
    });
    if (mode !== "select") {
      canvas.discardActiveObject();
    }
    canvas.renderAll();
    notifySelection();
  }, [mode, notifySelection]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const load = async () => {
      await loadCanvasJson(canvas, initialJson);
    };

    void load();
  }, [initialJson, loadCanvasJson]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const normalizeInputEvent = (event: Event | undefined): PointerEvent => {
      const mouseEvent = event as MouseEvent | PointerEvent | undefined;
      const pointerId =
        typeof (mouseEvent as PointerEvent | undefined)?.pointerId === "number"
          ? (mouseEvent as PointerEvent).pointerId
          : -1;
      const button = typeof mouseEvent?.button === "number" ? mouseEvent.button : 0;
      const clientX = typeof mouseEvent?.clientX === "number" ? mouseEvent.clientX : 0;
      const clientY = typeof mouseEvent?.clientY === "number" ? mouseEvent.clientY : 0;
      return { pointerId, button, clientX, clientY } as PointerEvent;
    };

    const resolvePointer = (event: PointerEvent) => {
      const primaryCanvas =
        (canvas as unknown as { upperCanvasEl?: HTMLCanvasElement }).upperCanvasEl ?? canvasRef.current;
      const rect = primaryCanvas?.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return { x: 0, y: 0 };
      }
      const x = ((event.clientX - rect.left) / rect.width) * canvas.getWidth();
      const y = ((event.clientY - rect.top) / rect.height) * canvas.getHeight();
      return { x, y };
    };

    const beginDraw = (event: PointerEvent) => {
      if (mode !== "redact") return;
      const pointer = resolvePointer(event);
      startRef.current = { x: pointer.x, y: pointer.y };
      isDrawingRef.current = true;
      activePointerIdRef.current = event.pointerId;
      setIsDrawing(true);

      const rect = new fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: "#000000",
        opacity: 1,
        selectable: false,
        evented: false,
      });
      canvas.add(rect);
      currentRef.current = rect;
    };

    const updateDraw = (event: PointerEvent) => {
      if (!isDrawingRef.current || mode !== "redact" || !startRef.current || !currentRef.current) return;
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) return;
      const pointer = resolvePointer(event);
      const startX = startRef.current.x;
      const startY = startRef.current.y;
      const rect = currentRef.current;
      rect.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
      });
      canvas.renderAll();
    };

    const endDraw = (event?: PointerEvent) => {
      if (!isDrawingRef.current || mode !== "redact") return;
      if (
        event &&
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      setIsDrawing(false);
      const rect = currentRef.current;
      if (event && startRef.current && rect) {
        const pointer = resolvePointer(event);
        rect.set({
          left: Math.min(startRef.current.x, pointer.x),
          top: Math.min(startRef.current.y, pointer.y),
          width: Math.abs(pointer.x - startRef.current.x),
          height: Math.abs(pointer.y - startRef.current.y),
        });
      }
      if (rect) {
        const rectWidth = rect.width ?? 0;
        const rectHeight = rect.height ?? 0;
        if (rectWidth < MIN_REDACTION_SIZE || rectHeight < MIN_REDACTION_SIZE) {
          canvas.remove(rect);
          canvas.renderAll();
          notifySelection();
          startRef.current = null;
          currentRef.current = null;
          return;
        }
        rect.set({ selectable: true, evented: true });
      }
      startRef.current = null;
      currentRef.current = null;
      save();
    };

    const onFabricMouseDown = (opt: fabric.TPointerEventInfo) => {
      beginDraw(normalizeInputEvent(opt.e));
    };

    const onFabricMouseMove = (opt: fabric.TPointerEventInfo) => {
      updateDraw(normalizeInputEvent(opt.e));
    };

    const onFabricMouseUp = (opt: fabric.TPointerEventInfo) => {
      endDraw(normalizeInputEvent(opt.e));
    };

    const fabricCanvas = canvas as unknown as { upperCanvasEl?: HTMLCanvasElement };
    const targets = [fabricCanvas.upperCanvasEl, canvasRef.current].filter(
      (el): el is HTMLCanvasElement => !!el
    );
    if (targets.length === 0) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.currentTarget as HTMLCanvasElement | null;
      if (target) {
        try {
          target.setPointerCapture?.(event.pointerId);
        } catch {
          // Some synthetic pointer events (e.g. tests) do not support pointer capture.
        }
      }
      beginDraw(event);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      updateDraw(event);
      if (isDrawingRef.current) event.preventDefault();
    };

    const onPointerUp = (event: PointerEvent) => {
      const target = event.currentTarget as HTMLCanvasElement | null;
      if (target) {
        try {
          if (target.hasPointerCapture?.(event.pointerId)) {
            target.releasePointerCapture?.(event.pointerId);
          }
        } catch {
          // Ignore pointer capture release failures.
        }
      }
      endDraw(event);
      event.preventDefault();
    };

    for (const target of targets) {
      target.addEventListener("pointerdown", onPointerDown);
      target.addEventListener("pointermove", onPointerMove);
      target.addEventListener("pointerup", onPointerUp);
      target.addEventListener("pointercancel", onPointerUp);
    }

    canvas.on("mouse:down", onFabricMouseDown);
    canvas.on("mouse:move", onFabricMouseMove);
    canvas.on("mouse:up", onFabricMouseUp);

    return () => {
      for (const target of targets) {
        target.removeEventListener("pointerdown", onPointerDown);
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerup", onPointerUp);
        target.removeEventListener("pointercancel", onPointerUp);
      }
      canvas.off("mouse:down", onFabricMouseDown);
      canvas.off("mouse:move", onFabricMouseMove);
      canvas.off("mouse:up", onFabricMouseUp);
    };
  }, [mode, notifySelection, save]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (mode !== "select") return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      deleteSelection();
      event.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteSelection, mode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ touchAction: "none" }}
      data-drawing={isDrawing ? "1" : "0"}
    />
  );
}
