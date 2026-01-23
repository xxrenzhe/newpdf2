import { createElement, type ComponentType } from "react";
import {
  ArrowRightLeft,
  Crop,
  Eraser,
  FilePenLine,
  Files,
  Highlighter,
  LayoutGrid,
  LayoutList,
  Layers,
  Lock,
  Minimize2,
  PenTool,
  RotateCw,
  Scissors,
  ShieldCheck,
  Signature,
  Stamp,
  Trash2,
  Unlock,
} from "lucide-react";

type IconComponent = ComponentType<{ className?: string }>;

export const TOOL_ICON_MAP: Record<string, IconComponent> = {
  LayoutGrid,
  PenTool,
  ArrowRightLeft,
  Layers,
  ShieldCheck,
  Highlighter,
  FilePenLine,
  Signature,
  Eraser,
  Stamp,
  Minimize2,
  Files,
  Scissors,
  LayoutList,
  RotateCw,
  Trash2,
  Crop,
  Lock,
  Unlock,
  grid: LayoutGrid,
  edit: PenTool,
  convert: ArrowRightLeft,
  organize: Layers,
  security: ShieldCheck,
};

export function getToolIcon(name?: string): IconComponent {
  if (!name) return Files;
  return TOOL_ICON_MAP[name] ?? Files;
}

export function ToolIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = getToolIcon(name);
  return createElement(Icon, { className, "aria-hidden": "true" });
}
