import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, ProductBarcode } from "@/generated/prisma/client";
import { database } from "@/platform/persistence/prisma";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { normalizeName, productUnits, unitDetails } from "@/modules/catalog/domain/product";
import { calculateStockChange, stockStatus } from "../domain/inventory";
import { generateInternalBarcode, validateBarcode } from "@/modules/barcodes/domain/barcode";
import { InventoryError } from "./errors";
import { requireInventoryOwner } from "./policy";
import { assertStoreMayWrite } from "@/modules/saas/application/saas-service";
import { SaasError } from "@/modules/saas/application/errors";

const money = z.coerce.number().finite().min(0).max(99_999_999.99);
const integer = z.coerce.number().int().min(0).max(2_000_000_000);
const productInput = z.object({
  name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(), supplier: z.string().trim().max(120).optional().nullable(),
  sellingUnit: z.enum(productUnits), otherUnitRaw: z.string().trim().max(40).optional().nullable(),
  sellingPrice: money, latestPurchaseCost: money.optional().nullable(), lowStockThreshold: integer.default(0),
  startingQuantity: integer.default(0), barcodeChoice: z.enum(["NONE", "MANUFACTURER", "INTERNAL"]).default("NONE"),
  manufacturerBarcode: z.string().trim().max(40).optional().nullable(),
  idempotencyKey: z.string().min(8).max(120),
});
const updateInput = productInput.omit({ startingQuantity: true, barcodeChoice: true, manufacturerBarcode: true, idempotencyKey: true }).partial();
const stockInput = z.object({ quantity: z.coerce.number().int().positive().max(2_000_000_000), purchaseCost: money.optional().nullable(), idempotencyKey: z.string().min(8).max(120) });
const adjustmentInput = z.object({ delta: z.coerce.number().int().min(-2_000_000_000).max(2_000_000_000).refine(value => value !== 0), reason: z.enum(["DAMAGED", "EXPIRED", "MISSING", "CORRECTION"]), idempotencyKey: z.string().min(8).max(120) });
const barcodeInput = z.object({ value: z.string().optional(), idempotencyKey: z.string().min(8).max(120) });
const categoryQuery = z.string().trim().max(80);

async function contextFor(userId: string, ownerOnly = false, write = false) {
  const context = await resolveStoreContext(userId);
  if (!context) throw new InventoryError("FORBIDDEN", "You do not have access to a store.", 403);
  if (ownerOnly) requireInventoryOwner(context.role);
  if (write) try { await assertStoreMayWrite(context.store.id); } catch (error) { if (error instanceof SaasError) throw new InventoryError("PLAN_RESTRICTED", error.message, error.status); throw error; }
  return context;
}

function requestHash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
const productSearchInclude = { category: true, balance: true, barcodes: { where: { status: "ACTIVE" as const }, select: { type: true } }, supplierReferences: { include: { supplier: true }, take: 1 } } satisfies Prisma.ProductInclude;

export async function listCategories(userId: string, rawQuery?: string) {
  const { store } = await contextFor(userId);
  const query = normalizeName(categoryQuery.parse(rawQuery ?? ""));
  const categories = await database().category.findMany({
    where: { storeId: store.id, ...(query ? { normalizedName: { contains: query } } : {}) },
    orderBy: { normalizedName: "asc" },
    take: query ? 20 : 8,
    select: { id: true, name: true, normalizedName: true, _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
  return { items: categories.sort((left, right) => Number(right.normalizedName.startsWith(query)) - Number(left.normalizedName.startsWith(query)) || left.normalizedName.localeCompare(right.normalizedName)).slice(0, 8).map(category => ({ id: category.id, name: category.name, productCount: category._count.products })) };
}

export async function searchProducts(userId: string, raw: { query?: string; filter?: string; sort?: string; cursor?: string; limit?: number }) {
  const { store } = await contextFor(userId);
  const query = raw.query?.trim(); const filter = raw.filter ?? "all"; const limit = Math.min(Math.max(raw.limit ?? 24, 1), 60);
  const where = {
    storeId: store.id, status: "ACTIVE" as const,
    ...(query ? { OR: [
      { name: { contains: query, mode: "insensitive" as const } }, { category: { name: { contains: query, mode: "insensitive" as const } } },
      { supplierReferences: { some: { supplier: { name: { contains: query, mode: "insensitive" as const } } } } },
      { barcodes: { some: { normalizedValue: { contains: query.replace(/[\s-]/g, ""), mode: "insensitive" as const }, status: "ACTIVE" as const } } },
    ] } : {}),
    ...(filter === "out" ? { balance: { quantity: 0 } } : {}),
    ...(filter === "low" ? { balance: { quantity: { gt: 0 } } } : {}),
    ...(filter === "recent" ? { updatedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } : {}),
  };
  const records: Prisma.ProductGetPayload<{include: typeof productSearchInclude}>[] = []; let scanCursor = raw.cursor; let exhausted = false;
  while (records.length < limit + 1 && !exhausted) {
    const batch = await database().product.findMany({ where, take: filter === "low" ? 61 : limit + 1, ...(scanCursor ? { cursor: { id: scanCursor }, skip: 1 } : {}),
      orderBy: raw.sort === "name" ? [{ normalizedName: "asc" }, { id: "asc" }] : raw.sort === "quantity" ? [{ balance: { quantity: "asc" } }, { id: "asc" }] : [{ updatedAt: "desc" }, { id: "asc" }],
      include: productSearchInclude });
    exhausted = batch.length < (filter === "low" ? 61 : limit + 1); scanCursor = batch.at(-1)?.id;
    records.push(...(filter === "low" ? batch.filter(product => (product.balance?.quantity ?? 0) <= product.lowStockThreshold) : batch));
    if (filter !== "low") break;
  }
  const items = records.slice(0, limit).map(product => ({ ...product, sellingPrice: product.sellingPrice.toString(), latestPurchaseCost: product.latestPurchaseCost?.toString() ?? null,
    quantity: product.balance?.quantity ?? 0, stockStatus: stockStatus(product.balance?.quantity ?? 0, product.lowStockThreshold), supplier: product.supplierReferences[0]?.supplier.name ?? null,
    hasBarcode: product.barcodes.length > 0 }));
  const all = await database().product.findMany({ where: { storeId: store.id, status: "ACTIVE" }, select: { categoryId: true, updatedAt: true, lowStockThreshold: true, balance: { select: { quantity: true } } } });
  const counts = { all: all.length, low: all.filter(p => (p.balance?.quantity ?? 0) > 0 && (p.balance?.quantity ?? 0) <= p.lowStockThreshold).length, out: all.filter(p => (p.balance?.quantity ?? 0) === 0).length, recent: all.filter(p => p.updatedAt >= new Date(Date.now() - 7 * 86_400_000)).length, categories: new Set(all.map(p => p.categoryId).filter(Boolean)).size };
  return { items, counts, nextCursor: records.length > limit ? records[limit - 1]?.id ?? null : null };
}

export async function readProduct(userId: string, productId: string) {
  const { store } = await contextFor(userId);
  const product = await database().product.findFirst({ where: { id: productId, storeId: store.id }, include: { category: true, balance: true,
    barcodes: { orderBy: { assignedAt: "desc" } }, supplierReferences: { include: { supplier: true }, take: 1 },
    movements: { orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } } } });
  if (!product) throw new InventoryError("NOT_FOUND", "Product not found.", 404);
  return { ...product, sellingPrice: product.sellingPrice.toString(), latestPurchaseCost: product.latestPurchaseCost?.toString() ?? null, quantity: product.balance?.quantity ?? 0, supplier: product.supplierReferences[0]?.supplier.name ?? null };
}

export async function createProduct(userId: string, raw: unknown) {
  const { store } = await contextFor(userId, true, true); const input = productInput.parse(raw); const unit = unitDetails(input.sellingUnit, input.otherUnitRaw); const correlationId = randomUUID();
  let barcode: string | null = null;
  if (input.barcodeChoice === "MANUFACTURER") barcode = validateBarcode(input.manufacturerBarcode ?? "");
  for (let attempt = 0; attempt < 3; attempt++) try { return await database().$transaction(async tx => {
    const hash=requestHash(input);const prior=await tx.idempotencyKey.findUnique({where:{storeId_scope_key:{storeId:store.id,scope:"CREATE_PRODUCT",key:input.idempotencyKey}}});if(prior){if(prior.requestHash!==hash)throw new InventoryError("CONFLICT","This request was already used for a different product.",409);return prior.response as {id:string;barcode:string|null};}
    const category = input.category ? await tx.category.upsert({ where: { storeId_normalizedName: { storeId: store.id, normalizedName: normalizeName(input.category) } }, update: {}, create: { storeId: store.id, name: input.category, normalizedName: normalizeName(input.category) } }) : null;
    const supplier = input.supplier ? await tx.supplier.upsert({ where: { storeId_normalizedName: { storeId: store.id, normalizedName: normalizeName(input.supplier) } }, update: {}, create: { storeId: store.id, name: input.supplier, normalizedName: normalizeName(input.supplier) } }) : null;
    const product = await tx.product.create({ data: { storeId: store.id, categoryId: category?.id, name: input.name, normalizedName: normalizeName(input.name), description: input.description || null, sellingUnit: input.sellingUnit, ...unit, sellingPrice: input.sellingPrice, latestPurchaseCost: input.latestPurchaseCost, lowStockThreshold: input.lowStockThreshold,
      balance: { create: { storeId: store.id, quantity: input.startingQuantity } }, ...(supplier ? { supplierReferences: { create: { storeId: store.id, supplierId: supplier.id } } } : {}) } });
    if (input.startingQuantity > 0) await tx.inventoryMovement.create({ data: { storeId: store.id, productId: product.id, actorId: userId, type: "OPENING", quantityDelta: input.startingQuantity, previousQuantity: 0, resultingQuantity: input.startingQuantity, sourceType: "PRODUCT_CREATION", correlationId } });
    if (input.barcodeChoice === "INTERNAL") { for (let i=0; i<8; i++) { const candidate = generateInternalBarcode(); const exists = await tx.productBarcode.findUnique({ where: { storeId_normalizedValue: { storeId: store.id, normalizedValue: candidate } } }); if (!exists) { barcode = candidate; break; } } }
    if (barcode) await tx.productBarcode.create({ data: { storeId: store.id, productId: product.id, assignedById: userId, value: barcode, normalizedValue: barcode, type: input.barcodeChoice === "INTERNAL" ? "INTERNAL" : "MANUFACTURER" } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "PRODUCT_CREATED", entityType: "Product", entityId: product.id, correlationId, after: { name: input.name, startingQuantity: input.startingQuantity } } });
    const response={id:product.id,barcode};await tx.idempotencyKey.create({data:{storeId:store.id,scope:"CREATE_PRODUCT",key:input.idempotencyKey,requestHash:hash,status:"COMPLETED",response,expiresAt:new Date(Date.now()+86_400_000)}});return response;
  }, { isolationLevel: "Serializable" }); } catch (error) {
    if ((error as {code?:string}).code === "P2034" && attempt < 2) continue;
    if ((error as {code?:string}).code === "P2002") throw new InventoryError("DUPLICATE_BARCODE", "That barcode is already assigned to another product.", 409);
    throw error;
  }
  throw new InventoryError("CONFLICT", "The product changed while it was being saved. Try again.", 409);
}

export async function updateProduct(userId: string, productId: string, raw: unknown) {
  const { store } = await contextFor(userId, true, true); const input = updateInput.parse(raw); const correlationId = randomUUID();
  return database().$transaction(async tx => {
    const existing = await tx.product.findFirst({ where: { id: productId, storeId: store.id, status: "ACTIVE" } });
    if (!existing) throw new InventoryError("NOT_FOUND", "Product not found.", 404);
    const category = input.category === undefined ? undefined : input.category ? await tx.category.upsert({ where: { storeId_normalizedName: { storeId: store.id, normalizedName: normalizeName(input.category) } }, update: {}, create: { storeId: store.id, name: input.category, normalizedName: normalizeName(input.category) } }) : null;
    const supplier = input.supplier === undefined ? undefined : input.supplier ? await tx.supplier.upsert({ where: { storeId_normalizedName: { storeId: store.id, normalizedName: normalizeName(input.supplier) } }, update: {}, create: { storeId: store.id, name: input.supplier, normalizedName: normalizeName(input.supplier) } }) : null;
    const data: Record<string, unknown> = { ...input, version: { increment: 1 } };
    if (input.name) data.normalizedName = normalizeName(input.name);
    if (input.sellingUnit) Object.assign(data, unitDetails(input.sellingUnit, input.otherUnitRaw));
    if (category !== undefined) data.categoryId = category?.id ?? null;
    delete data.category; delete data.supplier;
    const updated = await tx.product.update({ where: { id: productId }, data });
    if (supplier !== undefined) { await tx.productSupplierReference.deleteMany({ where: { storeId: store.id, productId } }); if (supplier) await tx.productSupplierReference.create({ data: { storeId: store.id, productId, supplierId: supplier.id } }); }
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "PRODUCT_UPDATED", entityType: "Product", entityId: productId, correlationId, before: { name: existing.name }, after: { name: updated.name } } });
    return updated;
  });
}

export async function archiveProduct(userId: string, productId: string) {
  const { store } = await contextFor(userId, true, true); const correlationId = randomUUID();
  return database().$transaction(async tx => { const product = await tx.product.findFirst({ where: { id: productId, storeId: store.id } }); if (!product) throw new InventoryError("NOT_FOUND", "Product not found.", 404);
    const updated = await tx.product.update({ where: { id: product.id }, data: { status: "ARCHIVED", archivedAt: new Date(), version: { increment: 1 } } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "PRODUCT_ARCHIVED", entityType: "Product", entityId: product.id, correlationId, before: { status: product.status }, after: { status: "ARCHIVED" } } }); return updated; });
}

async function changeStock(userId: string, productId: string, raw: unknown, kind: "add"|"adjust") {
  const { store } = await contextFor(userId, true, true); const parsed = kind === "add" ? stockInput.parse(raw) : adjustmentInput.parse(raw); const delta = "quantity" in parsed ? parsed.quantity : parsed.delta; const scope = kind === "add" ? "ADD_INVENTORY" : "ADJUST_INVENTORY"; const hash = requestHash(parsed);
  for (let attempt=0; attempt<3; attempt++) try { return await database().$transaction(async tx => {
    const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope, key: parsed.idempotencyKey } } }); if (prior) { if (prior.requestHash !== hash) throw new InventoryError("CONFLICT", "This request was already used for a different change.", 409); return prior.response; }
    const product = await tx.product.findFirst({ where: { id: productId, storeId: store.id }, include: { balance: true } }); if (!product) throw new InventoryError("NOT_FOUND", "Product not found.", 404); if (product.status !== "ACTIVE") throw new InventoryError("ARCHIVED_PRODUCT", "Archived products cannot be changed.", 409);
    const change = calculateStockChange(product.balance?.quantity ?? 0, delta); const correlationId = randomUUID(); const updated = await tx.inventoryBalance.updateMany({ where: { productId, storeId: store.id, version: product.balance?.version ?? 0 }, data: { quantity: change.resultingQuantity, version: { increment: 1 } } }); if (updated.count !== 1) throw new InventoryError("CONFLICT", "Stock changed while you were reviewing it. Refresh and try again.", 409);
    if (kind === "add" && "purchaseCost" in parsed && parsed.purchaseCost != null) await tx.product.update({ where: { id: productId }, data: { latestPurchaseCost: parsed.purchaseCost, version: { increment: 1 } } });
    const movement = await tx.inventoryMovement.create({ data: { storeId: store.id, productId, actorId: userId, type: "ADJUSTMENT", ...change, adjustmentReason: kind === "adjust" && "reason" in parsed ? parsed.reason : null, sourceType: scope, sourceId: parsed.idempotencyKey, correlationId } });
    const response = { movementId: movement.id, ...change }; await tx.idempotencyKey.create({ data: { storeId: store.id, scope, key: parsed.idempotencyKey, requestHash: hash, status: "COMPLETED", response, expiresAt: new Date(Date.now()+86_400_000) } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: scope, entityType: "Product", entityId: productId, correlationId, before: { quantity: change.previousQuantity }, after: { quantity: change.resultingQuantity } } }); return response;
  }, { isolationLevel: "Serializable" }); } catch (error) { if ((error as {code?:string}).code === "P2034" && attempt < 2) continue; throw error; } throw new InventoryError("CONFLICT", "Stock changed. Refresh and try again.", 409);
}
export const addInventory = (userId: string, productId: string, raw: unknown) => changeStock(userId, productId, raw, "add");
export const adjustInventory = (userId: string, productId: string, raw: unknown) => changeStock(userId, productId, raw, "adjust");

export async function assignBarcode(userId: string, productId: string, raw: unknown) {
  const { store } = await contextFor(userId, true, true); const input = barcodeInput.parse(raw); const value = validateBarcode(input.value ?? ""); const hash = requestHash({ productId, value });
  try { return await database().$transaction(async tx => {
    const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope: "ASSIGN_BARCODE", key: input.idempotencyKey } } });
    if (prior) { if (prior.requestHash !== hash) throw new InventoryError("CONFLICT", "This request was already used for a different barcode.", 409); return prior.response as unknown as ProductBarcode; }
    const product = await tx.product.findFirst({ where: { id: productId, storeId: store.id, status: "ACTIVE" } }); if (!product) throw new InventoryError("NOT_FOUND", "Product not found.", 404);
    const barcode = await tx.productBarcode.create({ data: { storeId: store.id, productId: product.id, assignedById: userId, value, normalizedValue: value, type: "MANUFACTURER" } });
    await tx.idempotencyKey.create({ data: { storeId: store.id, scope: "ASSIGN_BARCODE", key: input.idempotencyKey, requestHash: hash, status: "COMPLETED", response: barcode, expiresAt: new Date(Date.now()+86_400_000) } }); return barcode;
  }); } catch (error) { if ((error as {code?:string}).code === "P2002") throw new InventoryError("DUPLICATE_BARCODE", "That barcode is already assigned to another product.", 409); throw error; }
}

export async function generateBarcode(userId: string, productId: string, raw: unknown, replace = false) {
  const { store } = await contextFor(userId, true, true); const input = barcodeInput.parse(raw); const scope = replace ? "REPLACE_BARCODE" : "GENERATE_BARCODE"; const hash = requestHash({ productId, replace });
  return database().$transaction(async tx => { const product = await tx.product.findFirst({ where: { id: productId, storeId: store.id, status: "ACTIVE" } }); if (!product) throw new InventoryError("NOT_FOUND", "Product not found.", 404);
    const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope, key: input.idempotencyKey } } }); if (prior) { if (prior.requestHash !== hash) throw new InventoryError("CONFLICT", "This request was already used for a different barcode action.", 409); return prior.response as unknown as ProductBarcode; }
    const previous = replace ? await tx.productBarcode.findFirst({ where: { storeId: store.id, productId, type: "INTERNAL", status: "ACTIVE" }, orderBy: { assignedAt: "desc" } }) : null;
    if (!replace && await tx.productBarcode.findFirst({ where: { storeId: store.id, productId, type: "INTERNAL", status: "ACTIVE" } })) throw new InventoryError("CONFLICT", "This product already has a Tindahan barcode.", 409);
    let value = ""; for (let i=0; i<12; i++) { const candidate = generateInternalBarcode(); if (!await tx.productBarcode.findUnique({ where: { storeId_normalizedValue: { storeId: store.id, normalizedValue: candidate } } })) { value=candidate; break; } } if (!value) throw new InventoryError("CONFLICT", "We couldn't prepare a unique barcode. Try again.", 409);
    if (previous) await tx.productBarcode.update({ where: { id: previous.id }, data: { status: "RETIRED", retiredAt: new Date() } });
    const barcode = await tx.productBarcode.create({ data: { storeId: store.id, productId, assignedById: userId, value, normalizedValue: value, type: "INTERNAL", replacesId: previous?.id } }); await tx.idempotencyKey.create({ data: { storeId: store.id, scope, key: input.idempotencyKey, requestHash: hash, status: "COMPLETED", response: barcode, expiresAt: new Date(Date.now()+86_400_000) } }); return barcode;
  }, { isolationLevel: "Serializable" });
}

export async function saveInventoryView(userId: string, view: "LIST"|"GRID") { const { store } = await contextFor(userId); return database().storePreference.update({ where: { storeId: store.id }, data: { inventoryView: view } }); }
export async function getInventoryView(userId: string) { const { store } = await contextFor(userId); return (await database().storePreference.findUnique({ where: { storeId: store.id }, select: { inventoryView: true } }))?.inventoryView ?? "LIST"; }
