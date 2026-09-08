import { LinkButton } from "@/components/ui/button";

export default function DatenschutzPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Datenschutz
        </h1>
        <p className="text-muted-foreground">
          Die Inhalte dieser Seite folgen in Kürze.
        </p>
        <LinkButton variant="outline" href="/" className="self-start">
          Zurück
        </LinkButton>
      </div>
    </div>
  );
}
