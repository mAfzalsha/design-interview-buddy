const KEY = (id: string) => `sdic:identity:${id}`;

export interface Identity {
  name: string;
  role: "interviewer" | "candidate";
}

export function readIdentity(sessionId: string): Identity | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Identity;
  } catch {
    return null;
  }
}

export function writeIdentity(sessionId: string, identity: Identity) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY(sessionId), JSON.stringify(identity));
}
