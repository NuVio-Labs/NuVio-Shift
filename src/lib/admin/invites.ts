"use server";

import { randomUUID } from "crypto";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/domain";

const INVITE_EXPIRY_DAYS = 7;

export type CreateInviteResult =
  | { status: "ok"; token: string }
  | { status: "error"; message: string };

const PERMISSION_ERROR: CreateInviteResult = {
  status: "error",
  message: "Du hast keine Berechtigung, Einladungen zu erstellen.",
};

const GENERIC_ERROR: CreateInviteResult = {
  status: "error",
  message: "Die Einladung konnte nicht erstellt werden. Bitte versuche es erneut.",
};

function isValidRole(value: unknown): value is UserRole {
  return value === "admin" || value === "scheduler" || value === "employee";
}

export async function createInvite(input: { role: UserRole }): Promise<CreateInviteResult> {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "admin") {
    return PERMISSION_ERROR;
  }

  if (!isValidRole(input.role)) {
    return GENERIC_ERROR;
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("invites").insert({
    company_id: result.profile.companyId,
    token,
    role: input.role,
    created_by: result.profile.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return GENERIC_ERROR;
  }

  return { status: "ok", token };
}

export type InviteListItem = {
  id: string;
  token: string;
  role: UserRole;
  expiresAt: string;
  usedAt: string | null;
  usedByName: string | null;
};

export type ListInvitesResult =
  | { status: "ok"; invites: InviteListItem[] }
  | { status: "error" };

export async function listInvites(): Promise<ListInvitesResult> {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "admin") {
    return { status: "error" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("invites")
    .select("id, token, role, expires_at, used_at, used_by")
    .eq("company_id", result.profile.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    return { status: "error" };
  }

  const usedByIds = data.map((invite) => invite.used_by).filter((id): id is string => id !== null);

  const namesById = new Map<string, string>();
  if (usedByIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", usedByIds);
    for (const profile of profiles ?? []) {
      namesById.set(profile.id, profile.name);
    }
  }

  const invites: InviteListItem[] = data.map((invite) => ({
    id: invite.id,
    token: invite.token,
    role: invite.role as UserRole,
    expiresAt: invite.expires_at,
    usedAt: invite.used_at,
    usedByName: invite.used_by ? namesById.get(invite.used_by) ?? null : null,
  }));

  return { status: "ok", invites };
}

export type RevokeInviteResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function revokeInvite(inviteId: string): Promise<RevokeInviteResult> {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "admin") {
    return { status: "error", message: "Du hast keine Berechtigung, diese Einladung zu widerrufen." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("company_id", result.profile.companyId);

  if (error) {
    return {
      status: "error",
      message: "Die Einladung konnte nicht widerrufen werden. Bitte versuche es erneut.",
    };
  }

  return { status: "ok" };
}
