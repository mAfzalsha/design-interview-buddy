export type NodeKind =
  | "client"
  | "web-server"
  | "app-service"
  | "api-gateway"
  | "load-balancer"
  | "database"
  | "cache"
  | "message-queue"
  | "object-storage"
  | "cdn"
  | "generic";

export interface CanvasNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  author: string;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  author: string;
}

export interface CanvasNote {
  id: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  author: string;
}

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  notes: CanvasNote[];
  updatedAt: number;
  updatedBy: string;
}

export interface SessionMeta {
  id: string;
  createdAt: number;
  title: string;
}

export interface SessionRecord {
  meta: SessionMeta;
  canvas: CanvasState;
}

export interface Participant {
  id: string;
  name: string;
  role: "interviewer" | "candidate";
  lastSeen: number;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export const emptyCanvas = (author = "system"): CanvasState => ({
  nodes: [],
  edges: [],
  notes: [],
  updatedAt: Date.now(),
  updatedBy: author,
});

export const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
