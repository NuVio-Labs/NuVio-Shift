import { cn } from "cn";

export function ShiftDisplay({
  label,
  startTime,
  endTime,
  employeeName,
  isOneOff = false,
}: {
  label: string;
  startTime: string;
  endTime: string;
  employeeName: string | null;
  isOneOff?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
        {isOneOff && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal normal-case">
            Einmalig
          </span>
        )}
      </p>
      <p className="text-sm text-muted-foreground">
        {startTime}–{endTime}
      </p>
      <p
        className={cn(
          "text-sm",
          employeeName ? "font-medium text-foreground" : "text-muted-foreground italic",
        )}
      >
        {employeeName ?? "Nicht besetzt"}
      </p>
    </div>
  );
}
