import Link from "next/link";

import { getAdjacentMonth, getGermanMonthLabel } from "@/lib/shifts/dates";
import { Button } from "@/components/ui/button";

export function MonthNav({
  year,
  month,
  basePath,
}: {
  year: number;
  month: number;
  basePath: string;
}) {
  const previous = getAdjacentMonth(year, month, -1);
  const next = getAdjacentMonth(year, month, 1);

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`${basePath}?year=${previous.year}&month=${previous.month}`} />}
      >
        ← {getGermanMonthLabel(previous.year, previous.month)}
      </Button>
      <h1 className="text-lg font-semibold text-foreground">
        {getGermanMonthLabel(year, month)}
      </h1>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`${basePath}?year=${next.year}&month=${next.month}`} />}
      >
        {getGermanMonthLabel(next.year, next.month)} →
      </Button>
    </div>
  );
}
