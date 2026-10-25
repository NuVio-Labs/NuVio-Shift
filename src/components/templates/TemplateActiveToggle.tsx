"use client";

import { useState, useTransition } from "react";

import { setShiftTemplateActive } from "@/lib/shifts/templates";
import { Button } from "@/components/ui/button";

export function TemplateActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setShiftTemplateActive({ id, active: !active });
      if (result.status === "error") {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={active ? "text-muted-foreground" : undefined}
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "…" : active ? "Deaktivieren" : "Aktivieren"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
