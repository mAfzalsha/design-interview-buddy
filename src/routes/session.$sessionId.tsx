import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SessionWorkspace } from "@/components/canvas/SessionWorkspace";
import { readIdentity, writeIdentity, type Identity } from "@/lib/canvas/session-identity";

export const Route = createFileRoute("/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Interview canvas — System Design Interview Canvas" },
      {
        name: "description",
        content:
          "Join the shared system design canvas, add components, connect them and take notes with your interviewer in real time.",
      },
      { property: "og:title", content: "Join the interview canvas" },
      {
        property: "og:description",
        content: "Collaborate on a live system design diagram — just enter your name to join.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SessionRoute,
});

function SessionRoute() {
  const { sessionId } = Route.useParams();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIdentity(readIdentity(sessionId));
    setHydrated(true);
  }, [sessionId]);

  if (!hydrated) return null;

  if (!identity) {
    return <JoinScreen sessionId={sessionId} onJoin={setIdentity} />;
  }

  return <SessionWorkspace sessionId={sessionId} identity={identity} />;
}

function JoinScreen({
  sessionId,
  onJoin,
}: {
  sessionId: string;
  onJoin: (i: Identity) => void;
}) {
  const [name, setName] = useState("");
  const invalid = !/^[a-z0-9]{4,}$/i.test(sessionId);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Join the interview canvas</h1>
        {invalid ? (
          <p className="mt-3 text-sm text-destructive">
            This interview link looks invalid. Ask your interviewer to share it again.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter a display name so everyone can see who is drawing. No account needed.
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = name.trim();
                if (!trimmed) return;
                const identity: Identity = { name: trimmed, role: "candidate" };
                writeIdentity(sessionId, identity);
                onJoin(identity);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={!name.trim()}>
                Join canvas
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
