import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  Copy,
  Link2,
  Loader2,
  MousePointer2,
  Redo2,
  StickyNote,
  Trash2,
  Undo2,
  Wifi,
  WifiOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { PalettePanel } from "./PalettePanel";
import { CanvasBoard, type Selection, type Tool, type Viewport } from "./CanvasBoard";
import { paletteFor } from "@/lib/canvas/palette";
import { uid, type NodeKind } from "@/lib/canvas/types";
import { localSessionRepository } from "@/lib/canvas/storage";
import { emptyCanvas } from "@/lib/canvas/types";
import { cn } from "@/lib/utils";
import type { Identity } from "@/lib/canvas/session-identity";

interface Props {
  sessionId: string;
  identity: Identity;
}

export function SessionWorkspace({ sessionId, identity }: Props) {
  const session = useInterviewSession(sessionId, identity.name, identity.role);
  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const [copied, setCopied] = useState(false);

  if (session.loadState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading canvas…
      </div>
    );
  }

  if (session.loadState !== "ready") {
    const notFound = session.loadState === "not-found";
    return (
      <div className="flex h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-lg border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <h1 className="mt-3 text-lg font-semibold">
            {notFound ? "This interview link is not available here" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {notFound
              ? "Canvases are stored in the browser that created them. You can still start a blank canvas on this link and collaborate from this device."
              : "The canvas could not be loaded. Please try again."}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={session.retry}>
              Retry
            </Button>
            {notFound && (
              <Button
                onClick={async () => {
                  await localSessionRepository.put({
                    meta: { id: sessionId, createdAt: Date.now(), title: "System design interview" },
                    canvas: emptyCanvas(identity.name),
                  });
                  session.retry();
                }}
              >
                Start blank canvas
              </Button>
            )}
          </div>
          <Link to="/" className="mt-4 inline-block text-xs text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const addNode = (kind: NodeKind) => {
    const item = paletteFor(kind);
    const count = session.canvas.nodes.length;
    session.update((c) => ({
      ...c,
      nodes: [
        ...c.nodes,
        {
          id: uid("node"),
          kind,
          label: item.label,
          x: 120 + (count % 5) * 180,
          y: 120 + Math.floor(count / 5) * 120,
          w: 150,
          h: 76,
          author: identity.name,
        },
      ],
    }));
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Session link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const statusMeta = {
    connected: { label: "Live", cls: "text-emerald-600", icon: Wifi },
    connecting: { label: "Connecting…", cls: "text-muted-foreground", icon: Loader2 },
    reconnecting: { label: "Reconnecting…", cls: "text-amber-600", icon: Loader2 },
    disconnected: { label: "Offline", cls: "text-destructive", icon: WifiOff },
  }[session.status];
  const StatusIcon = statusMeta.icon;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Link to="/" className="text-sm font-semibold">
          Design Canvas
        </Link>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Session {sessionId}
        </span>

        <div className="mx-auto flex items-center gap-1 rounded-md border p-1">
          <ToolButton active={tool === "select"} onClick={() => setTool("select")} label="Select">
            <MousePointer2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "connect"} onClick={() => setTool("connect")} label="Connect">
            <Link2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={tool === "note"} onClick={() => setTool("note")} label="Note">
            <StickyNote className="h-4 w-4" />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolButton onClick={session.undo} label="Undo">
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={session.redo} label="Redo">
            <Redo2 className="h-4 w-4" />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolButton
            onClick={() => setViewport((v) => ({ ...v, scale: Math.max(0.3, v.scale - 0.1) }))}
            label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </ToolButton>
          <span className="w-10 text-center text-xs text-muted-foreground">
            {Math.round(viewport.scale * 100)}%
          </span>
          <ToolButton
            onClick={() => setViewport((v) => ({ ...v, scale: Math.min(2.5, v.scale + 0.1) }))}
            label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </ToolButton>
        </div>

        <button
          onClick={session.reconnect}
          className={cn("flex items-center gap-1.5 text-xs", statusMeta.cls)}
          title="Reconnect"
        >
          <StatusIcon
            className={cn("h-3.5 w-3.5", session.status !== "connected" && session.status !== "disconnected" && "animate-spin")}
          />
          {statusMeta.label}
        </button>

        <div className="flex -space-x-2">
          {session.participants.map((p) => (
            <span
              key={p.id}
              title={`${p.name} (${p.role})`}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-secondary text-[11px] font-medium"
            >
              {p.name.slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" title="Clear canvas">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear the canvas?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes every component, connection and note for all participants.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  session.update((c) => ({ ...c, nodes: [], edges: [], notes: [] }))
                }
              >
                Clear
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size="sm" onClick={copyLink}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          Share link
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <PalettePanel onAdd={addNode} />
        <div className="relative min-w-0 flex-1">
          <CanvasBoard
            canvas={session.canvas}
            update={session.update}
            authorName={identity.name}
            tool={tool}
            setTool={setTool}
            selection={selection}
            setSelection={setSelection}
            viewport={viewport}
            setViewport={setViewport}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground">
            Last change by {session.canvas.updatedBy} · drag canvas to pan · scroll to zoom ·
            Delete to remove
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent",
        active && "bg-secondary text-secondary-foreground",
      )}
    >
      {children}
    </button>
  );
}
