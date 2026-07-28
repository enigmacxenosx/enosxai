/*
 * ENOSX AI — useCamera Hook
 * Provides real-time camera access and image capture functionality.
 * Supports video streaming, frame capture, and image analysis preparation.
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface CameraState {
  isActive: boolean;
  isFacingUser: boolean;
  error: string | null;
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>({
    isActive: false,
    isFacingUser: true,
    error: null,
  });

  const startCamera = useCallback(async (facingMode: "user" | "environment" = "user") => {
    try {
      setCameraState((prev) => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraState({
        isActive: true,
        isFacingUser: facingMode === "user",
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access camera";
      setCameraState((prev) => ({
        ...prev,
        error: message,
        isActive: false,
      }));
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState((prev) => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    return canvasRef.current.toDataURL("image/jpeg", 0.8);
  }, []);

  const toggleCamera = useCallback(async () => {
    if (cameraState.isActive) {
      stopCamera();
    } else {
      await startCamera(cameraState.isFacingUser ? "user" : "environment");
    }
  }, [cameraState.isActive, cameraState.isFacingUser, startCamera, stopCamera]);

  const switchCameraFacing = useCallback(async () => {
    stopCamera();
    await startCamera(cameraState.isFacingUser ? "environment" : "user");
  }, [cameraState.isFacingUser, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    cameraState,
    startCamera,
    stopCamera,
    captureFrame,
    toggleCamera,
    switchCameraFacing,
  };
}
