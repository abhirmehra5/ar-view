import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import QRCode from "qrcode";
import { v4 as uuid } from "uuid";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
  }

  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type as "image/png" | "image/jpeg";

  // Create a simple plane with the image as texture
  // Plane vertices (2 triangles forming a quad)
  const aspectRatio = 1; // Default, we'll keep it square for simplicity
  const width = 1;
  const height = width / aspectRatio;

  const positions = new Float32Array([
    -width / 2, -height / 2, 0,  // bottom-left
    width / 2, -height / 2, 0,   // bottom-right
    width / 2, height / 2, 0,    // top-right
    -width / 2, height / 2, 0,   // top-left
  ]);

  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);

  const uvs = new Float32Array([
    0, 1,  // bottom-left (V flipped for correct image orientation)
    1, 1,  // bottom-right
    1, 0,  // top-right
    0, 0,  // top-left
  ]);

  const indices = new Uint16Array([
    0, 1, 2,  // first triangle
    0, 2, 3,  // second triangle
  ]);

  // Build GLB with gltf-transform
  const doc = new Document();
  const buffer = doc.createBuffer();

  const positionAccessor = doc.createAccessor()
    .setType(Accessor.Type.VEC3)
    .setArray(positions)
    .setBuffer(buffer);

  const normalAccessor = doc.createAccessor()
    .setType(Accessor.Type.VEC3)
    .setArray(normals)
    .setBuffer(buffer);

  const uvAccessor = doc.createAccessor()
    .setType(Accessor.Type.VEC2)
    .setArray(uvs)
    .setBuffer(buffer);

  const indexAccessor = doc.createAccessor()
    .setType(Accessor.Type.SCALAR)
    .setArray(indices)
    .setBuffer(buffer);

  // Create texture from image
  const texture = doc.createTexture()
    .setImage(imageBuffer)
    .setMimeType(mimeType);

  // Create material with texture
  const material = doc.createMaterial()
    .setBaseColorTexture(texture)
    .setMetallicFactor(0)
    .setRoughnessFactor(1)
    .setDoubleSided(true);

  // Create primitive
  const primitive = doc.createPrimitive()
    .setAttribute("POSITION", positionAccessor)
    .setAttribute("NORMAL", normalAccessor)
    .setAttribute("TEXCOORD_0", uvAccessor)
    .setIndices(indexAccessor)
    .setMaterial(material);

  // Create mesh and node
  const mesh = doc.createMesh().addPrimitive(primitive);
  const node = doc.createNode().setMesh(mesh);
  const scene = doc.createScene().addChild(node);
  doc.getRoot().setDefaultScene(scene);

  // Export to GLB
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc);

  // Upload to Vercel Blob
  const id = uuid();
  const filename = `models/${id}.glb`;
  const blob = await put(filename, glbBuffer, {
    access: "public",
    contentType: "model/gltf-binary",
  });

  // Generate URLs
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

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
  const qrCode = await QRCode.toDataURL(viewUrl, { width: 512, margin: 2 });

  return NextResponse.json({ qrCode, viewUrl, id, blobUrl: blob.url });
}
