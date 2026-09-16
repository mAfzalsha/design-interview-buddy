import type { CanvasState, Participant } from "./types";

/**
 * Collaboration transport interface — mirrors `WS /sessions/:sessionId`.
 * The mock below uses BroadcastChannel so two browser tabs behave like two
 * connected participants. Swap this implementation for a real WebSocket
 * client later without touching the canvas UI.
 */
export type RealtimeEvent =
  | { type: "canvas"; canvas: CanvasState; from: Participant }
  | { type: "presence"; from: Participant }
  | { type: "leave"; from: Participant };

export type StatusListener = (
  status: "connecting" | "connected" | "reconnecting" | "disconnected",
) => void;

export interface RealtimeClient {
  connect(): void;
  disconnect(): void;
  send(event: RealtimeEvent): void;
  onEvent(cb: (event: RealtimeEvent) => void): () => void;
  onStatus(cb: StatusListener): () => void;
}

export function createMockRealtimeClient(
  sessionId: string,
  self: Participant,
): RealtimeClient {
  let channel: BroadcastChannel | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const eventCbs = new Set<(e: RealtimeEvent) => void>();
  const statusCbs = new Set<StatusListener>();
  const emitStatus: StatusListener = (s) => statusCbs.forEach((cb) => cb(s));

  return {
    connect() {
      if (typeof window === "undefined" || channel) return;
      emitStatus("connecting");
      window.setTimeout(() => {
        channel = new BroadcastChannel(`sdic:${sessionId}`);
        channel.onmessage = (ev) => {
          const data = ev.data as RealtimeEvent;
          if (data.from.id === self.id) return;
          eventCbs.forEach((cb) => cb(data));
        };
        emitStatus("connected");
        channel.postMessage({ type: "presence", from: self } satisfies RealtimeEvent);
        heartbeat = setInterval(() => {
          channel?.postMessage({ type: "presence", from: { ...self, lastSeen: Date.now() } });
        }, 2000);
      }, 600);
    },
    disconnect() {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      channel?.postMessage({ type: "leave", from: self } satisfies RealtimeEvent);
      channel?.close();
      channel = null;
      emitStatus("disconnected");
    },
    send(event) {
      if (!channel) return;
      channel.postMessage(event);
    },
    onEvent(cb) {
      eventCbs.add(cb);
      return () => eventCbs.delete(cb);
    },
    onStatus(cb) {
      statusCbs.add(cb);
      return () => statusCbs.delete(cb);
    },
  };
}
