import { useCallback, useEffect, useRef, useState } from "react";
import { paletteFor } from "@/lib/canvas/palette";
import {
  uid,
  type CanvasState,
  type CanvasNode,
  type CanvasNote,
  type NodeKind,
} from "@/lib/canvas/types";
import { cn } from "@/lib/utils";

export type Tool = "select" | "connect" | "note";
export interface Selection {
  kind: "node" | "edge" | "note";
  id: string;
}
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  canvas: CanvasState;
  update: (fn: (c: CanvasState) => CanvasState, history?: boolean) => void;
  authorName: string;
  tool: Tool;
  setTool: (t: Tool) => void;
  selection: Selection | null;
  setSelection: (s: Selection | null) => void;
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
}

const centerOf = (n: CanvasNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

function edgePoint(from: CanvasNode, to: CanvasNode) {
  const a = centerOf(from);
  const b = centerOf(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const hw = to.w / 2 + 6;
  const hh = to.h / 2 + 6;
  if (dx === 0 && dy === 0) return b;
  const scale = Math.min(
    Math.abs(dx) > 0 ? hw / Math.abs(dx) : Infinity,
    Math.abs(dy) > 0 ? hh / Math.abs(dy) : Infinity,
  );
  return { x: b.x - dx * scale, y: b.y - dy * scale };
}

export function CanvasBoard({
  canvas,
  update,
  authorName,
  tool,
  setTool,
  selection,
  setSelection,
  viewport,
  setViewport,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const drag = useRef<
    | null
    | { mode: "pan"; sx: number; sy: number; ox: number; oy: number }
    | { mode: "move" | "resize"; id: string; itemKind: "node" | "note"; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number }
  >(null);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - viewport.x) / viewport.scale,
        y: (clientY - rect.top - viewport.y) / viewport.scale,
      };
    },
    [viewport],
  );

  const addNoteAt = (x: number, y: number) => {
    const note: CanvasNote = {
      id: uid("note"),
      text: "New note",
      x: x - 90,
      y: y - 40,
      w: 180,
      h: 90,
      author: authorName,
    };
    update((c) => ({ ...c, notes: [...c.notes, note] }));
    setSelection({ kind: "note", id: note.id });
    setEditingNote(note.id);
    setTool("select");
  };

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const w = toWorld(e.clientX, e.clientY);
    if (tool === "note" && e.button === 0) {
      addNoteAt(w.x, w.y);
      return;
    }
    setSelection(null);
    setConnectFrom(null);
    drag.current = { mode: "pan", sx: e.clientX, sy: e.clientY, ox: viewport.x, oy: viewport.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === "pan") {
      setViewport((v) => ({ ...v, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) }));
      return;
    }
    const dx = (e.clientX - d.sx) / viewport.scale;
    const dy = (e.clientY - d.sy) / viewport.scale;
    if (d.mode === "move") {
      update(
        (c) =>
          d.itemKind === "node"
            ? { ...c, nodes: c.nodes.map((n) => (n.id === d.id ? { ...n, x: d.ox + dx, y: d.oy + dy } : n)) }
            : { ...c, notes: c.notes.map((n) => (n.id === d.id ? { ...n, x: d.ox + dx, y: d.oy + dy } : n)) },
        false,
      );
    } else {
      const w = Math.max(90, d.ow + dx);
      const h = Math.max(60, d.oh + dy);
      update(
        (c) =>
          d.itemKind === "node"
            ? { ...c, nodes: c.nodes.map((n) => (n.id === d.id ? { ...n, w, h } : n)) }
            : { ...c, notes: c.notes.map((n) => (n.id === d.id ? { ...n, w, h } : n)) },
        false,
      );
    }
  };

  const endDrag = () => {
    drag.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const delta = -e.deltaY * 0.0015;
    setViewport((v) => {
      const scale = Math.min(2.5, Math.max(0.3, v.scale * (1 + delta)));
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ratio = scale / v.scale;
      return { scale, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio };
    });
  };

  const startItemDrag = (
    e: React.PointerEvent,
    id: string,
    itemKind: "node" | "note",
    mode: "move" | "resize",
    item: { x: number; y: number; w: number; h: number },
  ) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      mode,
      id,
      itemKind,
      sx: e.clientX,
      sy: e.clientY,
      ox: item.x,
      oy: item.y,
      ow: item.w,
      oh: item.h,
    };
    setSelection({ kind: itemKind, id });
  };

  const handleNodeClick = (id: string) => {
    if (tool !== "connect") return;
    if (!connectFrom) {
      setConnectFrom(id);
      return;
    }
    if (connectFrom !== id) {
      update((c) => ({
        ...c,
        edges: [...c.edges, { id: uid("edge"), from: connectFrom, to: id, author: authorName }],
      }));
    }
    setConnectFrom(null);
    setTool("select");
  };

  // delete key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection) {
        e.preventDefault();
        update((c) => {
          if (selection.kind === "node")
            return {
              ...c,
              nodes: c.nodes.filter((n) => n.id !== selection.id),
              edges: c.edges.filter((ed) => ed.from !== selection.id && ed.to !== selection.id),
            };
          if (selection.kind === "note")
            return { ...c, notes: c.notes.filter((n) => n.id !== selection.id) };
          return { ...c, edges: c.edges.filter((ed) => ed.id !== selection.id) };
        });
        setSelection(null);
      }
      if (e.key === "Escape") {
        setSelection(null);
        setConnectFrom(null);
        setTool("select");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selection, setSelection, setTool, update]);

  const nodeById = (id: string) => canvas.nodes.find((n) => n.id === id);

  return (
    <div
      ref={wrapRef}
      onPointerDown={onBackgroundPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData("application/x-node-kind") as NodeKind;
        if (!kind) return;
        const w = toWorld(e.clientX, e.clientY);
        const item = paletteFor(kind);
        const node: CanvasNode = {
          id: uid("node"),
          kind,
          label: item.label,
          x: w.x - 70,
          y: w.y - 35,
          w: 150,
          h: 76,
          author: authorName,
        };
        update((c) => ({ ...c, nodes: [...c.nodes, node] }));
        setSelection({ kind: "node", id: node.id });
      }}
      className={cn(
        "relative h-full w-full overflow-hidden bg-canvas",
        tool === "note" ? "cursor-crosshair" : "cursor-grab",
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--canvas-dot) 1px, transparent 0)",
        backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
      }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        <svg className="pointer-events-none absolute overflow-visible" width={1} height={1}>
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)" />
            </marker>
          </defs>
          {canvas.edges.map((edge) => {
            const from = nodeById(edge.from);
            const to = nodeById(edge.to);
            if (!from || !to) return null;
            const a = centerOf(from);
            const b = edgePoint(from, to);
            const active = selection?.kind === "edge" && selection.id === edge.id;
            return (
              <g key={edge.id} className="pointer-events-auto">
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={14}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelection({ kind: "edge", id: edge.id });
                  }}
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? "var(--color-ring)" : "var(--edge-color)"}
                  strokeWidth={active ? 2.5 : 1.75}
                  markerEnd="url(#arrow)"
                />
              </g>
            );
          })}
        </svg>

        {canvas.nodes.map((node) => {
          const item = paletteFor(node.kind);
          const Icon = item.icon;
          const selected = selection?.kind === "node" && selection.id === node.id;
          const pending = connectFrom === node.id;
          return (
            <div
              key={node.id}
              onPointerDown={(e) => {
                if (tool === "connect") {
                  e.stopPropagation();
                  return;
                }
                startItemDrag(e, node.id, "node", "move", node);
              }}
              onClick={() => handleNodeClick(node.id)}
              className={cn(
                "group absolute flex select-none flex-col justify-between rounded-lg border-2 bg-card p-2 shadow-sm transition-shadow",
                selected ? "border-ring shadow-md" : "border-border",
                pending && "border-ring ring-2 ring-ring/40",
                tool === "connect" ? "cursor-pointer" : "cursor-move",
              )}
              style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
            >
              <span
                className="absolute inset-x-0 top-0 h-1 rounded-t"
                style={{ background: item.tone }}
              />
              <div className="mt-1 flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0" style={{ color: item.tone }} />
                <input
                  value={node.label}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    update((c) => ({
                      ...c,
                      nodes: c.nodes.map((n) =>
                        n.id === node.id ? { ...n, label: e.target.value, author: authorName } : n,
                      ),
                    }))
                  }
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>
              <span className="truncate text-[10px] text-muted-foreground">
                {item.label} · {node.author}
              </span>
              <span
                onPointerDown={(e) => startItemDrag(e, node.id, "node", "resize", node)}
                className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm border border-border bg-background opacity-0 group-hover:opacity-100"
              />
            </div>
          );
        })}

        {canvas.notes.map((note) => {
          const selected = selection?.kind === "note" && selection.id === note.id;
          return (
            <div
              key={note.id}
              onPointerDown={(e) => startItemDrag(e, note.id, "note", "move", note)}
              onDoubleClick={() => setEditingNote(note.id)}
              className={cn(
                "group absolute rounded-md border bg-note p-2 shadow-sm",
                selected ? "border-ring" : "border-border",
              )}
              style={{ left: note.x, top: note.y, width: note.w, height: note.h }}
            >
              {editingNote === note.id ? (
                <textarea
                  autoFocus
                  value={note.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={() => setEditingNote(null)}
                  onChange={(e) =>
                    update((c) => ({
                      ...c,
                      notes: c.notes.map((n) =>
                        n.id === note.id ? { ...n, text: e.target.value, author: authorName } : n,
                      ),
                    }))
                  }
                  className="h-full w-full resize-none bg-transparent text-xs outline-none"
                />
              ) : (
                <p className="h-full w-full overflow-hidden whitespace-pre-wrap text-xs">
                  {note.text}
                </p>
              )}
              <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
                {note.author}
              </span>
              <span
                onPointerDown={(e) => startItemDrag(e, note.id, "note", "resize", note)}
                className="absolute -bottom-1 -right-1 h-3 w-3 cursor-se-resize rounded-sm border border-border bg-background opacity-0 group-hover:opacity-100"
              />
            </div>
          );
        })}
      </div>

      {tool === "connect" && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">
          {connectFrom ? "Click the target component" : "Click the source component"}
        </div>
      )}
    </div>
  );
}
