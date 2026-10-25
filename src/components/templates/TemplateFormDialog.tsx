"use client";

import { useId, useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";

import { getGermanWeekdayName, ISO_WEEKDAYS } from "@/lib/shifts/dates";
import type { ShiftTemplate } from "@/lib/shifts/queries";
import { saveShiftTemplate } from "@/lib/shifts/templates";
import { MAX_LABEL_LENGTH } from "@/lib/shifts/time";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEEKDAY_ITEMS = ISO_WEEKDAYS.map((weekday) => ({
  value: String(weekday),
  label: getGermanWeekdayName(weekday),
}));

/** Create a template (no `template`) or edit an existing one. */
export function TemplateFormDialog({ template }: { template?: ShiftTemplate }) {
  const id = useId();
  const isEdit = Boolean(template);

  const initial = {
    label: template?.label ?? "",
    weekday: String(template?.weekday ?? 6),
    startTime: template?.startTime ?? "08:00",
    endTime: template?.endTime ?? "14:00",
  };

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(initial.label);
  const [weekday, setWeekday] = useState(initial.weekday);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setLabel(initial.label);
      setWeekday(initial.weekday);
      setStartTime(initial.startTime);
      setEndTime(initial.endTime);
      setError(null);
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveShiftTemplate({
        id: template?.id,
        label,
        weekday: Number(weekday),
        startTime,
        endTime,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={buttonVariants({ variant: isEdit ? "outline" : "default", size: "sm" })}
      >
        {isEdit ? (
          "Bearbeiten"
        ) : (
          <>
            <PlusIcon />
            Vorlage hinzufügen
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Vorlage bearbeiten" : "Neue Schichtvorlage"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-label`}>Bezeichnung</Label>
            <Input
              id={`${id}-label`}
              value={label}
              maxLength={MAX_LABEL_LENGTH}
              placeholder="z. B. Früh, Spät, Putzen"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Wochentag</Label>
            <Select
              items={WEEKDAY_ITEMS}
              value={weekday}
              onValueChange={(value) => setWeekday(value ?? "6")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-start`}>Von</Label>
              <Input
                id={`${id}-start`}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-end`}>Bis</Label>
              <Input
                id={`${id}-end`}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <p className="text-sm text-muted-foreground">
              Änderungen gelten für noch offene Termine. Bereits besetzte Schichten behalten ihre
              bisherigen Zeiten.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
