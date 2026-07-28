import React, { useState, useEffect } from "react";
import { Upload, X, Settings } from "lucide-react";

interface BackgroundPreset {
  id: string;
  name: string;
  url: string;
  color?: string;
}

interface BackgroundPickerProps {
  onBackgroundChange: (bg: {
    url?: string;
    blur: number;
    color?: string;
  }) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "lavender-field",
    name: "Lavender Field",
    url: "/lavender-field-optimized.webp",
    color: "#7c5cbf",
  },

  {
    id: "tech-circuit",
    name: "Tech Circuit",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920&q=80",
    color: "#0a0e27",
  },
  {
    id: "dark-abstract",
    name: "Dark Abstract",
    url: "https://images.unsplash.com/photo-1557821552-17105176677c?w=1920&q=80",
    color: "#1a1a2e",
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80",
    color: "#0d1117",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80",
    color: "#0f0c29",
  },
  {
    id: "matrix",
    name: "Matrix",
    url: "https://images.unsplash.com/photo-1526374965328-7f5ae4e8b08f?w=1920&q=80",
    color: "#0a0e27",
  },
  {
    id: "minimal-dark",
    name: "Minimal Dark",
    url: "https://images.unsplash.com/photo-1557672172-298e090d0f80?w=1920&q=80",
    color: "#1a1a1a",
  },
];

export function BackgroundPicker({
  onBackgroundChange,
  isOpen,
  onClose,
}: BackgroundPickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("lavender-field");
  const [blurIntensity, setBlurIntensity] = useState(40);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Load saved preferences from localStorage
    const saved = localStorage.getItem("enosx-background-prefs");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setSelectedPreset(prefs.preset || "lavender-field");
        setBlurIntensity(prefs.blur || 40);
        setUploadedImage(prefs.uploaded || null);
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    setUploadedImage(null);
    const preset = BACKGROUND_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onBackgroundChange({
        url: preset.url,
        blur: blurIntensity,
        color: preset.color,
      });
      savePreferences(presetId, blurIntensity, null);
    }
  };

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const blur = parseInt(e.target.value);
    setBlurIntensity(blur);
    const url = uploadedImage || BACKGROUND_PRESETS.find((p) => p.id === selectedPreset)?.url;
    onBackgroundChange({
      url,
      blur,
    });
    savePreferences(selectedPreset, blur, uploadedImage);
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setUploadedImage(imageUrl);
      onBackgroundChange({
        url: imageUrl,
        blur: blurIntensity,
      });
      savePreferences(selectedPreset, blurIntensity, imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      handleImageUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const savePreferences = (preset: string, blur: number, uploaded: string | null) => {
    localStorage.setItem(
      "enosx-background-prefs",
      JSON.stringify({
        preset,
        blur,
        uploaded,
      })
    );
  };

  // Remove empty suggestion div above command bar
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-white">Customize Background</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
              Upload Custom Image
            </h3>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? "border-red-500 bg-red-500/10"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-300 mb-2">Drag and drop your image here</p>
              <p className="text-gray-500 text-sm mb-4">or</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium cursor-pointer transition-colors">
                  Browse Files
                </span>
              </label>
            </div>
            {uploadedImage && (
              <div className="mt-2 flex items-center justify-between p-3 bg-gray-800 rounded">
                <span className="text-gray-300 text-sm">Custom image uploaded</span>
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    handlePresetSelect(selectedPreset);
                  }}
                  className="text-red-500 hover:text-red-400 text-sm"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Preset Backgrounds */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
              Preset Backgrounds
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`relative h-24 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedPreset === preset.id && !uploadedImage
                      ? "border-red-600 ring-2 ring-red-600/50"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover blur-sm"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-xs font-medium text-center px-2">
                      {preset.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Blur Intensity */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
              Blur Intensity
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                value={blurIntensity}
                onChange={handleBlurChange}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
              <span className="text-gray-300 font-medium w-12 text-right">{blurIntensity}%</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Higher values create a more blurred background effect
            </p>
          </div>

          {/* Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wider">
              Preview
            </h3>
            <div
              className="h-32 rounded-lg overflow-hidden border border-gray-700"
              style={{
                backgroundImage: `url('${
                  uploadedImage ||
                  BACKGROUND_PRESETS.find((p) => p.id === selectedPreset)?.url
                }')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: `blur(${blurIntensity}px)`,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 bg-gray-950 sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
