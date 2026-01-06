"use client";

import { useState } from "react";

type Mode = "text" | "photo" | "logo" | "file";

export default function Home() {
  const [mode, setMode] = useState<Mode>("text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [color, setColor] = useState("#4285f4");
  const [depth, setDepth] = useState(3);
  const [gloss, setGloss] = useState(4);
  const [useOriginalColors, setUseOriginalColors] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ qrCode: string; viewUrl: string } | null>(null);

  const resetState = () => {
    setFile(null);
    setResult(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("model", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTextGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, color, depth, gloss }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/generate-photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("svg", file);
    formData.append("depth", String(depth * 0.1));
    formData.append("color", color);
    formData.append("useOriginalColors", String(useOriginalColors));

    try {
      const res = await fetch("/api/generate-logo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const modes: { id: Mode; label: string }[] = [
    { id: "text", label: "AR Text" },
    { id: "photo", label: "AR Photo" },
    { id: "logo", label: "AR Logo" },
    { id: "file", label: "3D File" },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">AR View</h1>
        <p className="text-gray-400 mb-6">Create AR experiences with QR codes</p>

        {/* Mode Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); resetState(); }}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                mode === m.id ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Text Mode */}
        {mode === "text" && (
          <form onSubmit={handleTextGenerate} className="space-y-4">
            <div>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Your text"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                maxLength={20}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer bg-transparent"
                  />
                  <span className="text-gray-400 text-sm">{color}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Depth: {depth}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Gloss: {gloss}</label>
              <input
                type="range"
                min="0"
                max="10"
                value={gloss}
                onChange={(e) => setGloss(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate AR Code"}
            </button>
          </form>
        )}

        {/* Photo Mode */}
        {mode === "photo" && (
          <form onSubmit={handlePhotoGenerate} className="space-y-4">
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                {file ? (
                  <span className="text-green-400">{file.name}</span>
                ) : (
                  <span className="text-gray-500">Click to upload PNG or JPG image</span>
                )}
              </label>
            </div>

            <p className="text-sm text-gray-500">
              Image will appear as a floating photo in AR
            </p>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate AR Code"}
            </button>
          </form>
        )}

        {/* Logo Mode */}
        {mode === "logo" && (
          <form onSubmit={handleLogoGenerate} className="space-y-4">
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload" className="cursor-pointer">
                {file ? (
                  <span className="text-green-400">{file.name}</span>
                ) : (
                  <span className="text-gray-500">Click to upload SVG file</span>
                )}
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="use-original-colors"
                checked={useOriginalColors}
                onChange={(e) => setUseOriginalColors(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="use-original-colors" className="text-sm text-gray-300">
                Use original SVG colors
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={useOriginalColors ? "opacity-50 pointer-events-none" : ""}>
                <label className="block text-sm text-gray-400 mb-2">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer bg-transparent"
                    disabled={useOriginalColors}
                  />
                  <span className="text-gray-400 text-sm">{color}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Depth: {depth}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              SVG paths will be extruded into a 3D model
            </p>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate AR Code"}
            </button>
          </form>
        )}

        {/* File Mode */}
        {mode === "file" && (
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="model-upload"
              />
              <label htmlFor="model-upload" className="cursor-pointer">
                {file ? (
                  <span className="text-green-400">{file.name}</span>
                ) : (
                  <span className="text-gray-500">Click to upload .glb or .gltf file</span>
                )}
              </label>
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate AR Code"}
            </button>
          </form>
        )}

        {/* Result */}
        {result && (
          <div className="mt-8 space-y-4">
            <div className="bg-white rounded-lg p-4 flex justify-center">
              <img src={result.qrCode} alt="QR Code" className="w-64 h-64" />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.download = "ar-qrcode.png";
                  link.href = result.qrCode;
                  link.click();
                }}
                className="flex-1 bg-gray-800 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition"
              >
                Download QR
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result.viewUrl);
                  alert("Link copied!");
                }}
                className="flex-1 bg-gray-800 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition"
              >
                Copy Link
              </button>
            </div>

            <p className="text-center text-sm text-gray-400">
              Scan to view in AR or{" "}
              <a href={result.viewUrl} target="_blank" className="text-blue-400 underline">
                open directly
              </a>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
