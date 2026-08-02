import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { readProduct } from "@/modules/inventory/application/inventory-service";
import { InventoryError } from "@/modules/inventory/application/errors";
import { ProductDetailsClient } from "./product-details-client";

export default async function ProductDetailsPage({ params }:{params:Promise<{productId:string}>}) {
  const session=await getServerSession(authOptions);if(!session?.user.id)redirect("/sign-in");
  let product;
  try { product=await readProduct(session.user.id,(await params).productId); }
  catch(error){if(error instanceof InventoryError&&error.code==="NOT_FOUND")notFound();throw error}
  const locale=(await cookies()).get("tindahan-language")?.value==="FIL"?"FIL":"EN";
  return <ProductDetailsClient product={product} locale={locale}/>;
}
