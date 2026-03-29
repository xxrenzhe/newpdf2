import { createElement, type ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import ArrowRightLeft from "lucide-react/dist/esm/icons/arrow-right-left";
import Crop from "lucide-react/dist/esm/icons/crop";
import Eraser from "lucide-react/dist/esm/icons/eraser";
import FilePenLine from "lucide-react/dist/esm/icons/file-pen-line";
import Files from "lucide-react/dist/esm/icons/files";
import Highlighter from "lucide-react/dist/esm/icons/highlighter";
import Layers from "lucide-react/dist/esm/icons/layers";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import LayoutList from "lucide-react/dist/esm/icons/layout-list";
import Lock from "lucide-react/dist/esm/icons/lock";
import Minimize2 from "lucide-react/dist/esm/icons/minimize-2";
import PenTool from "lucide-react/dist/esm/icons/pen-tool";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw";
import Scissors from "lucide-react/dist/esm/icons/scissors";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Signature from "lucide-react/dist/esm/icons/signature";
import Stamp from "lucide-react/dist/esm/icons/stamp";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Unlock from "lucide-react/dist/esm/icons/lock-open";

type IconComponent = ComponentType<LucideProps>;

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
  return createElement(Icon, { className, "aria-hidden": true });
}
