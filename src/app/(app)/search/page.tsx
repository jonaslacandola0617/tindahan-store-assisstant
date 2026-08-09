import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { listCategories } from "@/modules/inventory/application/inventory-service";
import { SearchClient } from "./search-client";

export const metadata = { title: "Search" };
export default async function SearchPage() {
  const session = await getServerSession(authOptions); if (!session?.user.id) redirect("/sign-in");
  const [categories, cookieStore] = await Promise.all([listCategories(session.user.id), cookies()]);
  return <SearchClient categories={categories.items} locale={cookieStore.get("tindahan-language")?.value === "FIL" ? "FIL" : "EN"} />;
}
