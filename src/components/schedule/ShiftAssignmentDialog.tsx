"use client";

import { useState, useTransition } from "react";

import {
  assignEmployeeToShift,
  assignEmployeeToTemplateSlot,
  deleteShift,
  removeEmployeeFromShift,
  type ShiftMutationResult,
} from "@/lib/shifts/actions";
import type { AssignableEmployee } from "@/lib/shifts/queries";
import type { ScheduleSlot } from "@/lib/shifts/schedule";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ShiftAssignmentDialog({
  shiftDate,
  slot,
  employees,
}: {
  shiftDate: string;
  slot: ScheduleSlot;
  employees: AssignableEmployee[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(slot.employeeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedEmployeeId(slot.employeeId ?? "");
      setError(null);
    }
  }

  function run(action: () => Promise<ShiftMutationResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setOpen(false);
    });
  }

  function handleSave() {
    if (!selectedEmployeeId) return;

    run(() =>
      slot.shiftId
        ? assignEmployeeToShift({ shiftId: slot.shiftId, employeeId: selectedEmployeeId })
        : assignEmployeeToTemplateSlot({
            shiftDate,
            templateId: slot.templateId ?? "",
            employeeId: selectedEmployeeId,
          }),
    );
  }

  function handleRemove() {
    if (!slot.shiftId) return;
    const shiftId = slot.shiftId;
    run(() => removeEmployeeFromShift({ shiftId }));
  }

  function handleDelete() {
    if (!slot.shiftId) return;
    const shiftId = slot.shiftId;
    run(() => deleteShift({ shiftId }));
  }

  const employeeItems = employees.map((employee) => ({ value: employee.id, label: employee.name }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        {slot.employeeName ? "Ändern" : "Mitarbeiter zuweisen"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {slot.label} · {slot.startTime}–{slot.endTime}
          </DialogTitle>
        </DialogHeader>

        <Select
          items={employeeItems}
          value={selectedEmployeeId}
          onValueChange={(value) => setSelectedEmployeeId(value ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            {employeeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {slot.shiftId && slot.employeeName && (
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground"
                disabled={isPending}
                onClick={handleRemove}
              >
                Zuweisung entfernen
              </Button>
            )}
            {slot.shiftId && slot.isOneOff && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                Schicht löschen
              </Button>
            )}
          </div>
          <Button type="button" disabled={isPending || !selectedEmployeeId} onClick={handleSave}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
