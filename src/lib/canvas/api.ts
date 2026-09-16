import { localSessionRepository } from "./storage";
import { emptyCanvas, uid, type CanvasState, type SessionRecord } from "./types";

/**
 * Mocked backend API. Mirrors the future HTTP contract:
 *   POST /sessions
 *   GET  /sessions/:sessionId
 *   PUT  /sessions/:sessionId/canvas
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const latency = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export interface SessionApi {
  createSession(title?: string): Promise<SessionRecord>;
  getSession(sessionId: string): Promise<SessionRecord>;
  saveCanvas(sessionId: string, canvas: CanvasState): Promise<void>;
}

export const mockSessionApi: SessionApi = {
  async createSession(title = "System design interview") {
    await latency(500);
    const record: SessionRecord = {
      meta: { id: uid("sess").replace("sess_", ""), createdAt: Date.now(), title },
      canvas: emptyCanvas("interviewer"),
    };
    await localSessionRepository.put(record);
    return record;
  },

  async getSession(sessionId) {
    await latency();
    const record = await localSessionRepository.get(sessionId);
    if (!record) throw new ApiError("Session not found", 404);
    return record;
  },

  async saveCanvas(sessionId, canvas) {
    await latency(120);
    await localSessionRepository.saveCanvas(sessionId, canvas);
  },
};
