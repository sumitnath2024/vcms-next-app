import React, { useState, useEffect } from 'react';
import { 
  Save, Image as ImageIcon, Type, Globe, UploadCloud, Loader2, Trash2
} from 'lucide-react';
import { db, storage } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import AdminDashboardLayout from '../../components/AdminDashboardLayout';

// --- FIELD MAPPINGS FOR ORGANIZED UI ---
const translationCategories = [
  { title: "Hero Section", fields: ['heroBadge', 'heroTitle1', 'heroTitle2', 'heroDesc', 'btnEnquireHero'] },
  { title: "About School Details", fields: ['aboutSchoolTitle', 'aboutSchoolDesc1', 'aboutSchoolDesc2', 'aboutSchoolDesc3'] },
  { 
    title: "About, Vision & Mission", 
    fields: [
      'aboutTitle', 'visionTitle', 'visionDesc', 'visionQuoteText', 'visionQuoteAuthor', 
      'missionTitle', 'missionDesc', 'missionQuoteText', 'missionQuoteAuthor'
    ] 
  },
  { title: "Growing with Us (Features)", fields: ['growTitle', 'growDesc1', 'growDesc2', 'point1', 'point2', 'point3'] },
  { 
    title: "Curriculum / Programs", 
    fields: [
      'progTitle', 'progSub', 
      'progCard1Title', 'progCard1Subtitle', 'progCard1Desc', 
      'progCard2Title', 'progCard2Subtitle', 'progCard2Desc', 
      'progCard3Title', 'progCard3Subtitle', 'progCard3Desc',
      'btnEnquire'
    ] 
  },
  { title: "Founder Section", fields: ['founderTitle', 'founderName', 'founderRole', 'founderQuote', 'founderHistory1', 'founderHistory2'] },
  { title: "Teachers Section", fields: ['teachersTitle', 't1Name', 't1Role', 't1Desc', 't2Name', 't2Role', 't2Desc', 't3Name', 't3Role', 't3Desc'] }
];

const imageFields = [
  { key: 'logo', label: 'Website Logo (1:1 Ratio)' },
  { key: 'heroBg', label: 'Hero Background Image' },
  { key: 'founderImg', label: 'Founder Portrait' },
  { key: 'visionImg', label: 'Vision Section Image' }, 
  { key: 'missionImg', label: 'Mission Section Image' }, 
  { key: 'growImg', label: 'Growing Section Image (Kids)' },
  { key: 'progCard1Img', label: 'Curriculum Card 1 (Nursery)' },
  { key: 'progCard2Img', label: 'Curriculum Card 2 (KG)' },
  { key: 'progCard3Img', label: 'Curriculum Card 3 (Primary)' },
  { key: 't1Img', label: 'Teacher 1 Portrait (1:1 Ratio)' },
  { key: 't2Img', label: 'Teacher 2 Portrait (1:1 Ratio)' },
  { key: 't3Img', label: 'Teacher 3 Portrait (1:1 Ratio)' }
];

const ManageContent = () => {
  const [activeTab, setActiveTab] = useState('translations'); 
  const [activeLang, setActiveLang] = useState('en'); 
  
  const [translations, setTranslations] = useState({ en: {}, bn: {}, hi: {} });
  const [siteImages, setSiteImages] = useState({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        const transDoc = await getDoc(doc(db, 'site_settings', 'translations'));
        const imagesDoc = await getDoc(doc(db, 'site_settings', 'site_images'));

        if (transDoc.exists()) setTranslations(transDoc.data());
        if (imagesDoc.exists()) setSiteImages(imagesDoc.data());
      } catch (error) {
        console.error("Error fetching site content:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);

  const handleTranslationChange = (field, value) => {
    setTranslations(prev => ({
      ...prev,
      [activeLang]: { ...prev[activeLang], [field]: value }
    }));
  };

  const handleImageUpload = async (key, file) => {
    if (!file) return;
    setUploadingImage(key);
    try {
      const fileExt = file.name.split('.').pop();
      const storageRef = ref(storage, `site_assets/${key}_${Date.now()}.${fileExt}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setSiteImages(prev => ({ ...prev, [key]: url }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(null);
    }
  };

  const handleDeleteImage = async (key) => {
    if (!window.confirm("Are you sure you want to remove this image?")) return;

    const imageUrl = siteImages[key];

    try {
      if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      }

      const updatedImages = { ...siteImages };
      delete updatedImages[key];
      setSiteImages(updatedImages);

      await updateDoc(doc(db, 'site_settings', 'site_images'), {
        [key]: deleteField()
      });

    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image.");
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'site_settings', 'translations'), translations, { merge: true });
      await setDoc(doc(db, 'site_settings', 'site_images'), siteImages, { merge: true });
      
      alert("Website content saved successfully!");
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Error saving content.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminDashboardLayout themeColor="blue">
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
        </div>
      </AdminDashboardLayout>
    );
  }

  return (
    <AdminDashboardLayout themeColor="blue">
      <div className="max-w-6xl mx-auto font-sans">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Globe className="text-blue-500" /> Manage Website Content
            </h1>
            <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-wider">
              Update text and images in real-time.
            </p>
          </div>
          <button 
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {isSaving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>

        <div className="flex space-x-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <button onClick={() => setActiveTab('translations')} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'translations' ? 'bg-blue-100 text-blue-800' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Type size={16} /> Translations (Texts)
          </button>
          <button onClick={() => setActiveTab('images')} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'images' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:bg-gray-50'}`}>
            <ImageIcon size={16} /> Static Layout Images
          </button>
        </div>

        {activeTab === 'translations' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex gap-2 mb-8 border-b pb-4 overflow-x-auto">
              {['en', 'bn', 'hi'].map(lang => (
                <button 
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`px-5 py-2 rounded-lg font-bold uppercase text-sm transition whitespace-nowrap ${activeLang === lang ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {lang === 'en' ? 'English' : lang === 'bn' ? 'Bengali (বাংলা)' : 'Hindi (हिंदी)'}
                </button>
              ))}
            </div>

            <div className="space-y-8">
              {translationCategories.map((category, idx) => (
                <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">{category.title}</h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {category.fields.map(field => (
                      <div key={field} className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500">{field}</label>
                        {field.toLowerCase().includes('desc') || field.toLowerCase().includes('quote') ? (
                           <textarea 
                             rows="3"
                             value={translations[activeLang]?.[field] || ''}
                             onChange={(e) => handleTranslationChange(field, e.target.value)}
                             className="p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                             placeholder={`Enter ${field}... (HTML allowed)`}
                           />
                        ) : (
                           <input 
                             type="text"
                             value={translations[activeLang]?.[field] || ''}
                             onChange={(e) => handleTranslationChange(field, e.target.value)}
                             className="p-3 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                             placeholder={`Enter ${field}...`}
                           />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {imageFields.map(field => (
                  <div key={field.key} className="border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center bg-gray-50 hover:shadow-md transition">
                    <h4 className="font-bold text-gray-800 mb-4">{field.label}</h4>
                    
                    <div className="w-full h-40 bg-gray-200 rounded-lg mb-4 overflow-hidden relative border border-gray-300 group">
                      {siteImages[field.key] ? (
                        <>
                          <img src={siteImages[field.key]} alt={field.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => handleDeleteImage(field.key)}
                              className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition transform hover:scale-110 shadow-lg flex items-center gap-2 text-sm font-bold"
                            >
                              <Trash2 size={18} /> Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
                          <ImageIcon size={32} />
                          <span className="text-xs font-bold uppercase">No Image Set</span>
                        </div>
                      )}
                    </div>

                    <label className="w-full bg-blue-100 text-blue-700 py-2.5 rounded-lg font-bold text-sm cursor-pointer hover:bg-blue-200 transition flex items-center justify-center gap-2">
                      {uploadingImage === field.key ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                      {uploadingImage === field.key ? 'Uploading...' : 'Upload New Image'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUpload(field.key, e.target.files[0])}
                      />
                    </label>
                  </div>
                ))}
             </div>
          </div>
        )}

      </div>
    </AdminDashboardLayout>
  );
};

export default ManageContent;