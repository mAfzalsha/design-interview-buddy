import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { mockSessionApi } from "@/lib/canvas/api";
import { writeIdentity } from "@/lib/canvas/session-identity";
import { Loader2, PenLine, Share2, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "System Design Interview Canvas — Collaborative whiteboard" },
      {
        name: "description",
        content:
          "Create a blank system design canvas, share the link, and diagram architectures with your candidate in real time.",
      },
      { property: "og:title", content: "System Design Interview Canvas" },
      {
        property: "og:description",
        content: "Real-time collaborative whiteboard built for system design interviews.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  const createInterview = async () => {
    console.log("create clicked");
    setCreating(true);
    const record = await mockSessionApi.createSession();
    writeIdentity(record.meta.id, { name: "Interviewer", role: "interviewer" });
    navigate({ to: "/session/$sessionId", params: { sessionId: record.meta.id } });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Interview tooling
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
        System Design Interview Canvas
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Spin up a blank architecture canvas, send the link to your candidate, and sketch
        together in real time. No accounts, no setup.
      </p>

      <div className="mt-8">
        <Button size="lg" onClick={createInterview} disabled={creating}>
          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {creating ? "Creating canvas…" : "Create interview"}
        </Button>
      </div>

      <ul className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          { icon: Share2, title: "Share a link", body: "One URL joins the candidate instantly." },
          { icon: PenLine, title: "Diagram fast", body: "Components, arrows and notes in a click." },
          { icon: Users, title: "Stay in sync", body: "Live updates with names on every change." },
        ].map(({ icon: Icon, title, body }) => (
          <li key={title} className="rounded-lg border bg-card p-4">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h2 className="mt-3 text-sm font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
