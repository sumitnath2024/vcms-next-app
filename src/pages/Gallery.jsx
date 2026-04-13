import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, PlayCircle, Image as ImageIcon, Video, Loader2, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// --- EXACT ORIGINAL TRANSLATION DICTIONARY PRESERVED ---
const translations = {
  bn: {
    back: "হোম পেজে ফিরে যান",
    title: "মিশনের জীবন",
    desc: "আমাদের খুদে শিক্ষার্থীদের আনন্দময় মুহূর্ত, সৃজনশীল কাজ এবং চমৎকার স্মৃতিগুলি ঘুরে দেখুন।",
    all: "সব মিডিয়া",
    photos: "ছবিসমূহ",
    videos: "ভিডিওসমূহ",
    loading: "স্মৃতি লোড হচ্ছে...",
    noMedia: "এই বিভাগে এখনও কোনো মিডিয়া নেই।"
  },
  en: {
    back: "Back to Home",
    title: "Life at Vivekananda Child's Mission",
    desc: "Explore the joyful moments, creative activities, and wonderful memories of our little learners.",
    all: "All Media",
    photos: "Photos",
    videos: "Videos",
    loading: "Loading Memories...",
    noMedia: "No media available in this category yet."
  },
  hi: {
    back: "होम पर वापस जाएं",
    title: "मिशन में जीवन",
    desc: "हमारे नन्हे शिक्षार्थियों के आनंदमय क्षणों, रचनात्मक गतिविधियों और अद्भुत यादों का अन्वेषण करें।",
    all: "सभी मीडिया",
    photos: "तस्वीरें",
    videos: "वीडियो",
    loading: "यादें लोड हो रही हैं...",
    noMedia: "इस श्रेणी में अभी तक कोई मीडिया उपलब्ध नहीं है।"
  }
};

const Gallery = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'photo', 'video'
  
  // Modal states
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Fetch language from localStorage (defaults to Bengali)
  const lang = localStorage.getItem('vcm_lang') || 'bn';
  const t = translations[lang];

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchFullGallery = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'website_gallery'));
        let items = [];
        snapshot.forEach(doc => {
          items.push({ id: doc.id, ...doc.data() });
        });
        // Sort by newest first
        items.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setMedia(items);
      } catch (error) {
        console.error("Error fetching full gallery:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFullGallery();
  }, []);

  const filteredMedia = media.filter(item => filter === 'all' || item.type === filter);

  // Modal Handlers
  const openModal = (index) => setSelectedIndex(index);
  const closeModal = () => setSelectedIndex(null);
  const nextMedia = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev + 1) % filteredMedia.length);
  };
  const prevMedia = (e) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev - 1 + filteredMedia.length) % filteredMedia.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-yellow-400 selection:text-blue-950 relative overflow-hidden flex flex-col">
      
      {/* Abstract Joyful Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-teal-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
      </div>

      {/* --- STUNNING HEADER SECTION --- */}
      <div className="relative pt-24 pb-32 sm:pt-32 sm:pb-40 flex flex-col items-center justify-center overflow-hidden bg-blue-950 rounded-b-[3rem] sm:rounded-b-[5rem] shadow-2xl z-10">
        
        {/* Floating Back Button */}
        <Link to="/" className="absolute top-6 sm:top-10 left-4 sm:left-8 flex items-center gap-2 bg-white/10 hover:bg-yellow-400 text-white hover:text-blue-950 px-5 py-2.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 backdrop-blur-md z-20 group">
          <ArrowLeft className="h-4 sm:h-5 w-4 sm:w-5 group-hover:-translate-x-1 transition-transform" /> 
          <span className="hidden sm:block">{t.back}</span>
        </Link>

        {/* Abstract Header Shapes */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
           <div className="absolute top-[20%] right-[10%] w-64 h-64 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center mt-8">
           <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-yellow-300 px-6 py-2 rounded-full text-sm font-black tracking-widest uppercase mb-6 shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-700">
              <Sparkles className="w-4 h-4" /> Gallery
            </div>
           <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white mb-6 tracking-tighter drop-shadow-xl">
             {t.title}
           </h1>
           <p className="text-base sm:text-xl text-blue-100 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-md">
             {t.desc}
           </p>
        </div>
      </div>

      {/* --- FLOATING CHUNKY FILTER TABS --- */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-20 -mt-10 sm:-mt-12 w-full">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl p-2 sm:p-3 flex flex-wrap sm:flex-nowrap justify-center gap-2 sm:gap-4 border-4 border-white">
          <button 
            onClick={() => setFilter('all')} 
            className={`flex-1 min-w-[100px] py-3 sm:py-4 rounded-[1.5rem] text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 ${filter === 'all' ? 'bg-yellow-400 text-blue-950 shadow-[0_10px_20px_-10px_rgba(250,204,21,0.5)] scale-105' : 'bg-transparent text-gray-500 hover:bg-white hover:text-blue-950 hover:shadow-md'}`}
          >
            {t.all}
          </button>
          <button 
            onClick={() => setFilter('photo')} 
            className={`flex-1 min-w-[100px] py-3 sm:py-4 rounded-[1.5rem] text-xs sm:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${filter === 'photo' ? 'bg-blue-500 text-white shadow-[0_10px_20px_-10px_rgba(59,130,246,0.5)] scale-105' : 'bg-transparent text-gray-500 hover:bg-white hover:text-blue-950 hover:shadow-md'}`}
          >
            <ImageIcon size={18}/> {t.photos}
          </button>
          <button 
            onClick={() => setFilter('video')} 
            className={`flex-1 min-w-[100px] py-3 sm:py-4 rounded-[1.5rem] text-xs sm:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-300 ${filter === 'video' ? 'bg-teal-500 text-white shadow-[0_10px_20px_-10px_rgba(20,184,166,0.5)] scale-105' : 'bg-transparent text-gray-500 hover:bg-white hover:text-blue-950 hover:shadow-md'}`}
          >
            <Video size={18}/> {t.videos}
          </button>
        </div>
      </div>

      {/* --- GALLERY BENTO GRID --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 flex-grow relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <Sparkles className="animate-pulse text-yellow-400" size={64} />
            <p className="text-blue-950 font-black tracking-widest uppercase animate-bounce">{t.loading}</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-32 text-gray-400 font-black tracking-widest uppercase bg-white border-4 border-dashed border-gray-200 rounded-[3rem] shadow-sm">
            {t.noMedia}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {filteredMedia.map((item, index) => (
              <div 
                key={item.id} 
                onClick={() => openModal(index)}
                className="relative aspect-square rounded-[2.5rem] overflow-hidden cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-500 border-[6px] border-white hover:-translate-y-3 bg-gray-100"
              >
                {item.type === 'video' ? (
					  <>
						{/* Added #t=0.001 to the URL, plus preload, playsinline, and muted */}
						<video 
						  src={`${item.url}#t=0.001`} 
						  preload="metadata" 
						  playsinline 
						  muted 
						  className="w-full h-full object-cover bg-gray-200" 
						/>
						<div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
						  <PlayCircle className="text-white h-10 w-10 shadow-sm rounded-full opacity-90 group-hover:scale-110 transition-transform" />
						</div>
					  </>
					) : (
					  <img src={item.url} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
					)}
                    </div>
            ))}
          </div>
        )}
      </div>

      {/* --- STUNNING LIGHTBOX MODAL --- */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-[100] bg-blue-950/95 backdrop-blur-xl flex flex-col items-center justify-center">
          
          {/* Top Bar */}
          <div className="absolute top-0 w-full p-6 sm:p-8 flex justify-between items-center z-10">
            <span className="bg-white/10 text-white px-4 py-1.5 rounded-full font-black tracking-widest text-sm backdrop-blur-md">
              {selectedIndex + 1} / {filteredMedia.length}
            </span>
            <button onClick={closeModal} className="text-white hover:text-blue-950 bg-white/10 hover:bg-yellow-400 p-3 rounded-full transition-all duration-300 shadow-lg">
              <X size={28} />
            </button>
          </div>

          {/* Main Display */}
          <div className="relative w-full max-w-6xl px-4 sm:px-12 flex items-center justify-center flex-grow outline-none" onClick={closeModal}>
            
            {/* Nav Arrows */}
            <button onClick={prevMedia} className="hidden sm:flex absolute left-4 sm:left-6 p-4 bg-white/10 hover:bg-yellow-400 hover:text-blue-950 text-white rounded-full backdrop-blur-md transition-all duration-300 z-10 shadow-lg">
              <ChevronLeft size={36} />
            </button>
            <button onClick={nextMedia} className="hidden sm:flex absolute right-4 sm:right-6 p-4 bg-white/10 hover:bg-yellow-400 hover:text-blue-950 text-white rounded-full backdrop-blur-md transition-all duration-300 z-10 shadow-lg">
              <ChevronRight size={36} />
            </button>

            {/* Current Media (Heavily Rounded with thick border) */}
            <div className="relative max-h-[70vh] sm:max-h-[75vh] w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
              {filteredMedia[selectedIndex].type === 'video' ? (
                <video src={filteredMedia[selectedIndex].url} controls autoPlay className="max-h-[70vh] sm:max-h-[75vh] max-w-full rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-[6px] sm:border-[8px] border-white/10" />
              ) : (
                <img src={filteredMedia[selectedIndex].url} alt="Expanded view" className="max-h-[70vh] sm:max-h-[75vh] max-w-full object-contain rounded-[2rem] sm:rounded-[3rem] shadow-2xl border-[6px] sm:border-[8px] border-white/10" />
              )}
            </div>
            
            {/* Mobile Nav Arrows (Overlay on image bottom for small screens) */}
            <div className="sm:hidden absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10" onClick={(e) => e.stopPropagation()}>
              <button onClick={prevMedia} className="p-3 bg-blue-950/80 hover:bg-yellow-400 hover:text-blue-950 text-white rounded-full backdrop-blur-md border border-white/20 transition-all">
                <ChevronLeft size={28} />
              </button>
              <button onClick={nextMedia} className="p-3 bg-blue-950/80 hover:bg-yellow-400 hover:text-blue-950 text-white rounded-full backdrop-blur-md border border-white/20 transition-all">
                <ChevronRight size={28} />
              </button>
            </div>
          </div>

          {/* Thumbnail Carousel Footer */}
          <div className="w-full bg-blue-950/50 p-4 sm:p-6 overflow-x-auto flex gap-3 sm:gap-4 items-center justify-start sm:justify-center border-t border-white/10 scrollbar-hide">
            {filteredMedia.map((item, idx) => (
              <div 
                key={`thumb-${idx}`} 
                onClick={() => setSelectedIndex(idx)}
                className={`flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${selectedIndex === idx ? 'border-4 border-yellow-400 scale-110 opacity-100 shadow-[0_0_20px_0_rgba(250,204,21,0.5)]' : 'opacity-40 hover:opacity-100 border-2 border-transparent hover:border-white/50 hover:scale-105'}`}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-blue-900">
                    <video src={item.url} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-blue-950/30 flex items-center justify-center">
                      <PlayCircle size={24} className="text-white drop-shadow-md" fill="currentColor" />
                    </div>
                  </div>
                ) : (
                  <img src={item.url} className="w-full h-full object-cover" alt="thumbnail" />
                )}
              </div>
            ))}
          </div>
          
        </div>
      )}
    </div>
  );
};

export default Gallery;