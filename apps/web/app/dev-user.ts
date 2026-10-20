"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_USER_COOKIE } from "@/lib/session";

const HOME: Record<string, string> = { LENDER: "/", AGENT: "/agent", ADMIN: "/admin", PARTNER: "/" };

export async function switchDevUser(formData: FormData) {
  const [id, role] = String(formData.get("user") ?? "").split("|");
  (await cookies()).set(DEV_USER_COOKIE, id ?? "", { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(HOME[role ?? ""] ?? "/");
}
