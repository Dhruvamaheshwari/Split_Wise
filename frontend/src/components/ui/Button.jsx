import React from "react";
import Spinner from "./Spinner";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  isLoading = false,
  disabled = false,
  className = "",
}) {
  const baseStyles = "relative flex justify-center items-center py-2.5 px-4 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary-600 hover:bg-primary-500 text-white shadow-sm hover:shadow-md focus:ring-primary-500",
    secondary: "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm focus:ring-gray-500",
    danger: "bg-red-600 hover:bg-red-500 text-white shadow-sm hover:shadow-md focus:ring-red-500",
    glass: "glass-panel hover:bg-white/90 text-gray-800 focus:ring-gray-400",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {isLoading && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Spinner size="sm" color={variant === "secondary" || variant === "glass" ? "gray" : "white"} />
        </div>
      )}
      <span className={`${isLoading ? "opacity-0" : "opacity-100"} transition-opacity`}>
        {children}
      </span>
    </button>
  );
}
