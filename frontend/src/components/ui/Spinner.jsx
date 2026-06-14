import React from "react";

export default function Spinner({ size = "md", color = "primary" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const colors = {
    primary: "border-primary-200 border-t-primary-600",
    white: "border-white/30 border-t-white",
    gray: "border-gray-200 border-t-gray-600",
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizes[size]} ${colors[color]} rounded-full animate-spin`}
      />
    </div>
  );
}
