import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ exists: false });
  }

  try {
    // Search for the model in Vercel Blob storage
    const { blobs } = await list({ prefix: `models/${id}` });

    if (blobs.length > 0) {
      // Return the blob URL directly
      return NextResponse.json({ exists: true, src: blobs[0].url });
    }
  } catch (error) {
    console.error("Error checking blob storage:", error);
  }

  return NextResponse.json({ exists: false });
}
