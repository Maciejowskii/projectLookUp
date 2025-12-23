"use client";

import { Toaster as Sonner } from "react-hot-toast";

const Toaster = () => {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: "linear-gradient(135deg, #10b981, #059669)",
          color: "white",
          fontWeight: "500",
          borderRadius: "12px",
          padding: "12px 20px",
          boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
        },
      }}
    />
  );
};

export default Toaster;
