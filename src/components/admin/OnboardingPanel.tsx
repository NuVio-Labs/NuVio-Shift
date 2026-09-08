"use client";

import { useState } from "react";

import { listInvites, type InviteListItem } from "@/lib/admin/invites";
import { CreateInviteForm } from "@/components/admin/CreateInviteForm";
import { InviteList } from "@/components/admin/InviteList";

export function OnboardingPanel({ initialInvites }: { initialInvites: InviteListItem[] }) {
  const [invites, setInvites] = useState(initialInvites);

  async function refresh() {
    const result = await listInvites();
    if (result.status === "ok") {
      setInvites(result.invites);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CreateInviteForm onCreated={refresh} />
      <InviteList invites={invites} onRevoked={refresh} />
    </div>
  );
}
