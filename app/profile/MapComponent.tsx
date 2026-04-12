"use client";
import React, { useState, useCallback, useRef, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// إحداثيات افتراضية لوسط الخرطوم كمرجع أولي
const SUDAN_CENTER = { lat: 15.5007, lng: 32.5599 };

export default function MapComponent({ mapCenter, setProfile, profile }: any) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // استخدام useMemo لمنع إعادة تحميل المكتبات وتجنب خطأ الـ Loader
  const libraries = useMemo(() => ["places"], []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0",
    libraries: libraries as any,
    version: "weekly",
    language: "ar",
    region: "SD" 
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // وظيفة جلب الموقع الحالي وتحديث "نطاق البحث" بناءً عليه
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setProfile((prev: any) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
          mapRef.current?.panTo(pos);
          mapRef.current?.setZoom(17);

          // تحديث حدود البحث (Bounds) لتصبح حول موقع المستخدم الحالي
          if (autocomplete) {
            const circle = new google.maps.Circle({ center: pos, radius: 20000 }); // نطاق 20 كلم
            autocomplete.setBounds(circle.getBounds());
          }
        },
        () => alert("يرجى تفعيل الـ GPS")
      );
    }
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const newLat = place.geometry.location.lat();
        const newLng = place.geometry.location.lng();

        setProfile((prev: any) => ({ ...prev, latitude: newLat, longitude: newLng }));
        mapRef.current?.panTo({ lat: newLat, lng: newLng });
        mapRef.current?.setZoom(16);
      }
    }
  };

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setProfile((prev: any) => ({
        ...prev,
        latitude: e.latLng!.lat(),
        longitude: e.latLng!.lng(),
      }));
    }
  }, [setProfile]);

  if (loadError) return <div className="h-full flex items-center justify-center text-red-500">خطأ في الاتصال بجوجل</div>;
  if (!isLoaded) return <div className="h-full flex items-center justify-center">جاري التحميل...</div>;

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] z-[1000]">
        <div className="relative flex items-center">
          <Autocomplete
            onLoad={(ac) => setAutocomplete(ac)}
            onPlaceChanged={onPlaceChanged}
            options={{
              // تقييد داخل السودان
              componentRestrictions: { country: "sd" },
              // ترتيب النتائج حسب المسافة من مركز الخريطة الحالي (لحل مشكلة شارع الأزهري)
              fields: ["geometry", "formatted_address", "name"],
            }}
            className="w-full"
          >
            <input
              type="text"
              placeholder="ابحث عن منطقة (مثلاً: أم درمان شارع الأزهري)..."
              className="w-full p-4 pr-12 rounded-2xl border-none shadow-2xl text-[13px] font-bold outline-none bg-white text-gray-800"
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            />
          </Autocomplete>
          
          <button
            onClick={handleCurrentLocation}
            type="button"
            className="absolute right-2 bg-[#1E293B] text-white p-2.5 rounded-xl active:scale-95 shadow-lg"
          >
            📍
          </button>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{
          lat: profile?.latitude || mapCenter[0] || SUDAN_CENTER.lat,
          lng: profile?.longitude || mapCenter[1] || SUDAN_CENTER.lng,
        }}
        zoom={15}
        onLoad={onMapLoad}
        onClick={onMapClick}
        options={{
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false
        }}
      >
        {profile?.latitude && profile?.longitude && (
          <Marker
            position={{ lat: profile.latitude, lng: profile.longitude }}
            animation={google.maps.Animation.DROP}
          />
        )}
      </GoogleMap>
    </div>
  );
}
