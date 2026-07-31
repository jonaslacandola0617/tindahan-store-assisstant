import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";

const input = z.object({ language: z.enum(["EN", "FIL"]).optional(), theme: z.enum(["SYSTEM", "LIGHT", "DARK"]).optional() });

export async function PATCH(request: Request) {
  const value = input.parse(await request.json());
  const session = await getServerSession(authOptions);
  if (session?.user.id && !serverEnvironment.demoMode) {
    await database().user.update({ where: { id: session.user.id }, data: { preferredLanguage: value.language, preferredTheme: value.theme } });
  }
  const response = NextResponse.json({ ok: true });
  if (value.language) response.cookies.set("tindahan-language", value.language, { sameSite: "lax", maxAge: 31_536_000 });
  if (value.theme) response.cookies.set("tindahan-theme", value.theme, { sameSite: "lax", maxAge: 31_536_000 });
  return response;
}
