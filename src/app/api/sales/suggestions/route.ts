import{NextResponse}from"next/server";import{saleSuggestions}from"@/modules/sales/application/sales-service";import{salesHttpError,salesUserId}from"@/modules/sales/presentation/http";
export async function GET(){try{return NextResponse.json(await saleSuggestions(await salesUserId()));}catch(error){return salesHttpError(error);}}
