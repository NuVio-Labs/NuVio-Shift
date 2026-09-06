"use client";

import { useState, useTransition } from "react";

import { assignEmployeeToShift, removeEmployeeFromShift } from "@/lib/shifts/actions";
import type { AssignableEmployee } from "@/lib/shifts/queries";
import type { ShiftType } from "@/types/domain";
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
  shiftType,
  currentEmployeeId,
  currentEmployeeName,
  employees,
}: {
  shiftDate: string;
  shiftType: ShiftType;
  currentEmployeeId: string | null;
  currentEmployeeName: string | null;
  employees: AssignableEmployee[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(currentEmployeeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setSelectedEmployeeId(currentEmployeeId ?? "");
      setError(null);
    }
  }

  function handleSave() {
    if (!selectedEmployeeId) return;

    startTransition(async () => {
      const result = await assignEmployeeToShift({
        shiftDate,
        shiftType,
        employeeId: selectedEmployeeId,
      });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setOpen(false);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeEmployeeFromShift({ shiftDate, shiftType });

      if (result.status === "error") {
        setError(result.message);
        return;
      }

      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        {currentEmployeeName ? "Ändern" : "Mitarbeiter zuweisen"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {currentEmployeeName ? "Zuweisung ändern" : "Mitarbeiter zuweisen"}
          </DialogTitle>
        </DialogHeader>

        <Select
          value={selectedEmployeeId}
          onValueChange={(value) => setSelectedEmployeeId(value ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mitarbeiter auswählen" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="items-center sm:justify-between">
          {currentEmployeeName ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              disabled={isPending}
              onClick={handleRemove}
            >
              Zuweisung entfernen
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            disabled={isPending || !selectedEmployeeId}
            onClick={handleSave}
          >
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
