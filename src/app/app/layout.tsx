import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { NavDrawer } from "@/components/navigation/NavDrawer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getCurrentUserProfile();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  if (result.status !== "ok") {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return <NavDrawer profile={result.profile}>{children}</NavDrawer>;
}
