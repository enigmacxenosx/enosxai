/*
 * ENOSX AI — CameraFeed Component
 * Displays live camera feed with capture and toggle controls.
 * Integrates with useCamera hook for video streaming.
 */

import React from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, RotateCw, Zap } from "lucide-react";
import { useCamera } from "../hooks/useCamera";

interface CameraFeedProps {
  onFrameCapture?: (frameData: string) => void;
  accentColor?: string;
  accentRgb?: string;
}

export default function CameraFeed({
  onFrameCapture,
  accentColor = "#00ff88",
  accentRgb = "0, 255, 136",
}: CameraFeedProps) {
  const { videoRef, canvasRef, cameraState, toggleCamera, switchCameraFacing, captureFrame } =
    useCamera();

  const handleCapture = () => {
    const frame = captureFrame();
    if (frame && onFrameCapture) {
      onFrameCapture(frame);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Video Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full rounded-2xl overflow-hidden border-2"
        style={{
          borderColor: cameraState.isActive ? accentColor : `rgba(${accentRgb}, 0.2)`,
          aspectRatio: "16 / 9",
          background: "rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Video Stream */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Status Overlay */}
        {!cameraState.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <CameraOff size={48} style={{ color: accentColor }} className="mx-auto mb-3 opacity-60" />
              <p style={{ color: accentColor }} className="text-sm font-medium">
                {cameraState.error || "Camera is off"}
              </p>
            </div>
          </div>
        )}

        {/* Live Indicator */}
        {cameraState.isActive && (
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: `rgba(${accentRgb}, 0.15)`,
              border: `1px solid ${accentColor}`,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full"
              style={{ background: accentColor }}
            />
            <span style={{ color: accentColor }} className="text-xs font-semibold">
              LIVE
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Controls */}
      <div className="flex gap-3 justify-center">
        {/* Toggle Camera */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleCamera}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
          style={{
            background: cameraState.isActive ? `rgba(${accentRgb}, 0.2)` : `rgba(${accentRgb}, 0.1)`,
            border: `1px solid ${accentColor}`,
            color: accentColor,
          }}
        >
          {cameraState.isActive ? (
            <>
              <CameraOff size={18} />
              Stop Camera
            </>
          ) : (
            <>
              <Camera size={18} />
              Start Camera
            </>
          )}
        </motion.button>

        {/* Switch Facing */}
        {cameraState.isActive && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={switchCameraFacing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              background: `rgba(${accentRgb}, 0.1)`,
              border: `1px solid ${accentColor}`,
              color: accentColor,
            }}
          >
            <RotateCw size={18} />
            Flip
          </motion.button>
        )}

        {/* Capture Frame */}
        {cameraState.isActive && onFrameCapture && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCapture}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
            style={{
              background: `rgba(${accentRgb}, 0.25)`,
              border: `1px solid ${accentColor}`,
              color: accentColor,
            }}
          >
            <Zap size={18} />
            Capture
          </motion.button>
        )}
      </div>

      {/* Error Message */}
      {cameraState.error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg text-sm"
          style={{
            background: `rgba(255, 100, 100, 0.1)`,
            border: `1px solid rgba(255, 100, 100, 0.3)`,
            color: "#ff6464",
          }}
        >
          {cameraState.error}
        </motion.div>
      )}
    </div>
  );
}
