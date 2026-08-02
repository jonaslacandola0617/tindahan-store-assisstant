import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authOptions } from "@/modules/identity/infrastructure/auth-options";
import { SalesError } from "../application/errors";

export async function salesUserId(){const session=await getServerSession(authOptions);if(!session?.user.id)throw new SalesError("UNAUTHENTICATED","Sign in to continue.",401);return session.user.id;}
export function salesHttpError(error:unknown){if(error instanceof SalesError)return NextResponse.json({error:error.message,code:error.code,conflicts:error.conflicts},{status:error.status});if(error instanceof ZodError)return NextResponse.json({error:"Check the sale details and try again.",code:"VALIDATION",fields:error.flatten().fieldErrors},{status:400});console.error("Sales request failed",error);return NextResponse.json({error:"We couldn't complete that request. Nothing was changed. Try again.",code:"UNEXPECTED"},{status:500});}
