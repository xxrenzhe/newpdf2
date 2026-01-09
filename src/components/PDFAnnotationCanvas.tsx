"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";

export type AnnotationTool =
  | "select"
  | "text"
  | "highlight"
  | "rectangle"
  | "circle"
  | "arrow"
  | "line"
  | "freehand"
  | "eraser";

interface PDFAnnotationCanvasProps {
  width: number;
  height: number;
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  onAnnotationsChange?: (annotations: string) => void;
}

export default function PDFAnnotationCanvas({
  width,
  height,
  activeTool,
  activeColor,
  strokeWidth,
  onAnnotationsChange,
}: PDFAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<fabric.Object | null>(null);

  // Initialize fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      selection: activeTool === "select",
      isDrawingMode: activeTool === "freehand",
    });

    fabricCanvasRef.current = canvas;

    // Handle canvas changes
    canvas.on("object:modified", () => {
      saveAnnotations();
    });

    canvas.on("object:added", () => {
      saveAnnotations();
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update canvas dimensions
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.setDimensions({ width, height });
  }, [width, height]);

  // Update tool mode
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    canvas.isDrawingMode = activeTool === "freehand";
    canvas.selection = activeTool === "select";

    if (activeTool === "freehand" && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = strokeWidth;
    }

    // Set cursor based on tool
    switch (activeTool) {
      case "select":
        canvas.defaultCursor = "default";
        break;
      case "text":
        canvas.defaultCursor = "text";
        break;
      case "eraser":
        canvas.defaultCursor = "not-allowed";
        break;
      default:
        canvas.defaultCursor = "crosshair";
    }
  }, [activeTool, activeColor, strokeWidth]);

  const saveAnnotations = useCallback(() => {
    if (!fabricCanvasRef.current || !onAnnotationsChange) return;
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    onAnnotationsChange(json);
  }, [onAnnotationsChange]);

  // Handle mouse events for shape drawing
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;

    const handleMouseDown = (opt: fabric.TPointerEventInfo) => {
      if (activeTool === "select" || activeTool === "freehand") return;

      const pointer = canvas.getViewportPoint(opt.e);
      startPointRef.current = { x: pointer.x, y: pointer.y };
      setIsDrawing(true);

      if (activeTool === "text") {
        // Add text at click position
        const text = new fabric.IText("Click to edit", {
          left: pointer.x,
          top: pointer.y,
          fontSize: 16,
          fill: activeColor,
          fontFamily: "Arial",
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        return;
      }

      if (activeTool === "eraser") {
        // Find and remove object at click position
        const target = canvas.findTarget(opt.e);
        if (target) {
          canvas.remove(target);
          saveAnnotations();
        }
        return;
      }

      // Create shape based on tool
      let shape: fabric.Object | null = null;

      switch (activeTool) {
        case "rectangle":
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: "transparent",
            stroke: activeColor,
            strokeWidth: strokeWidth,
          });
          break;
        case "circle":
          shape = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: "transparent",
            stroke: activeColor,
            strokeWidth: strokeWidth,
          });
          break;
        case "highlight":
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 20,
            fill: activeColor,
            opacity: 0.3,
          });
          break;
        case "line":
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: activeColor,
            strokeWidth: strokeWidth,
          });
          break;
        case "arrow":
          shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: activeColor,
            strokeWidth: strokeWidth,
          });
          break;
      }

      if (shape) {
        canvas.add(shape);
        currentShapeRef.current = shape;
      }
    };

    const handleMouseMove = (opt: fabric.TPointerEventInfo) => {
      if (!isDrawing || !startPointRef.current || !currentShapeRef.current) return;
      if (activeTool === "select" || activeTool === "freehand" || activeTool === "text" || activeTool === "eraser") return;

      const pointer = canvas.getViewportPoint(opt.e);
      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;

      switch (activeTool) {
        case "rectangle":
        case "highlight": {
          const rect = currentShapeRef.current as fabric.Rect;
          const width = Math.abs(pointer.x - startX);
          const height = activeTool === "highlight" ? 20 : Math.abs(pointer.y - startY);
          rect.set({
            left: Math.min(startX, pointer.x),
            top: Math.min(startY, pointer.y),
            width,
            height,
          });
          break;
        }
        case "circle": {
          const circle = currentShapeRef.current as fabric.Circle;
          const radius = Math.sqrt(
            Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)
          ) / 2;
          circle.set({
            radius,
            left: startX - radius,
            top: startY - radius,
          });
          break;
        }
        case "line":
        case "arrow": {
          const line = currentShapeRef.current as fabric.Line;
          line.set({ x2: pointer.x, y2: pointer.y });
          break;
        }
      }

      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;
      setIsDrawing(false);

      if (activeTool === "arrow" && currentShapeRef.current) {
        // Add arrowhead
        const line = currentShapeRef.current as fabric.Line;
        const x1 = line.x1 || 0;
        const y1 = line.y1 || 0;
        const x2 = line.x2 || 0;
        const y2 = line.y2 || 0;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15;

        const arrowHead = new fabric.Triangle({
          left: x2,
          top: y2,
          width: headLength,
          height: headLength,
          fill: activeColor,
          angle: (angle * 180) / Math.PI + 90,
          originX: "center",
          originY: "center",
        });

        canvas.add(arrowHead);

        // Group line and arrowhead
        const group = new fabric.Group([line, arrowHead], {});
        canvas.remove(line);
        canvas.remove(arrowHead);
        canvas.add(group);
      }

      startPointRef.current = null;
      currentShapeRef.current = null;
      saveAnnotations();
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
    };
  }, [activeTool, activeColor, strokeWidth, isDrawing, saveAnnotations]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ touchAction: "none" }}
    />
  );
}
