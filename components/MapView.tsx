"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const mapOptions = {
  id: 'google-map-script',
  googleMapsApiKey: "AIzaSyCscTfT9KnGnoGj0dR96n8YbLFk5YdW2p0",
  version: "weekly",
};

const professionIcons: { [key: string]: string } = {
  "كهربائي": "⚡", "سباك (مواسيرجي)": "🚰", "فني تكييف وتبريد": "❄️",
  "توصيل طلبات (ركشة/موتر)": "🛵", "ممرض / ممرضة": "🩺", "فني غسالات": "🧺",
  "ميكانيكي": "🔧", "عامل مساعد": "🧹", "نقاش (بويجي)": "🎨",
  "نجار": "🪚", "فني ستالايت (دش)": "📡", "مبلط (سيراميك)": "🧱",
  "حداد": "⚒️", "بناء": "🏗️", "مساعد بناء (طُلبة)": "🧱",
  "طباخ": "👨‍🍳", "حلاق (خدمة منزلية)": "✂️", "غسيل عربات": "🚿"
};

const center = { lat: 15.5007, lng: 32.5599 };

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1));
};

export default function MapView({ serviceType }: { serviceType: string }) {
  const { isLoaded } = useJsApiLoader(mapOptions);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [handymen, setHandymen] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [noDataMsg, setNoDataMsg] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const fetchHandymen = useCallback(async (pos: { lat: number, lng: number }) => {
    try {
      const q = query(collection(db, "handymen"), where("profession", "==", serviceType), where("isActive", "==", true));
      const snap = await getDocs(q);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(h => getDistance(pos.lat, pos.lng, h.lat, h.lng) <= 10);
      
      if (data.length === 0) {
        setNoDataMsg(true);
        setHandymen([]);
      } else {
        setNoDataMsg(false);
        const sorted = data.sort((a, b) => getDistance(pos.lat, pos.lng, a.lat, a.lng) - getDistance(pos.lat, pos.lng, b.lat, b.lng));
        setHandymen(sorted);
        setTimeout(() => selectHandyman(0), 500);
      }
    } catch (e) { console.error(e); }
    finally { setDataReady(true); }
  }, [serviceType]);

  const selectHandyman = (index: number) => {
    setCurrentIndex(index);
    const h = handymen[index];
    if (h && mapRef.current) {
      mapRef.current.panTo({ lat: h.lat, lng: h.lng });
      mapRef.current.setZoom(16);
    }
  };

  const goToMyLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(16);
    }
  };

  useEffect(() => {
    if (isLoaded && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const latLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(latLng);
        fetchHandymen(latLng);
      }, () => { setNoDataMsg(true); setDataReady(true); });
    } else if (isLoaded) { setDataReady(true); }
  }, [isLoaded, fetchHandymen]);

  const handleAction = async (h: any, type: 'call' | 'wa') => {
    await updateDoc(doc(db, "handymen", h.id), { total_calls: increment(1) });
    window.open(type === 'call' ? `tel:${h.phone}` : `https://wa.me/${h.phone}`);
  };

  if (!isLoaded || !dataReady) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <img src="/images/logo.png" alt="Logo" className="w-32 h-32 animate-pulse mb-4" />
      <div className="text-black font-black">جاري التحميل...</div>
    </div>
  );

  return (
    <div className="relative h-screen w-full">
      <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={center} zoom={14} onLoad={(m) => mapRef.current = m}>
        {userLocation && (
          <Marker position={userLocation} icon={{ url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="50" fill="#3B82F6" stroke="white" stroke-width="8"/><text x="50%" y="50%" font-size="30" font-weight="bold" fill="white" text-anchor="middle" dy=".3em">أنت</text></svg>`)}`, scaledSize: new google.maps.Size(65, 65) }} />
        )}
        {handymen.map((h, i) => (
          <Marker key={h.id} position={{ lat: h.lat, lng: h.lng }} onClick={() => selectHandyman(i)} 
            icon={{ url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="50" fill="white" stroke="${h.isVerified ? '#3B82F6' : '#9CA3AF'}" stroke-width="8"/><text x="50%" y="50%" font-size="50" text-anchor="middle" dy=".3em">${professionIcons[h.profession] || "🛠️"}</text></svg>`)}`, scaledSize: new google.maps.Size(65, 65) }} 
          />
        ))}
      </GoogleMap>

      {noDataMsg && (
        <div className="absolute top-20 w-full px-6 z-30">
          <div className="bg-red-500 text-white p-5 rounded-3xl font-black text-center shadow-2xl">
            لا يوجد حرفيين في نطاق 10 كم.
          </div>
        </div>
      )}

      <button onClick={goToMyLocation} className="absolute top-4 right-4 bg-white p-4 rounded-full shadow-lg z-10 text-xl font-black">📍</button>

      <AnimatePresence>
        {currentIndex >= 0 && handymen[currentIndex] && (
          <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="absolute bottom-0 w-full bg-white p-6 rounded-t-3xl shadow-2xl z-20">
            <div className="flex justify-between items-center mb-5 gap-2">
              <button onClick={() => selectHandyman(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black shadow-md active:scale-95 transition-transform">⬅ السابق</button>
              <button onClick={() => setCurrentIndex(-1)} className="px-4 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs">إغلاق ✕</button>
              <button onClick={() => selectHandyman(Math.min(handymen.length - 1, currentIndex + 1))} disabled={currentIndex === handymen.length - 1} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black shadow-md active:scale-95 transition-transform">التالي ➡</button>
            </div>
            
            <h2 className="font-black text-xl">{handymen[currentIndex].name} {handymen[currentIndex].isVerified && "✅"}</h2>
            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-gray-700 mb-6 bg-gray-100 p-3 rounded-xl">
              <span>📍 {handymen[currentIndex].neighborhood || "غير محدد"}</span>
              <span>📞 {handymen[currentIndex].total_calls || 0} طلب</span>
              <span>📏 {userLocation ? `${getDistance(userLocation.lat, userLocation.lng, handymen[currentIndex].lat, handymen[currentIndex].lng)} كم` : "---"}</span>
              <span>🚗 ~{userLocation ? Math.round(getDistance(userLocation.lat, userLocation.lng, handymen[currentIndex].lat, handymen[currentIndex].lng) * 2) : "--"} دقيقة</span>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-black text-white py-4 rounded-2xl font-black" onClick={() => handleAction(handymen[currentIndex], 'call')}>اتصال</button>
              <button className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black" onClick={() => handleAction(handymen[currentIndex], 'wa')}>واتساب</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
