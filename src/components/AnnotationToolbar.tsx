"use client";

import { useState } from "react";
import type { AnnotationTool } from "./PDFAnnotationCanvas";
import {
  MousePointer2,
  Type,
  TextCursorInput,
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
import { useLanguage } from "@/components/LanguageProvider";

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

const colors = [
  "#1f1a2b",
  "#ef4444",
  "#f28c28",
  "#eab308",
  "#22c55e",
  "#5b4bb7",
  "#8b6cff",
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
  const { t } = useLanguage();
  const toolRows: { id: AnnotationTool; label: string; icon: React.ReactNode }[][] = [
    [
      {
        id: "select",
        label: t("toolSelect", "Select"),
        icon: <MousePointer2 className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "editText",
        label: t("toolEditText", "Edit Text"),
        icon: <TextCursorInput className="w-5 h-5" />,
      },
      {
        id: "addText",
        label: t("toolAddText", "Add Text"),
        icon: <Type className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "highlight",
        label: t("toolHighlight", "Highlight"),
        icon: <Highlighter className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "freehand",
        label: t("toolDraw", "Draw"),
        icon: <PenTool className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "rectangle",
        label: t("toolRectangle", "Rectangle"),
        icon: <Square className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "circle",
        label: t("toolCircle", "Circle"),
        icon: <Circle className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "arrow",
        label: t("toolArrow", "Arrow"),
        icon: <MoveRight className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "line",
        label: t("toolLine", "Line"),
        icon: <Minus className="w-5 h-5" />,
      },
    ],
    [
      {
        id: "eraser",
        label: t("toolEraser", "Eraser"),
        icon: <Eraser className="w-5 h-5" />,
      },
    ],
  ];

  return (
    <div className="flex flex-col bg-white border-r border-[color:var(--brand-line)] py-3 w-[104px] items-center h-full shadow-sm">
      {/* Tools */}
      <div className="flex flex-col gap-2 w-full px-2 items-center">
        {toolRows.map((row, rowIndex) => {
          const isGroupedRow = row.length > 1;
          return (
            <div
              key={`tool-row-${rowIndex}`}
              className={isGroupedRow ? "grid grid-cols-2 gap-2 w-full" : "flex w-full justify-center"}
            >
              {row.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  aria-label={tool.label}
                  className={`${isGroupedRow ? "h-10 w-full" : "w-12 h-12"
                    } rounded-xl flex items-center justify-center transition-colors transition-shadow duration-200 ${activeTool === tool.id
                      ? "bg-primary text-white shadow-md shadow-[rgba(91,75,183,0.25)]"
                      : "hover:bg-[color:var(--brand-cream)] text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)]"
                    }`}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="w-8 h-px bg-[color:var(--brand-line)] my-4" />

      {/* Color Picker */}
      <div className="relative w-full flex justify-center mb-2">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          aria-label={t("colorLabel", "Color")}
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-[color:var(--brand-cream)] transition-colors border border-transparent hover:border-[color:var(--brand-line)]"
          title={t("colorLabel", "Color")}
        >
          <div
            className="w-7 h-7 rounded-full border-2 border-white ring-1 ring-[color:var(--brand-line)] shadow-sm"
            style={{ backgroundColor: activeColor }}
          />
        </button>
        {showColorPicker && (
          <div className="absolute left-14 top-0 bg-white rounded-xl shadow-xl border border-[color:var(--brand-line)] p-3 z-50 w-48 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-xs font-semibold text-[color:var(--brand-muted)] mb-2 uppercase tracking-wider">
              {t("strokeColorLabel", "Stroke Color")}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  aria-label={`${t("colorLabel", "Color")} ${color}`}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${activeColor === color ? "border-[color:var(--brand-ink)] ring-2 ring-[color:var(--brand-line)]" : "border-transparent"
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
          aria-label={t("strokeWidthLabel", "Stroke Width")}
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-[color:var(--brand-cream)] text-[color:var(--brand-muted)] transition-colors"
          title={t("strokeWidthLabel", "Stroke Width")}
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
          <div className="absolute left-14 top-0 bg-white rounded-xl shadow-xl border border-[color:var(--brand-line)] p-3 z-50 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
            <div className="text-xs font-semibold text-[color:var(--brand-muted)] mb-2 uppercase tracking-wider">
              {t("strokeWidthLabel", "Stroke Width")}
            </div>
            <div className="flex flex-col gap-1">
              {strokeWidths.map((width) => (
                <button
                  key={width}
                  onClick={() => {
                    onStrokeWidthChange(width);
                    setShowStrokeWidth(false);
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-3 hover:bg-[color:var(--brand-cream)] transition-colors ${strokeWidth === width ? "bg-[color:var(--brand-lilac)] text-primary" : "text-[color:var(--brand-muted)]"
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

      <div className="w-8 h-px bg-[color:var(--brand-line)] my-4" />

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full px-3">
        {onUndo && (
          <button
            onClick={onUndo}
            aria-label={t("undo", "Undo")}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-[color:var(--brand-cream)] text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)] transition-colors"
            title={t("undo", "Undo")}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        {onRedo && (
          <button
            onClick={onRedo}
            aria-label={t("redo", "Redo")}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-[color:var(--brand-cream)] text-[color:var(--brand-muted)] hover:text-[color:var(--brand-ink)] transition-colors"
            title={t("redo", "Redo")}
          >
            <RotateCw className="w-5 h-5" />
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            aria-label={t("clearAll", "Clear All")}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors mt-2"
            title={t("clearAll", "Clear All")}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
