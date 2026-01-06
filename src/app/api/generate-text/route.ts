import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { put } from "@vercel/blob";
import path from "path";
import QRCode from "qrcode";
import { v4 as uuid } from "uuid";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, color = "#4285f4", depth = 3, gloss = 4 } = body;

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  // Load font
  const fontPath = path.join(process.cwd(), "public", "fonts", "helvetiker_bold.typeface.json");
  const fontData = await readFile(fontPath, "utf-8");
  const loader = new FontLoader();
  const font = loader.parse(JSON.parse(fontData));

  // Create 3D text geometry with Three.js
  const geometry = new TextGeometry(text, {
    font: font,
    size: 1,
    depth: depth * 0.1,
    curveSegments: 12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 5,
  });

  // Center the geometry
  geometry.computeBoundingBox();
  const boundingBox = geometry.boundingBox!;
  const centerX = (boundingBox.max.x - boundingBox.min.x) / 2;
  const centerY = (boundingBox.max.y - boundingBox.min.y) / 2;
  geometry.translate(-centerX, -centerY, 0);
  geometry.computeVertexNormals();

  // Extract geometry data
  const positionAttr = geometry.getAttribute("position");
  const normalAttr = geometry.getAttribute("normal");
  const indexAttr = geometry.getIndex();

  const positions = new Float32Array(positionAttr.array);
  const normals = new Float32Array(normalAttr.array);
  const indices = indexAttr ? new Uint32Array(indexAttr.array) : null;

  // Parse color
  const threeColor = new THREE.Color(color);
  const baseColor: [number, number, number, number] = [threeColor.r, threeColor.g, threeColor.b, 1.0];

  // Build GLB with gltf-transform
  const doc = new Document();
  const buffer = doc.createBuffer();

  // Create accessors
  const positionAccessor = doc.createAccessor()
    .setType(Accessor.Type.VEC3)
    .setArray(positions)
    .setBuffer(buffer);

  const normalAccessor = doc.createAccessor()
    .setType(Accessor.Type.VEC3)
    .setArray(normals)
    .setBuffer(buffer);

  // Create material
  const material = doc.createMaterial()
    .setBaseColorFactor(baseColor)
    .setMetallicFactor(gloss * 0.1)
    .setRoughnessFactor(1 - gloss * 0.1);

  // Create primitive
  const primitive = doc.createPrimitive()
    .setAttribute("POSITION", positionAccessor)
    .setAttribute("NORMAL", normalAccessor)
    .setMaterial(material);

  if (indices) {
    const indexAccessor = doc.createAccessor()
      .setType(Accessor.Type.SCALAR)
      .setArray(indices)
      .setBuffer(buffer);
    primitive.setIndices(indexAccessor);
  }

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
  const blob = await put(filename, Buffer.from(glbBuffer), {
    access: "public",
    contentType: "model/gltf-binary",
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
