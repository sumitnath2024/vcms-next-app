import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, PlayCircle, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import TeacherDashboardLayout from '../../components/TeacherDashboardLayout';

const TeacherGallery = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); 
  const [selectedIndex, setSelectedIndex] = useState(null);

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
    <TeacherDashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10 font-sans p-4 lg:p-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="bg-purple-100 p-3 rounded-2xl mb-4 text-purple-600">
            <ImageIcon size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800">School Gallery</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">বিদ্যালয়ের গ্যালারি | स्कूल गैलरी</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-full shadow-sm p-2 flex justify-center max-w-md mx-auto border border-gray-100">
          <button onClick={() => setFilter('all')} className={`flex-1 py-2.5 rounded-full text-sm font-bold transition ${filter === 'all' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>All</button>
          <button onClick={() => setFilter('photo')} className={`flex-1 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition ${filter === 'photo' ? 'bg-blue-100 text-blue-900' : 'text-gray-500 hover:bg-gray-50'}`}><ImageIcon size={16}/> Photos</button>
          <button onClick={() => setFilter('video')} className={`flex-1 py-2.5 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition ${filter === 'video' ? 'bg-emerald-100 text-emerald-900' : 'text-gray-500 hover:bg-gray-50'}`}><Video size={16}/> Videos</button>
        </div>

        {/* Gallery Grid */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-purple-500" size={48} />
              <p className="text-gray-500 font-bold animate-pulse">Loading Memories...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">No media available in this category.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredMedia.map((item, index) => (
                <div 
                  key={item.id} 
                  onClick={() => openModal(index)}
                  className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl transition-all border border-gray-200 bg-gray-100"
                >
                  {item.type === 'video' ? (
					  <>
						{/* Added #t=0.001, preload, playsinline, and muted */}
						<video 
						  src={`${item.url}#t=0.001`} 
						  preload="metadata" 
						  playsinline 
						  muted 
						  className="w-full h-full object-cover bg-gray-200 group-hover:scale-105 transition duration-500" 
						/>
						<div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition">
						  <PlayCircle className="text-white h-12 w-12 shadow-sm rounded-full" />
						</div>
					  </>
					) : (
                    <img src={item.url} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lightbox Modal */}
        {selectedIndex !== null && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center">
            
            <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
              <span className="text-white/50 font-bold text-sm">
                {selectedIndex + 1} / {filteredMedia.length}
              </span>
              <button onClick={closeModal} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
                <X size={24} />
              </button>
            </div>

            <div className="relative w-full max-w-5xl px-12 flex items-center justify-center flex-grow outline-none" onClick={closeModal}>
              <button onClick={prevMedia} className="absolute left-4 p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition z-10">
                <ChevronLeft size={32} />
              </button>
              <button onClick={nextMedia} className="absolute right-4 p-3 bg-white/10 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition z-10">
                <ChevronRight size={32} />
              </button>

              <div className="relative max-h-[70vh] w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
                {filteredMedia[selectedIndex].type === 'video' ? (
                  <video src={filteredMedia[selectedIndex].url} controls autoPlay className="max-h-[70vh] max-w-full rounded-lg shadow-2xl" />
                ) : (
                  <img src={filteredMedia[selectedIndex].url} alt="Expanded view" className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherDashboardLayout>
  );
};

export default TeacherGallery;