"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;
  const [modelSrc, setModelSrc] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [arActivated, setArActivated] = useState(false);
  const modelViewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Detect mobile
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Load model-viewer script
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    // Check if model exists
    fetch(`/api/check-model?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists) {
          setModelSrc(data.src);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [id]);

  const activateAR = () => {
    const modelViewer = modelViewerRef.current as any;
    if (modelViewer?.activateAR) {
      modelViewer.activateAR();
      setArActivated(true);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Model not found</p>
      </div>
    );
  }

  if (!modelSrc || !scriptLoaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading AR experience...</p>
        </div>
      </div>
    );
  }

  // Mobile: Full-screen AR prompt
  if (isMobile && !arActivated) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Hidden model-viewer to enable AR */}
        {/* @ts-expect-error model-viewer is a web component */}
        <model-viewer
          ref={modelViewerRef}
          src={modelSrc}
          ar
          ar-modes="webxr scene-viewer quick-look"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }}
        />

        {/* Full screen AR prompt */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-24 h-24 mb-8 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-center">AR Experience Ready</h1>
          <p className="text-gray-400 text-center mb-8">Tap below to place this 3D model in your space</p>

          <button
            onClick={activateAR}
            className="w-full max-w-xs bg-white text-black font-bold py-4 px-8 rounded-full text-lg active:scale-95 transition-transform"
          >
            View in AR
          </button>

          <p className="text-gray-500 text-sm mt-6 text-center">
            Point your camera at a flat surface
          </p>
        </div>
      </div>
    );
  }

  // Desktop or after AR activated: Show model-viewer
  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: "#1a1a1a", width: "100vw", height: "100vh" }}>
      {/* @ts-expect-error model-viewer is a web component */}
      <model-viewer
        ref={modelViewerRef}
        src={modelSrc}
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        auto-rotate
        tone-mapping="neutral"
        exposure="1.0"
        shadow-intensity="1"
        environment-image="neutral"
        camera-orbit="0deg 75deg 105%"
        min-camera-orbit="auto auto 50%"
        max-camera-orbit="auto auto 200%"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1a1a",
        }}
      >
        <button
          slot="ar-button"
          style={{
            position: "absolute",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "12px 24px",
            backgroundColor: "#fff",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          View in AR
        </button>
      </model-viewer>
    </div>
  );
}
