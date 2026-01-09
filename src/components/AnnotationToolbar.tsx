"use client";

import { useState } from "react";
import type { AnnotationTool } from "./PDFAnnotationCanvas";

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  activeColor: string;
  strokeWidth: number;
  onToolChange: (tool: AnnotationTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
}

const tools: { id: AnnotationTool; label: string; icon: React.ReactNode }[] = [
  {
    id: "select",
    label: "Select",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
    ),
  },
  {
    id: "text",
    label: "Text",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
      </svg>
    ),
  },
  {
    id: "highlight",
    label: "Highlight",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: "freehand",
    label: "Draw",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: "circle",
    label: "Circle",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    ),
  },
  {
    id: "line",
    label: "Line",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    ),
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 20H9L3.5 14.5a2.121 2.121 0 0 1 0-3l9-9a2.121 2.121 0 0 1 3 0L20 7" />
        <path d="M5.5 16.5L14 8" />
      </svg>
    ),
  },
];

const colors = [
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const strokeWidths = [1, 2, 3, 5, 8];

export default function AnnotationToolbar({
  activeTool,
  activeColor,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onClear,
}: AnnotationToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStrokeWidth, setShowStrokeWidth] = useState(false);

  return (
    <div className="flex flex-col bg-white border-r border-gray-200 py-2">
      {/* Tools */}
      <div className="flex flex-col gap-1 px-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
              activeTool === tool.id
                ? "bg-[#2d85de] text-white"
                : "hover:bg-gray-100 text-gray-600"
            }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 my-2" />

      {/* Color Picker */}
      <div className="relative px-2">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
          title="Color"
        >
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: activeColor }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
            <div className="grid grid-cols-4 gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-full border-2 ${
                    activeColor === color ? "border-gray-800" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stroke Width */}
      <div className="relative px-2">
        <button
          onClick={() => setShowStrokeWidth(!showStrokeWidth)}
          className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
          title="Stroke Width"
        >
          <div className="flex items-center justify-center">
            <div
              className="rounded-full bg-gray-600"
              style={{
                width: Math.min(strokeWidth * 3, 20),
                height: Math.min(strokeWidth * 3, 20),
              }}
            />
          </div>
        </button>
        {showStrokeWidth && (
          <div className="absolute left-12 top-0 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
            <div className="flex flex-col gap-1">
              {strokeWidths.map((width) => (
                <button
                  key={width}
                  onClick={() => {
                    onStrokeWidthChange(width);
                    setShowStrokeWidth(false);
                  }}
                  className={`px-3 py-2 rounded flex items-center gap-2 hover:bg-gray-100 ${
                    strokeWidth === width ? "bg-blue-50" : ""
                  }`}
                >
                  <div
                    className="rounded-full bg-gray-600"
                    style={{ width: width * 2, height: width * 2 }}
                  />
                  <span className="text-sm text-gray-700">{width}px</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 my-2" />

      {/* Actions */}
      <div className="flex flex-col gap-1 px-2">
        {onUndo && (
          <button
            onClick={onUndo}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
            title="Undo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
            title="Redo"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
            </svg>
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 text-red-500"
            title="Clear All"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
