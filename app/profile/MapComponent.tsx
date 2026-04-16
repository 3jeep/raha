"use client";
import React, { useCallback, useRef, useMemo } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

// 1. التعريفات خارج المكون لضمان عدم حدوث Loop في التحميل
const libraries: ("places" | "geometry" | "maps")[] = ["places", "geometry", "maps"];

export default function MapComponent({ mapCenter, setProfile, profile }: any) {
  const mapRef = useRef<google.maps.Map | null>(null);

  // 2. توحيد الإعدادات (نفس الإعدادات في كل المشروع)
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0",
    libraries,
    language: 'ar',
    // نصيحة: إذا استمر الخطأ، احذف سطر region تماماً من كل الملفات
    region: 'SD', 
  });

  const defaultCenter = useMemo(() => ({
    lat: Number(profile?.latitude) || (Array.isArray(mapCenter) ? mapCenter[0] : 15.5007),
    lng: Number(profile?.longitude) || (Array.isArray(mapCenter) ? mapCenter[1] : 32.5599),
  }), [profile?.latitude, profile?.longitude, mapCenter]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const goToCurrentLocation = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setProfile((prev: any) => ({ ...prev, latitude: coords.lat, longitude: coords.lng }));
          mapRef.current?.panTo(coords);
          mapRef.current?.setZoom(17);
        },
        () => alert("⚠️ الـ GPS مقفول!")
      );
    }
  };

  if (loadError) return <div className="p-4 text-red-500 text-xs">خطأ في تحميل الخريطة</div>;

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-gray-400 italic">جاري تهيئة الخرائط...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <button 
        type="button"
        onClick={(e) => { e.preventDefault(); goToCurrentLocation(); }}
        className="absolute bottom-32 right-6 z-[10] bg-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border border-gray-100 active:scale-90 transition-all"
      >
        <span className="text-2xl">🎯</span>
      </button>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={defaultCenter}
        zoom={15}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: true, 
          gestureHandling: "greedy",
        }}
        onClick={(e) => {
          if (e.latLng) {
            setProfile((prev: any) => ({ 
              ...prev, 
              latitude: e.latLng!.lat(), 
              longitude: e.latLng!.lng() 
            }));
          }
        }}
      >
        {profile?.latitude && (
          <Marker position={{ lat: Number(profile.latitude), lng: Number(profile.longitude) }} />
        )}
      </GoogleMap>
    </div>
  );
}
