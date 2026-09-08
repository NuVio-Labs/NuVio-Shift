import { LinkButton } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          NuVio Shift
        </h1>
        <p className="text-lg text-foreground">Schichten. Einfach geplant.</p>
        <p className="text-muted-foreground">
          Einfache Dienstplanung für kleine Teams.
        </p>
        <LinkButton className="mt-4" href="/app">
          Zum Dienstplan
        </LinkButton>
      </div>
    </div>
  );
}
