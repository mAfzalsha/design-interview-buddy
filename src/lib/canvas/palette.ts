import type { NodeKind } from "./types";
import {
  Monitor,
  Server,
  Boxes,
  DoorOpen,
  Split,
  Database,
  Zap,
  ListOrdered,
  HardDrive,
  Globe,
  Component,
  type LucideIcon,
} from "lucide-react";

export interface PaletteItem {
  kind: NodeKind;
  label: string;
  icon: LucideIcon;
  /** semantic token name used for accents */
  tone: string;
}

export const PALETTE: PaletteItem[] = [
  { kind: "client", label: "Client", icon: Monitor, tone: "var(--node-client)" },
  { kind: "web-server", label: "Web server", icon: Server, tone: "var(--node-server)" },
  { kind: "app-service", label: "App service", icon: Boxes, tone: "var(--node-service)" },
  { kind: "api-gateway", label: "API gateway", icon: DoorOpen, tone: "var(--node-gateway)" },
  { kind: "load-balancer", label: "Load balancer", icon: Split, tone: "var(--node-balancer)" },
  { kind: "database", label: "Database", icon: Database, tone: "var(--node-data)" },
  { kind: "cache", label: "Cache", icon: Zap, tone: "var(--node-cache)" },
  { kind: "message-queue", label: "Message queue", icon: ListOrdered, tone: "var(--node-queue)" },
  { kind: "object-storage", label: "Object storage", icon: HardDrive, tone: "var(--node-storage)" },
  { kind: "cdn", label: "CDN", icon: Globe, tone: "var(--node-cdn)" },
  { kind: "generic", label: "Generic service", icon: Component, tone: "var(--node-generic)" },
];

export const paletteFor = (kind: NodeKind): PaletteItem =>
  PALETTE.find((p) => p.kind === kind) ?? PALETTE[PALETTE.length - 1]!;
