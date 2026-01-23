"use client";

import { useState } from "react";
import type { AnnotationTool } from "./PDFAnnotationCanvas";
import {
  MousePointer2,
  Type,
  Highlighter,
  PenTool,
  Square,
  Circle,
  MoveRight,
  Minus,
  Eraser,
  Palette,
  RotateCcw,
  RotateCw,
  Trash2,
  ChevronDown
} from "lucide-react";

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
    icon: <MousePointer2 className="w-5 h-5" />,
  },
  {
    id: "text",
    label: "Text",
    icon: <Type className="w-5 h-5" />,
  },
  {
    id: "highlight",
    label: "Highlight",
    icon: <Highlighter className="w-5 h-5" />,
  },
  {
    id: "freehand",
    label: "Draw",
    icon: <PenTool className="w-5 h-5" />,
  },
  {
    id: "rectangle",
    label: "Rectangle",
    icon: <Square className="w-5 h-5" />,
  },
  {
    id: "circle",
    label: "Circle",
    icon: <Circle className="w-5 h-5" />,
  },
  {
    id: "arrow",
    label: "Arrow",
    icon: <MoveRight className="w-5 h-5" />,
  },
  {
    id: "line",
    label: "Line",
    icon: <Minus className="w-5 h-5" />,
  },
  {
    id: "eraser",
    label: "Eraser",
    icon: <Eraser className="w-5 h-5" />,
  },
];

const colors = [
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#4f46e5", // New Indigo
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
    <div className="flex flex-col bg-white border-r border-gray-200 py-3 w-[72px] items-center h-full shadow-sm">
      {/* Tools */}
      <div className="flex flex-col gap-2 w-full px-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${activeTool === tool.id
                ? "bg-primary text-white shadow-md shadow-indigo-200"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
              }`}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-8 h-px bg-gray-200 my-4" />

      {/* Color Picker */}
      <div className="relative w-full flex justify-center mb-2">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
          title="Color"
        >
          <div
            className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-gray-200 shadow-sm"
            style={{ backgroundColor: activeColor }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute left-14 top-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 w-48 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Stroke Color</div>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${activeColor === color ? "border-gray-900 ring-2 ring-gray-200" : "border-transparent"
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stroke Width */}
      <div className="relative w-full flex justify-center">
        <button
          onClick={() => setShowStrokeWidth(!showStrokeWidth)}
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-colors"
          title="Stroke Width"
        >
          <div className="flex items-center justify-center">
            <div
              className="rounded-full bg-current"
              style={{
                width: Math.min(strokeWidth * 2.5 + 4, 18),
                height: Math.min(strokeWidth * 2.5 + 4, 18),
              }}
            />
          </div>
        </button>
        {showStrokeWidth && (
          <div className="absolute left-14 top-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
            <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Stroke Width</div>
            <div className="flex flex-col gap-1">
              {strokeWidths.map((width) => (
                <button
                  key={width}
                  onClick={() => {
                    onStrokeWidthChange(width);
                    setShowStrokeWidth(false);
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-gray-50 transition-colors ${strokeWidth === width ? "bg-indigo-50 text-primary" : "text-gray-600"
                    }`}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: width + 4, height: width + 4 }}
                  />
                  <span className="text-sm font-medium">{width}px</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-8 h-px bg-gray-200 my-4" />

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full px-3">
        {onUndo && (
          <button
            onClick={onUndo}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Undo"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Redo"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors mt-2"
            title="Clear All"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
