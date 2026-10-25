"use client";

import { useId, useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";

import { createShift } from "@/lib/shifts/actions";
import type { AssignableEmployee } from "@/lib/shifts/queries";
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

const OPEN_SHIFT = "__open__";

export function CreateShiftDialog({
  defaultDate,
  employees,
  triggerLabel = "Schicht hinzufügen",
  compact = false,
}: {
  defaultDate: string;
  employees: AssignableEmployee[];
  triggerLabel?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [shiftDate, setShiftDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [label, setLabel] = useState("");
  const [employeeId, setEmployeeId] = useState(OPEN_SHIFT);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setShiftDate(defaultDate);
      setStartTime("09:00");
      setEndTime("12:00");
      setLabel("");
      setEmployeeId(OPEN_SHIFT);
      setError(null);
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await createShift({
        shiftDate,
        startTime,
        endTime,
        label,
        employeeId: employeeId === OPEN_SHIFT ? null : employeeId,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setOpen(false);
    });
  }

  const employeeItems = [
    { value: OPEN_SHIFT, label: "Offen lassen" },
    ...employees.map((employee) => ({ value: employee.id, label: employee.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={buttonVariants({ variant: compact ? "ghost" : "default", size: "sm" })}
      >
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einmalige Schicht anlegen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-date`}>Datum</Label>
            <Input
              id={`${id}-date`}
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
            />
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

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-label`}>Bezeichnung</Label>
            <Input
              id={`${id}-label`}
              value={label}
              maxLength={MAX_LABEL_LENGTH}
              placeholder="z. B. Inventur, Putzen, Aushilfe"
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Mitarbeiter</Label>
            <Select
              items={employeeItems}
              value={employeeId}
              onValueChange={(value) => setEmployeeId(value ?? OPEN_SHIFT)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employeeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" disabled={isPending || !shiftDate} onClick={handleSave}>
            {isPending ? "Speichern…" : "Schicht anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
