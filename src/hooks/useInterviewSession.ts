import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mockSessionApi, ApiError } from "@/lib/canvas/api";
import { createMockRealtimeClient, type RealtimeClient } from "@/lib/canvas/realtime";
import {
  emptyCanvas,
  uid,
  type CanvasState,
  type ConnectionStatus,
  type Participant,
  type SessionMeta,
} from "@/lib/canvas/types";

type LoadState = "loading" | "ready" | "not-found" | "error";

export function useInterviewSession(
  sessionId: string,
  name: string,
  role: Participant["role"],
) {
  const self = useMemo<Participant>(
    () => ({ id: uid("p"), name, role, lastSeen: Date.now() }),
    [name, role],
  );

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [canvas, setCanvasState] = useState<CanvasState>(() => emptyCanvas(name));
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [peers, setPeers] = useState<Participant[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const clientRef = useRef<RealtimeClient | null>(null);
  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;

  // history
  const past = useRef<CanvasState[]>([]);
  const future = useRef<CanvasState[]>([]);

  // load session
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    mockSessionApi
      .getSession(sessionId)
      .then((record) => {
        if (cancelled) return;
        setMeta(record.meta);
        setCanvasState(record.canvas);
        setLoadState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState(err instanceof ApiError && err.status === 404 ? "not-found" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadKey]);

  // realtime
  useEffect(() => {
    if (loadState !== "ready") return;
    const client = createMockRealtimeClient(sessionId, self);
    clientRef.current = client;
    const offStatus = client.onStatus(setStatus);
    const offEvent = client.onEvent((event) => {
      if (event.type === "presence") {
        setPeers((prev) => {
          const rest = prev.filter((p) => p.id !== event.from.id);
          return [...rest, { ...event.from, lastSeen: Date.now() }];
        });
        // answer so the newcomer learns about us
        client.send({ type: "presence", from: { ...self, lastSeen: Date.now() } });
      } else if (event.type === "leave") {
        setPeers((prev) => prev.filter((p) => p.id !== event.from.id));
      } else if (event.type === "canvas") {
        // last-update-wins
        if (event.canvas.updatedAt >= canvasRef.current.updatedAt) {
          setCanvasState(event.canvas);
          void mockSessionApi.saveCanvas(sessionId, event.canvas);
        }
      }
    });
    client.connect();

    const prune = setInterval(() => {
      setPeers((prev) => prev.filter((p) => Date.now() - p.lastSeen < 7000));
    }, 3000);

    return () => {
      clearInterval(prune);
      offStatus();
      offEvent();
      client.disconnect();
      clientRef.current = null;
    };
  }, [loadState, sessionId, self]);

  const commit = useCallback(
    (next: CanvasState, options?: { history?: boolean }) => {
      if (options?.history !== false) {
        past.current = [...past.current.slice(-49), canvasRef.current];
        future.current = [];
      }
      setCanvasState(next);
      canvasRef.current = next;
      void mockSessionApi.saveCanvas(sessionId, next);
      clientRef.current?.send({ type: "canvas", canvas: next, from: self });
    },
    [sessionId, self],
  );

  const update = useCallback(
    (fn: (c: CanvasState) => CanvasState, history = true) => {
      const base = canvasRef.current;
      const next = { ...fn(base), updatedAt: Date.now(), updatedBy: name };
      commit(next, { history });
    },
    [commit, name],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(canvasRef.current);
    commit({ ...prev, updatedAt: Date.now(), updatedBy: name }, { history: false });
  }, [commit, name]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(canvasRef.current);
    commit({ ...next, updatedAt: Date.now(), updatedBy: name }, { history: false });
  }, [commit, name]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const reconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current?.connect();
  }, []);

  return {
    self,
    meta,
    loadState,
    canvas,
    status,
    participants: [{ ...self, lastSeen: Date.now() }, ...peers],
    update,
    undo,
    redo,
    retry,
    reconnect,
  };
}
