import type { CanvasState, SessionRecord } from "./types";

/**
 * Persistence behind a repository interface so it can later be swapped for
 * backend persistence without touching the canvas UI.
 */
export interface SessionRepository {
  get(sessionId: string): Promise<SessionRecord | null>;
  put(record: SessionRecord): Promise<void>;
  saveCanvas(sessionId: string, canvas: CanvasState): Promise<void>;
}

const KEY = (id: string) => `sdic:session:${id}`;

export const localSessionRepository: SessionRepository = {
  async get(sessionId) {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(KEY(sessionId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionRecord;
    } catch {
      return null;
    }
  },
  async put(record) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY(record.meta.id), JSON.stringify(record));
  },
  async saveCanvas(sessionId, canvas) {
    const existing = await localSessionRepository.get(sessionId);
    if (!existing) return;
    await localSessionRepository.put({ ...existing, canvas });
  },
};
