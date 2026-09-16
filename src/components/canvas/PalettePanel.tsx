import { PALETTE } from "@/lib/canvas/palette";
import type { NodeKind } from "@/lib/canvas/types";

interface Props {
  onAdd: (kind: NodeKind) => void;
}

export function PalettePanel({ onAdd }: Props) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Components
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">Drag onto the canvas or click.</p>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {PALETTE.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.kind}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData("application/x-node-kind", item.kind)
              }
              onClick={() => onAdd(item.kind)}
              className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm hover:border-border hover:bg-accent"
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md"
                style={{ backgroundColor: `color-mix(in oklab, ${item.tone} 18%, transparent)` }}
              >
                <Icon className="h-4 w-4" style={{ color: item.tone }} />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
