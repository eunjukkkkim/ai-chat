import type { LucideProps } from "lucide-react";
import {
  ArrowUp,
  Check,
  Copy,
  Hexagon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Square,
  X,
} from "lucide-react";

type AppIconProps = Omit<LucideProps, "ref">;

const defaultIconProps = {
  "aria-hidden": true,
  focusable: false,
} as const;

export function CopyIcon(props: AppIconProps) {
  return <Copy size={13} strokeWidth={2} {...defaultIconProps} {...props} />;
}

export function CheckIcon(props: AppIconProps) {
  return (
    <Check
      size={15}
      color="#5fb8a3"
      strokeWidth={2.4}
      {...defaultIconProps}
      {...props}
    />
  );
}

export function RefreshIcon(props: AppIconProps) {
  return (
    <RefreshCw size={15} strokeWidth={2} {...defaultIconProps} {...props} />
  );
}

export function XIcon(props: AppIconProps) {
  return <X size={10} strokeWidth={2.5} {...defaultIconProps} {...props} />;
}

export function SidebarCloseIcon(props: AppIconProps) {
  return (
    <PanelLeftClose
      size={20}
      strokeWidth={2}
      {...defaultIconProps}
      {...props}
    />
  );
}

export function EmptyChatIcon(props: AppIconProps) {
  return (
    <Hexagon size={24} strokeWidth={1.8} {...defaultIconProps} {...props} />
  );
}

export function SidebarOpenIcon(props: AppIconProps) {
  return (
    <PanelLeftOpen size={20} strokeWidth={2} {...defaultIconProps} {...props} />
  );
}

export function SendIcon(props: AppIconProps) {
  return (
    <ArrowUp size={14} strokeWidth={2.5} {...defaultIconProps} {...props} />
  );
}

export function StopIcon(props: AppIconProps) {
  return (
    <Square
      size={12}
      fill="currentColor"
      strokeWidth={0}
      {...defaultIconProps}
      {...props}
    />
  );
}
