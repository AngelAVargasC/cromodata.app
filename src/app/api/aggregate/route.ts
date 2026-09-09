import { NextResponse } from "next/server";
import { roomAggregate } from "@/lib/room";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await roomAggregate());
}
