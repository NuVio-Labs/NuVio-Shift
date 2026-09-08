"use client";

import { useState, useTransition } from "react";

import { setEmployeeHourlyWage } from "@/lib/admin/compensation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HourlyWageEditor({
  profileId,
  initialHourlyWage,
}: {
  profileId: string;
  initialHourlyWage: number | null;
}) {
  const [value, setValue] = useState(initialHourlyWage?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setEmployeeHourlyWage({ profileId, hourlyWage: value });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={500}
        step={0.5}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="€/Std."
        className="w-24"
      />
      <Button size="sm" variant="outline" onClick={handleSave} disabled={isPending}>
        {isPending ? "…" : "Speichern"}
      </Button>
      {saved && !error && <span className="text-xs text-muted-foreground">Gespeichert</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
