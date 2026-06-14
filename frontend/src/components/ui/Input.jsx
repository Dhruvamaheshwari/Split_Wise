import React, { forwardRef } from "react";

const Input = forwardRef(({ label, error, className = "", ...props }, ref) => {
  return (
    <div className={`mb-4 w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-4 py-2.5 bg-white/50 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
          error
            ? "border-red-500 focus:ring-red-500/50"
            : "border-gray-200 focus:border-primary-500 focus:ring-primary-500/30 hover:border-gray-300"
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-500 font-medium ml-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
export default Input;
