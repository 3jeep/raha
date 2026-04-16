"use client";
import React, { ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// ✅ لازم المصفوفة دي تكون بالشكل ده عشان البحث يشتغل
const LIBRARIES: ("places" | "geometry" | "maps")[] = ["places", "geometry", "maps"];

export default function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0", // تأكد من مفتاحك
    libraries: LIBRARIES, // ✅ هنا السر، لازم تكون محدد "places"
    language: "ar",
    region: "SD",
  });

  if (!isLoaded) return <div className="p-4">جاري تحميل خدمات الخرائط...</div>;

  return <>{children}</>;
}
