import{NextRequest,NextResponse}from"next/server";import{confirmSale}from"@/modules/sales/application/sales-service";import{salesHttpError,salesUserId}from"@/modules/sales/presentation/http";
export async function POST(request:NextRequest){try{return NextResponse.json(await confirmSale(await salesUserId(),await request.json()),{status:201});}catch(error){return salesHttpError(error);}}
