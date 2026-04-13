import React, { useState, useEffect } from 'react';
import { ImageIcon, Video, UploadCloud, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { db, storage } from '../../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

const ManageGallery = () => {
  const [media, setMedia] = useState({ photos: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [mediaType, setMediaType] = useState('photo'); // 'photo' or 'video'

  const MAX_PHOTOS = 25;
  const MAX_VIDEOS = 5;

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'website_gallery'));
      let photos = [];
      let videos = [];
      
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.type === 'photo') photos.push(data);
        else if (data.type === 'video') videos.push(data);
      });

      setMedia({ photos, videos });
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGallery(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    if (mediaType === 'photo' && media.photos.length >= MAX_PHOTOS) {
      return alert(`You have reached the maximum limit of ${MAX_PHOTOS} photos.`);
    }
    if (mediaType === 'video' && media.videos.length >= MAX_VIDEOS) {
      return alert(`You have reached the maximum limit of ${MAX_VIDEOS} videos.`);
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const storageRef = ref(storage, `gallery/${mediaType}s/${Date.now()}.${fileExt}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'website_gallery'), {
        url,
        type: mediaType,
        storagePath: storageRef.fullPath,
        createdAt: serverTimestamp()
      });

      setFile(null);
      fetchGallery(); 
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Are you sure you want to delete this media?")) return;

    try {
      if (item.storagePath) {
        const fileRef = ref(storage, item.storagePath);
        await deleteObject(fileRef);
      }
      await deleteDoc(doc(db, 'website_gallery', item.id));
      fetchGallery(); 
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete media.");
    }
  };

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Upload Section */}
        <div className="lg:col-span-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 h-fit">
          <div className="flex flex-col mb-6">
            <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 leading-none">
                <UploadCloud className="text-blue-500" /> Upload Media
            </h2>
            <span className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-wide">মিডিয়া আপলোড | मीडिया अपलोड</span>
          </div>
          
          <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-800">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-xs font-bold leading-none">Photos (ছবি | फोटो)</span>
                </div>
                <span className="font-black">{media.photos.length}/{MAX_PHOTOS}</span>
              </div>
              <div className="flex justify-between items-center border-t border-blue-200 pt-2">
                <div className="flex flex-col">
                    <span className="text-xs font-bold leading-none">Videos (ভিডিও | वीडियो)</span>
                </div>
                <span className="font-black">{media.videos.length}/{MAX_VIDEOS}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 leading-none">Select Media Type</label>
              <span className="text-[9px] font-bold text-blue-400 ml-1 mb-2 uppercase">মিডিয়ার ধরন | मीडिया प्रकार</span>
              <select 
                value={mediaType} 
                onChange={(e) => setMediaType(e.target.value)}
                className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              >
                <option value="photo">Photograph (ছবি | फोटो)</option>
                <option value="video">Video (ভিডিও | वीडियो)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 leading-none">Choose File</label>
              <span className="text-[9px] font-bold text-blue-400 ml-1 mb-2 uppercase">ফাইল নির্বাচন করুন | फ़ाइल चुनें</span>
              <input 
                type="file" 
                accept={mediaType === 'photo' ? "image/*" : "video/*"}
                onChange={(e) => setFile(e.target.files[0])}
                required
                className="text-xs file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-gray-50 p-2 rounded-xl border border-gray-200"
              />
            </div>

            <button 
              type="submit" 
              disabled={uploading || !file || (mediaType === 'photo' && media.photos.length >= MAX_PHOTOS) || (mediaType === 'video' && media.videos.length >= MAX_VIDEOS)}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:bg-gray-200 disabled:shadow-none flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-sm uppercase leading-none">
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                {uploading ? 'Uploading...' : 'Upload to Gallery'}
              </div>
              <span className="text-[9px] font-medium opacity-80 uppercase">
                {uploading ? 'আপলোড হচ্ছে | अपलोड हो रहा है' : 'গ্যালারিতে যুক্ত করুন | गैलरी में जोड़ें'}
              </span>
            </button>
          </form>
        </div>

        {/* Gallery View Section */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Photos */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 min-h-[300px]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <div className="flex flex-col">
                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
                    <ImageIcon className="text-purple-500" /> Photographs
                    </h3>
                    <span className="text-[10px] font-bold text-purple-400 mt-2 uppercase">ছবিসমূহ | तस्वीरें</span>
                </div>
                <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-3 py-1 rounded-full border border-purple-100">
                    TOTAL (মোট): {media.photos.length}
                </span>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Photos...</span>
                </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {media.photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-2xl overflow-hidden aspect-square border border-gray-100 shadow-sm transition-transform hover:scale-[1.02]">
                    <img src={photo.url} alt="Gallery" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => handleDelete(photo)} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                {media.photos.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                        <p className="text-gray-400 font-bold">No photos uploaded yet.</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase mt-1">কোনো ছবি পাওয়া যায়নি | कोई फोटो नहीं</p>
                    </div>
                )}
              </div>
            )}
          </div>

          {/* Videos */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 min-h-[300px]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <div className="flex flex-col">
                    <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 leading-none">
                    <Video className="text-emerald-500" /> Videos
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-400 mt-2 uppercase">ভিডিওসমূহ | वीडियो</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-100">
                    TOTAL (মোট): {media.videos.length}
                </span>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Videos...</span>
                </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {media.videos.map(video => (
                  <div key={video.id} className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-black shadow-lg">
                    <video src={video.url} controls className="w-full aspect-video object-contain" />
                    <button 
                      onClick={() => handleDelete(video)} 
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                {media.videos.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                        <p className="text-gray-400 font-bold">No videos uploaded yet.</p>
                        <p className="text-[10px] font-bold text-gray-300 uppercase mt-1">কোনো ভিডিও পাওয়া যায়নি | कोई वीडियो नहीं</p>
                    </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default ManageGallery;