import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import QRCode from "qrcode";
import { v4 as uuid } from "uuid";
import * as THREE from "three";
import { Document, NodeIO, Accessor } from "@gltf-transform/core";
import { JSDOM } from "jsdom";

// Polyfill DOMParser for Node.js BEFORE importing SVGLoader
const dom = new JSDOM();
(global as any).DOMParser = dom.window.DOMParser;

export async function POST(req: NextRequest) {
  // Dynamic import SVGLoader after DOMParser is polyfilled
  const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");

  const formData = await req.formData();
  const file = formData.get("svg") as File;
  const depth = parseFloat(formData.get("depth") as string) || 0.3;
  const color = (formData.get("color") as string) || "#4285f4";
  const useOriginalColors = formData.get("useOriginalColors") === "true";

  if (!file) {
    return NextResponse.json({ error: "No SVG uploaded" }, { status: 400 });
  }

  const svgText = await file.text();

  // Parse SVG using Three.js SVGLoader
  const loader = new SVGLoader();
  const svgData = loader.parse(svgText);

  // Collect geometries with their colors
  const geometriesWithColors: { geometry: THREE.BufferGeometry; color: THREE.Color }[] = [];

  for (const shapePath of svgData.paths) {
    const shapes = SVGLoader.createShapes(shapePath);
    // Get the fill color from the path (SVGLoader provides this)
    const pathColor = shapePath.color ? new THREE.Color(shapePath.color) : new THREE.Color(color);

    for (const shape of shapes) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: depth,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelSegments: 3,
      });
      geometriesWithColors.push({ geometry, color: pathColor });
    }
  }

  if (geometriesWithColors.length === 0) {
    return NextResponse.json({ error: "Could not parse SVG paths" }, { status: 400 });
  }

  // Calculate bounding box across all geometries for centering
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const { geometry } of geometriesWithColors) {
    geometry.computeVertexNormals();
    const positions = geometry.getAttribute("position").array;
    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]);
      maxX = Math.max(maxX, positions[i]);
      minY = Math.min(minY, positions[i + 1]);
      maxY = Math.max(maxY, positions[i + 1]);
      minZ = Math.min(minZ, positions[i + 2]);
      maxZ = Math.max(maxZ, positions[i + 2]);
    }
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const maxSize = Math.max(sizeX, sizeY);
  const scale = 2 / maxSize; // Normalize to ~2 units

  // Build GLB with gltf-transform
  const doc = new Document();
  const buffer = doc.createBuffer();
  const mesh = doc.createMesh();

  // Group geometries by color if using original colors, otherwise merge all
  if (useOriginalColors) {
    // Create separate primitives for each color group
    const colorGroups = new Map<string, { positions: number[]; normals: number[]; color: THREE.Color }>();

    for (const { geometry, color: geomColor } of geometriesWithColors) {
      const colorKey = geomColor.getHexString();
      if (!colorGroups.has(colorKey)) {
        colorGroups.set(colorKey, { positions: [], normals: [], color: geomColor });
      }
      const group = colorGroups.get(colorKey)!;

      const positions = geometry.getAttribute("position").array;
      const normals = geometry.getAttribute("normal").array;

      // Transform and add to group
      for (let i = 0; i < positions.length; i += 3) {
        group.positions.push(
          (positions[i] - centerX) * scale,
          -(positions[i + 1] - centerY) * scale,
          (positions[i + 2] - centerZ) * scale
        );
        group.normals.push(
          normals[i],
          -normals[i + 1],
          normals[i + 2]
        );
      }
    }

    // Create primitives for each color group
    for (const [, group] of colorGroups) {
      const posArray = new Float32Array(group.positions);
      const normalArray = new Float32Array(group.normals);

      const positionAccessor = doc.createAccessor()
        .setType(Accessor.Type.VEC3)
        .setArray(posArray)
        .setBuffer(buffer);

      const normalAccessor = doc.createAccessor()
        .setType(Accessor.Type.VEC3)
        .setArray(normalArray)
        .setBuffer(buffer);

      const material = doc.createMaterial()
        .setBaseColorFactor([group.color.r, group.color.g, group.color.b, 1.0])
        .setMetallicFactor(0.3)
        .setRoughnessFactor(0.7);

      const primitive = doc.createPrimitive()
        .setAttribute("POSITION", positionAccessor)
        .setAttribute("NORMAL", normalAccessor)
        .setMaterial(material);

      mesh.addPrimitive(primitive);
    }
  } else {
    // Merge all geometries with single color (original behavior)
    let totalPositions: number[] = [];
    let totalNormals: number[] = [];

    for (const { geometry } of geometriesWithColors) {
      const positions = geometry.getAttribute("position").array;
      const normals = geometry.getAttribute("normal").array;

      for (let i = 0; i < positions.length; i += 3) {
        totalPositions.push(
          (positions[i] - centerX) * scale,
          -(positions[i + 1] - centerY) * scale,
          (positions[i + 2] - centerZ) * scale
        );
        totalNormals.push(
          normals[i],
          -normals[i + 1],
          normals[i + 2]
        );
      }
    }

    const posArray = new Float32Array(totalPositions);
    const normalArray = new Float32Array(totalNormals);

    const positionAccessor = doc.createAccessor()
      .setType(Accessor.Type.VEC3)
      .setArray(posArray)
      .setBuffer(buffer);

    const normalAccessor = doc.createAccessor()
      .setType(Accessor.Type.VEC3)
      .setArray(normalArray)
      .setBuffer(buffer);

    const threeColor = new THREE.Color(color);
    const material = doc.createMaterial()
      .setBaseColorFactor([threeColor.r, threeColor.g, threeColor.b, 1.0])
      .setMetallicFactor(0.3)
      .setRoughnessFactor(0.7);

    const primitive = doc.createPrimitive()
      .setAttribute("POSITION", positionAccessor)
      .setAttribute("NORMAL", normalAccessor)
      .setMaterial(material);

    mesh.addPrimitive(primitive);
  }

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
