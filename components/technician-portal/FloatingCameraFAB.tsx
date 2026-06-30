/** @format */

import React from "react";
import { CameraIcon } from "@heroicons/react/24/outline";

interface FloatingCameraFABProps {
  onCameraOpen: () => void;
  photoCount: number;
  disabled?: boolean;
}

const FloatingCameraFAB: React.FC<FloatingCameraFABProps> = ({
  onCameraOpen,
  photoCount,
  disabled = false,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onCameraOpen();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        fixed right-4 bottom-28 z-40
        w-14 h-14 rounded-full
        flex items-center justify-center
        bg-teal-500 hover:bg-teal-400
        text-white shadow-lg
        transition-all duration-150 ease-out
        active:scale-95
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${photoCount === 0 && !disabled ? "animate-pulse" : ""}
      `}
      aria-label={`فتح الكاميرا - ${photoCount} صور`}
    >
      <CameraIcon className="w-6 h-6" />

      {photoCount > 0 && (
        <span
          className="
            absolute -top-1 -right-1
            w-5 h-5 rounded-full
            bg-red-500 text-white
            text-xs font-medium
            flex items-center justify-center
          "
        >
          {photoCount > 9 ? "9+" : photoCount}
        </span>
      )}
    </button>
  );
};

export default FloatingCameraFAB;