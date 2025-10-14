// src/components/BarcodeScannerEmbedded.tsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

// ==================================================================
// 1. CSS (No changes)
// ==================================================================
const componentCss = `
  .permission-placeholder { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: #f3f4f6; text-align: center; padding: 1rem; border-radius: 8px; }
  .permission-placeholder p { margin-top: 1rem; font-size: 1rem; color: #6b7280; max-width: 350px; }
`;
const ComponentStyles = () => <style>{componentCss}</style>;

// ==================================================================
// 2. Placeholder and Icon Components (No changes)
// ==================================================================
const CameraIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: "#888" }}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

interface PermissionPlaceholderProps {
  status: "requesting" | "denied" | "error" | "no-cameras";
}

const PermissionPlaceholder: React.FC<PermissionPlaceholderProps> = ({
  status,
}) => {
  const messages = {
    requesting: "Please allow this site to use the camera.",
    denied:
      "Camera access was denied. Please enable it in your browser settings to continue.",
    "no-cameras": "No cameras were found on your device.",
    error:
      "An unexpected error occurred. Please try another browser or device.",
  };
  return (
    <div className="permission-placeholder">
      <CameraIcon />
      <p>{messages[status]}</p>
    </div>
  );
};

// ==================================================================
// 3. Main Barcode Scanner Component (WITH FINAL FIX)
// ==================================================================
type PermissionStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "error"
  | "no-cameras";

interface BarcodeScannerEmbeddedProps {
  onScanSuccess: (text: string) => void;
  onScanError?: (error: Error) => void;
  isActive: boolean;
  className?: string;
}

const BarcodeScannerEmbedded: React.FC<BarcodeScannerEmbeddedProps> = ({
  onScanSuccess,
  onScanError = () => {},
  isActive,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("idle");
  const [torchOn, setTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);

  useEffect(() => {
    if (isActive) {
      const startScanner = async () => {
        if (!videoRef.current) return;
        setPermissionStatus("requesting");
        setIsTorchSupported(false);

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });

          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities = track.getCapabilities();
            if (capabilities.torch) {
              setIsTorchSupported(true);
            }
          }

          setPermissionStatus("granted");

          await codeReader.current.decodeFromStream(
            stream,
            videoRef.current,
            (result, err) => {
              if (result) onScanSuccess(result.getText());
              if (err && !(err instanceof NotFoundException))
                onScanError(err as Error);
            }
          );
        } catch (err: any) {
          console.error("Camera access error:", err);
          if (err.name === "NotAllowedError") setPermissionStatus("denied");
          else if (
            err.name === "NotFoundError" ||
            err.name === "OverconstrainedError"
          )
            setPermissionStatus("no-cameras");
          else setPermissionStatus("error");
          onScanError(err);
        }
      };
      startScanner();
    }

    return () => {
      codeReader.current.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setPermissionStatus("idle");
    };
  }, [isActive, onScanSuccess, onScanError]);

  const handleTorchToggle = useCallback(async () => {
    if (streamRef.current && isTorchSupported) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn((prev) => !prev);
      } catch (err) {
        console.error("Failed to toggle torch:", err);
        alert(
          "Could not toggle the torch. This feature may not be fully supported on your browser."
        );
      }
    }
  }, [torchOn, isTorchSupported]);

  // --- Main Render Logic ---
  if (!isActive) return null;

  return (
    <div className={`p-2 border rounded-md ${className || ""}`}>
      <ComponentStyles />
      <div
        className="relative w-full bg-gray-200"
        style={{ paddingTop: "56.25%" }}
      >
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-contain"
          playsInline
          muted
          autoPlay
          style={{ display: permissionStatus === "granted" ? "block" : "none" }}
        />
        {permissionStatus !== "granted" && (
          <PermissionPlaceholder
            status={
              permissionStatus as
                | "requesting"
                | "denied"
                | "error"
                | "no-cameras"
            }
          />
        )}
      </div>

      {permissionStatus === "granted" && (
        <div className="flex justify-center mt-2">
          {isTorchSupported && (
            <button
              // ** THIS IS THE FIX **
              type="button"
              onClick={handleTorchToggle}
              className="text-sm px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-500"
            >
              {torchOn ? "Torch Off" : "Torch On"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BarcodeScannerEmbedded;
