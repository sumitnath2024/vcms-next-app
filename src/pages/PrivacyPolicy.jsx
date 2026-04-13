import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText, Bell, Sparkles } from 'lucide-react';

// --- EXACT ORIGINAL TRANSLATION DICTIONARY PRESERVED ---
const translations = {
  bn: {
    back: "হোম পেজে ফিরে যান",
    title: "গোপনীয়তা নীতি",
    subtitle: "বিবেকানন্দ চাইল্ডস মিশন আপনার এবং আপনার সন্তানের তথ্যের সুরক্ষা নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ।",
    introTitle: "ভূমিকা",
    introDesc: "আমরা আমাদের শিক্ষার্থী এবং অভিভাবকদের গোপনীয়তাকে অত্যন্ত গুরুত্ব দিই। এই নীতি ব্যাখ্যা করে আমরা কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং সুরক্ষিত করি।",
    section1Title: "আমরা কী তথ্য সংগ্রহ করি",
    section1Desc: "ভর্তি এবং একাডেমিক পরিচালনার জন্য আমরা নিম্নলিখিত তথ্য সংগ্রহ করতে পারি:",
    point1: "শিক্ষার্থীর নাম, বয়স এবং জন্ম তারিখ।",
    point2: "পিতামাতার যোগাযোগের নম্বর এবং ঠিকানা।",
    point3: "একাডেমিক রেকর্ড এবং উপস্থিতি।",
    section2Title: "তথ্যের ব্যবহার",
    section2Desc: "সংগৃহীত তথ্য শুধুমাত্র স্কুল পরিচালনা, ফলাফল প্রকাশ এবং অভিভাবকদের সাথে যোগাযোগের জন্য ব্যবহৃত হয়।",
    section3Title: "নিরাপত্তা",
    section3Desc: "আমরা আপনার তথ্য সুরক্ষিত রাখতে উন্নত ফায়ারবেস (Firebase) নিরাপত্তা এবং এনক্রিপশন ব্যবহার করি।",
    contactTitle: "যোগাযোগ",
    contactDesc: "গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।"
  },
  en: {
    back: "Back to Home",
    title: "Privacy Policy",
    subtitle: "Vivekananda Child's Mission is committed to protecting your and your child's privacy.",
    introTitle: "Introduction",
    introDesc: "We value the privacy of our students and parents. This policy explains how we collect, use, and protect your information.",
    section1Title: "Information We Collect",
    section1Desc: "For admission and academic management, we may collect:",
    point1: "Student's name, age, and date of birth.",
    point2: "Parent's contact numbers and address.",
    point3: "Academic records and attendance data.",
    section2Title: "How We Use Information",
    section2Desc: "The collected information is used solely for school administration, result publication, and communicating with parents.",
    section3Title: "Data Security",
    section3Desc: "We use advanced Firebase security and encryption to ensure your data remains safe and confidential.",
    contactTitle: "Contact Us",
    contactDesc: "If you have any questions regarding this policy, please contact the school office."
  },
  hi: {
    back: "होम पर वापस जाएं",
    title: "गोपनीयता नीति",
    subtitle: "विवेकानंद चाइल्ड्स मिशन आपकी और आपके बच्चे की गोपनीयता की रक्षा के लिए प्रतिबद्ध है।",
    introTitle: "प्रस्तावना",
    introDesc: "हम अपने छात्रों और अभिभावकों की गोपनीयता को महत्व देते हैं। यह नीति बताती है कि हम आपकी जानकारी कैसे एकत्र, उपयोग और सुरक्षित करते हैं।",
    section1Title: "जानकारी जो हम एकत्र करते हैं",
    section1Desc: "प्रवेश और शैक्षणिक प्रबंधन के लिए, हम एकत्र कर सकते हैं:",
    point1: "छात्र का नाम, आयु और जन्म तिथि।",
    point2: "माता-पिता का संपर्क नंबर और पता।",
    point3: "शैक्षणिक रिकॉर्ड और उपस्थिति डेटा।",
    section2Title: "जानकारी का उपयोग",
    section2Desc: "एकत्र की गई जानकारी का उपयोग केवल स्कूल प्रशासन, परिणाम प्रकाशन और अभिभावकों के साथ संवाद करने के लिए किया जाता है।",
    section3Title: "डेटा सुरक्षा",
    section3Desc: "हम आपकी जानकारी सुरक्षित रखने के लिए उन्नत फायरबेस सुरक्षा और एन्क्रिप्शन का उपयोग करते हैं।",
    contactTitle: "संपर्क करें",
    contactDesc: "यदि इस नीति के संबंध में आपके कोई प्रश्न हैं, तो कृपया स्कूल कार्यालय से संपर्क करें।"
  }
};

const PrivacyPolicy = () => {
  const lang = localStorage.getItem('vcm_lang') || 'en';
  const t = translations[lang];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
           <div className="inline-flex items-center justify-center bg-yellow-400/20 p-5 rounded-full mb-8 border border-yellow-400/30 shadow-[0_0_30px_0_rgba(250,204,21,0.3)]">
             <ShieldCheck size={56} className="text-yellow-400 drop-shadow-lg" />
           </div>
           <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white mb-6 tracking-tighter drop-shadow-xl uppercase">
             {t.title}
           </h1>
           <p className="text-base sm:text-xl text-blue-100 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-md">
             {t.subtitle}
           </p>
        </div>
      </div>

      {/* --- CONTENT BENTO GRID --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-20 w-full flex-grow">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Introduction Card (Blue Theme - Full Width) */}
          <div className="md:col-span-2 bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <FileText className="absolute -right-10 -top-10 w-64 h-64 text-blue-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-5 mb-8 border-b-2 border-slate-100 pb-6">
              <div className="bg-blue-500 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <FileText className="h-8 w-8" />
              </div>
              <h2 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">{t.introTitle}</h2>
            </div>
            
            <p className="relative z-10 text-gray-600 text-lg sm:text-xl font-bold leading-relaxed">{t.introDesc}</p>
          </div>

          {/* Data Collection Card (Rose Theme - Full Width) */}
          <div className="md:col-span-2 bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <Eye className="absolute -right-10 -top-10 w-64 h-64 text-rose-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-5 mb-8 border-b-2 border-slate-100 pb-6">
              <div className="bg-rose-500 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                <Eye className="h-8 w-8" />
              </div>
              <h2 className="font-black text-blue-950 text-2xl sm:text-3xl tracking-tighter uppercase">{t.section1Title}</h2>
            </div>
            
            <div className="relative z-10">
              <p className="text-gray-600 text-lg sm:text-xl font-bold mb-8">{t.section1Desc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-white p-2 rounded-full shadow-sm"><Sparkles className="text-rose-500 w-5 h-5 shrink-0"/></div>
                  <span className="text-blue-950 font-bold">{t.point1}</span>
                </div>
                <div className="flex items-center gap-4 bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-white p-2 rounded-full shadow-sm"><Sparkles className="text-rose-500 w-5 h-5 shrink-0"/></div>
                  <span className="text-blue-950 font-bold">{t.point2}</span>
                </div>
                <div className="flex items-center gap-4 bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="bg-white p-2 rounded-full shadow-sm"><Sparkles className="text-rose-500 w-5 h-5 shrink-0"/></div>
                  <span className="text-blue-950 font-bold">{t.point3}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Card (Yellow Theme - Half Width) */}
          <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <Bell className="absolute -right-10 -top-10 w-48 h-48 text-yellow-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-4 mb-6 border-b-2 border-slate-100 pb-6">
              <div className="bg-yellow-400 p-4 rounded-[1.5rem] shadow-lg text-blue-950 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <Bell className="h-8 w-8" />
              </div>
              <h2 className="font-black text-blue-950 text-2xl tracking-tighter uppercase">{t.section2Title}</h2>
            </div>
            
            <p className="relative z-10 text-gray-600 text-lg font-bold leading-relaxed">{t.section2Desc}</p>
          </div>

          {/* Security Card (Teal Theme - Half Width) */}
          <div className="bg-white p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden">
            <Lock className="absolute -right-10 -top-10 w-48 h-48 text-teal-50 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-all duration-700 pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-4 mb-6 border-b-2 border-slate-100 pb-6">
              <div className="bg-teal-500 p-4 rounded-[1.5rem] shadow-lg text-white group-hover:scale-110 group-hover:-rotate-6 transition-transform">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="font-black text-blue-950 text-2xl tracking-tighter uppercase">{t.section3Title}</h2>
            </div>
            
            <p className="relative z-10 text-gray-600 text-lg font-bold leading-relaxed">{t.section3Desc}</p>
          </div>

          {/* Contact Box (Yellow/Blue Theme - Full Width) */}
          <div className="md:col-span-2 bg-yellow-400 p-8 sm:p-12 rounded-[3rem] shadow-xl border-[6px] border-white/60 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 text-center overflow-hidden mt-4">
             <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[200%] bg-yellow-300/50 rounded-full blur-3xl pointer-events-none"></div>
             <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl font-black text-blue-950 mb-4 tracking-tighter uppercase">{t.contactTitle}</h3>
              <p className="text-blue-900 text-lg sm:text-xl font-bold">{t.contactDesc}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;