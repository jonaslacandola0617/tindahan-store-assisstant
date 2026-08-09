import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/modules/saas/application/saas-service";
import { authenticatedUserId, saasHttpError } from "@/modules/saas/presentation/http";

export async function GET() { try { return NextResponse.json(await getSettings(await authenticatedUserId())); } catch (error) { return saasHttpError(error); } }
export async function PATCH(request: Request) {
  try {
    const input = await request.json() as { language?: string; theme?: string };
    const result = await updateSettings(await authenticatedUserId(), input);
    const response = NextResponse.json(result);
    if (input.language === "EN" || input.language === "FIL") response.cookies.set("tindahan-language", input.language, { sameSite: "lax", maxAge: 31_536_000, path: "/" });
    if (input.theme === "SYSTEM" || input.theme === "LIGHT" || input.theme === "DARK") response.cookies.set("tindahan-theme", input.theme, { sameSite: "lax", maxAge: 31_536_000, path: "/" });
    return response;
  } catch (error) {
    return saasHttpError(error);
  }
}
