import React from "react";

export default function Card({ children, className = "", animate = true, hover = false }) {
  return (
    <div
      className={`glass-panel rounded-xl overflow-hidden ${
        animate ? "animate-slide-up" : ""
      } ${hover ? "hover-lift cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
