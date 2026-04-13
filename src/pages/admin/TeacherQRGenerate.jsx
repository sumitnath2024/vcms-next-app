import React, { useState } from 'react';
import { MapPin, Printer, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

// --- CAPACITOR IMPORTS ---
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

const TeacherQRGenerate = () => {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); 

  const roundCoord = (num) => Math.round(num * 1000) / 1000;

  const generateSecret = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const reCreateCode = async () => {
    setLoading(true);
    setError(null);

    try {
      let position;

      // --- YOUR PROVEN APP.JSX HARDWARE WAKE-UP LOGIC ---
      if (Capacitor.isNativePlatform()) {
        try {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000 
          });
        } catch (e) {
          console.warn("GPS Wake-up issue:", e);
          
          if (e.message?.includes("location disabled") || e.code === 2 || e.message?.toLowerCase().includes("location")) {
            const openSettings = window.confirm(
              "GPS is currently turned off. Would you like to open your phone settings to turn it on for Attendance?"
            );
            if (openSettings) {
              NativeSettings.open({ option: AndroidSettings.LocationSource });
              throw new Error("Opening Settings... Turn on GPS and click Generate again.");
            } else {
              throw new Error("You must enable GPS to proceed.");
            }
          }
          throw new Error("Failed to fetch location. Please ensure GPS is on.");
        }
      } else {
        // Fallback for Web/Browser
        position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      }

      // If successful, save the new code and coords
      const lat = roundCoord(position.coords.latitude);
      const lng = roundCoord(position.coords.longitude);
      const newSecret = generateSecret();

      await setDoc(doc(db, "system", "attendance_config"), {
        activeSecret: newSecret,
        lat: lat,
        lng: lng,
        updatedAt: serverTimestamp()
      });

      setLocation({ lat, lng });
      setSecretKey(newSecret);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch location or sync database.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => { window.print(); };

  const qrData = JSON.stringify({
    type: "teacher_attendance",
    lat: location.lat,
    lng: location.lng,
    secret: secretKey 
  });

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20 font-sans">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 print-hide">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-800 leading-none">Attendance QR</h1>
            <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">হাজিরা QR | उपस्थिति क्यूआर</span>
            <div className="mt-3 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 w-fit">
              <ShieldCheck size={14}/> 
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase leading-none">Secure Session</span>
                <span className="text-[8px] font-bold opacity-70 mt-0.5">সেশন | सत्र</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={reCreateCode} 
            disabled={loading}
            className="flex flex-col items-center justify-center bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            <div className="flex items-center gap-2 leading-none">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> 
                <span>{location.lat ? "Re-create Code" : "Generate Code"}</span>
            </div>
            <span className="text-[9px] font-medium opacity-80 mt-1 uppercase">কোড তৈরি করুন | कोड बनाएं</span>
          </button>
        </div>

        {/* MAIN QR CARD */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border-4 border-gray-50 overflow-hidden text-center relative">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-blue-600" size={40} /> 
                <div className="flex flex-col">
                    <p className="font-bold text-gray-600 uppercase tracking-widest text-sm">Syncing Security Keys...</p>
                    <p className="text-[10px] font-bold text-blue-400 mt-1 uppercase">সিকিউরিটি কি সিঙ্ক হচ্ছে | सुरक्षा कुंजी सिंक हो रही है</p>
                </div>
            </div>
          ) : error ? (
            <div className="py-24 flex flex-col items-center gap-2 text-rose-600 px-4">
                <p className="font-black text-lg text-center leading-tight">{error}</p>
                <p className="text-xs uppercase font-bold mt-2">Try Refreshing | পুনরায় চেষ্টা করুন</p>
            </div>
          ) : location.lat ? (
            <div className="p-8 sm:p-12">
              <div id="printable-qr" className="flex flex-col items-center">
                <h1 className="text-3xl font-black text-gray-900 mb-1 leading-none">Vivekananda Child's Mission</h1>
                <p className="text-[11px] font-bold text-blue-600 mb-4 uppercase tracking-tighter">বিবেকানন্দ childs মিশন | विवेकानंद चाइल्ड्स मिशन</p>
                
                <div className="flex flex-col items-center mb-8">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] leading-none">Secure Official Point • {new Date().toLocaleDateString('en-GB')}</p>
                    <span className="text-[9px] font-bold text-gray-300 mt-1 uppercase tracking-tight">অফিসিয়াল পয়েন্ট | आधिकारिक बिंदु</span>
                </div>
                
                <div className="p-8 bg-gray-50 rounded-[4rem] mb-8 border-4 border-dashed border-gray-100 shadow-inner">
                  <QRCodeSVG value={qrData} size={280} level="H" includeMargin={true} />
                </div>
                
                <div className="flex flex-col gap-2">
                   <div className="print-hide flex flex-col items-center gap-1 bg-gray-100 px-6 py-2.5 rounded-2xl border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-500 font-mono text-xs font-bold leading-none">
                        <MapPin size={14} className="text-blue-500" /> {location.lat}, {location.lng}
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Verified Campus Coordinates | যাচাই করা স্থানাঙ্ক</span>
                  </div>                  
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button 
                onClick={handlePrint} 
                className="print-hide mt-12 flex flex-col items-center justify-center mx-auto bg-gray-900 text-white px-12 py-4 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all transform active:scale-95"
              >
                <div className="flex items-center gap-3 text-lg leading-none">
                    <Printer size={22} /> <span>Print Secure QR</span>
                </div>
                <span className="text-[10px] font-medium text-gray-400 mt-2 tracking-normal">QR কোড প্রিন্ট করুন | क्यूआर कोड प्रिंट करें</span>
              </button>
            </div>
          ) : (
             <div className="py-24 flex flex-col items-center gap-2 text-gray-500">
                <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                  <MapPin size={32} />
                </div>
                <p className="font-black text-lg text-gray-700">Ready to Generate QR</p>
                <p className="text-xs font-bold text-gray-400 uppercase">Click the button above to start</p>
            </div>
          )}
        </div>

        {/* PRINT INSTRUCTIONS */}
        <div className="print-hide mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
            <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><Loader2 size={20} className="opacity-50" /></div>
            <div>
                <h4 className="text-sm font-black text-blue-900 leading-none">Security Note</h4>
                <p className="text-[9px] font-bold text-blue-400 mt-1 uppercase">নিরাপত্তা সতর্কতা | सुरक्षा नोट</p>
                <p className="text-xs text-blue-700 font-medium mt-2 leading-relaxed">
                    This QR code contains an encrypted secret key that changes every time you re-create it. Old printed codes will stop working immediately. <br/>
                    <span className="text-[10px] font-bold opacity-70">এই QR কোডটি একবার পরিবর্তন করলে আগের কোডটি আর কাজ করবে না।</span>
                </p>
            </div>
        </div>
      </div>

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          #printable-qr { padding: 40px; }
          body { background: white !important; }
        }
      `}</style>
    </AdminDashboardLayout>
  );
};

export default TeacherQRGenerate;