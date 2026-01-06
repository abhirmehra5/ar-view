import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import path from "path";
import QRCode from "qrcode";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("model") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const id = uuid();
  const ext = path.extname(file.name);
  const filename = `models/${id}${ext}`;

  // Upload to Vercel Blob
  const blob = await put(filename, file, {
    access: "public",
  });

  // Generate URLs
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  // For QR code, use network IP instead of localhost (for local dev)
  let qrHost = host;
  if (host.includes("localhost")) {
    const { networkInterfaces } = await import("os");
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          qrHost = `${net.address}:${host.split(":")[1] || "3000"}`;
          break;
        }
      }
    }
  }

  const viewUrl = `${protocol}://${qrHost}/view/${id}`;

  // Generate QR code
  const qrCode = await QRCode.toDataURL(viewUrl, { width: 512, margin: 2 });

  return NextResponse.json({ qrCode, viewUrl, id, blobUrl: blob.url });
}
