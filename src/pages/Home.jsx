import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Target, Eye, Heart, Star, PlayCircle, Clock, Book, Globe,
  Facebook, Instagram, Mail, ArrowDown, Send, Quote,
  ChevronLeft, ChevronRight, MapPin, Phone, Menu, X, Loader2, Building, BookOpen, Info, Sparkles
} from 'lucide-react';

import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import defaultVivekanandaImg from '../assets/Vivekananda.jpeg'; 
import { Helmet } from 'react-helmet-async';

// --- EXACT ORIGINAL TRANSLATION DICTIONARY PRESERVED ---
const fallbackTranslations = {
  bn: {
    subtitle: "একটি আদর্শ কে.জি. ও নার্সারি স্কুল", navHome: "হোম", navAbout: "আমাদের সম্পর্কে", navPrograms: "শিক্ষাক্রম", navGallery: "গ্যালারি", navAdmission: "আবেদন করুন",
    heroBadge: "{year} শিক্ষাবর্ষের জন্য ভর্তি চলছে", heroTitle1: "সংস্কৃতিতে প্রোথিত,", heroTitle2: "আনন্দে বিকশিত।",
    heroDesc: "বজবজের প্রাণকেন্দ্রে একটি যত্নশীল, মূল্যবোধ-ভিত্তিক মাতৃভাষা মাধ্যম শিক্ষা প্রদান। আমরা আপনার সন্তানের শিক্ষাগত ভিত্তি, চরিত্র গঠন এবং সার্বিক বিকাশের উপর জোর দিই। আমাদের লক্ষ্য হল প্রতিটি শিশুকে তার নিজস্ব ক্ষমতায় বিকশিত হতে সাহায্য করা।",
    btnEnquireHero: "ভর্তি সম্পর্কে জানুন", 
    aboutSchoolTitle: "বিবেকের আলোয় পথচলা",
    aboutSchoolDesc1: "১৯৯৬ সালে প্রতিষ্ঠিত, <strong>বিবেকানন্দ চাইল্ডস মিশন</strong> হলো দক্ষিণ ২৪ পরগনার বজবজ পৌরসভার একটি বেসরকারি শিক্ষা প্রতিষ্ঠান। এটি শিশুদের প্রাথমিক স্তরের শিক্ষা প্রদানে নিবেদিত এবং আধুনিক সুযোগ-সুবিধা সম্পন্ন একটি আদর্শ বিদ্যাপীঠ।",
    aboutSchoolDesc2: "<strong>শিক্ষাগত কাঠামো:</strong> আমাদের এখানে প্রাক-প্রাথমিক বিভাগের পাশাপাশি ১ম থেকে ৪র্থ শ্রেণী পর্যন্ত পড়ানো হয়। শিক্ষার মাধ্যম মূলত বাংলা, তবে ইংরেজি ও হিন্দির উপর বিশেষ গুরুত্ব প্রদান করা হয় যাতে শিশুরা ভবিষ্যৎ প্রতিযোগিতায় এগিয়ে থাকে।",
    aboutSchoolDesc3: "<strong>অবকাঠামো:</strong> নিরাপদ পানীয় জল এবং ছাত্র ও ছাত্রীদের জন্য আলাদা শৌচাগারের ব্যবস্থা রয়েছে। স্কুলটি একটি নিজস্ব ভবনে পরিচালিত হয়।",
    aboutTitle: "আমাদের পথপ্রদর্শক আলো", visionTitle: "আমাদের রূপকল্প (Vision)",
    visionDesc: "<strong>স্বামী বিবেকানন্দ</strong> বলতেন যে শিক্ষাই হলো সমস্ত সামাজিক ব্যাধির মহৌষধ। তবে শিক্ষা বলতে তিনি কেবল তথ্য বা সংবাদ সংগ্রহ করাকে বোঝাতেন না। তিনি বলতেন, ‘আমাদের এমন ভাবের আত্তীকরণ প্রয়োজন যা জীবন-গঠনকারী, মানুষ-তৈরি এবং চরিত্র-গঠনকারী,’ শিক্ষার এই আদর্শকেই আমরা বিবেকানন্দ চাইল্ডস মিশনে বাস্তবায়িত করার চেষ্টা করি।",
    visionQuoteText: "“উঠো, জাগো এবং লক্ষ্যে না পৌঁছানো পর্যন্ত থেমো না।”", visionQuoteAuthor: "— <strong>স্বামী বিবেকানন্দ</strong>",
    missionTitle: "আমাদের লক্ষ্য (Mission)", missionDesc: "বিবেকানন্দ চাইল্ডস মিশনে, আমরা স্বামী বিবেকানন্দের ‘মানুষ গড়ার ও চরিত্র গঠনের’ শিক্ষার আদর্শে নিবেদিত। বজবজের প্রাণকেন্দ্রে অবস্থিত আমাদের স্কুল এমন একটি স্নেহশীল ও মাতৃতুল্য পরিবেশ প্রদান করে যেখানে প্রতিটি শিশু নিরাপদে শিখতে ও বেড়ে উঠতে পারে। আপনার সন্তানের ভবিষ্যতের সুদৃঢ় ভিত্তি তৈরি করতে আমরা আধুনিক প্রোজেক্ট-ভিত্তিক শিক্ষার সাথে আমাদের সমৃদ্ধ সাংস্কৃতিক ঐতিহ্যের মেলবন্ধন ঘটাই।",
    missionQuoteText: "“মানুষের অন্তর্নিহিত পূর্ণতার প্রকাশই হলো শিক্ষা।”", missionQuoteAuthor: "— <strong>স্বামী বিবেকানন্দ</strong>",
    growTitle: "বজবজের সাথে বিকশিত", growDesc1: "উচ্চ মানের প্রাক-প্রাথমিক শিক্ষা প্রদানের লক্ষ্য নিয়ে আমাদের যাত্রা শুরু। বজবজের প্রাণবন্ত পরিবেশে অবস্থিত, এই বিদ্যাপীঠ তার নিজস্ব স্বকীয়তায় উজ্জ্বল।",
    growDesc2: "আমরা একটি শিশুর জীবনের প্রাথমিক বছরগুলির গুরুত্ব বুঝি। আমরা নিশ্চিত করি যে আমাদের শিক্ষার্থীরা দ্রুত মৌলিক ধারণাগুলি বুঝতে পারে এবং আত্মবিশ্বাসের সাথে নিজেদের প্রকাশ করতে পারে।",
    point1: "যত্নশীল, মাতৃতুল্য শিক্ষক-শিক্ষিকা", point2: "সুদৃঢ় শিক্ষাগত ভিত্তি", point3: "মূল্যবোধ-ভিত্তিক গল্পবলা ও ছড়া",
    progTitle: "আমাদের পাঠ্যক্রম", 
    progSub: "নার্সারি থেকে চতুর্থ শ্রেণী পর্যন্ত একটি সুসংগঠিত এবং আনন্দময় শিক্ষামূলক যাত্রা।",
    progCard1Title: "নার্সারি", progCard1Subtitle: "৩ - ৪ বছর", progCard1Desc: "খেলার ছলে শেখার সূচনা। রঙ, আকার ও চারপাশ চেনার পাশাপাশি ইংরেজি শব্দ এবং যোগাযোগের প্রাথমিক ধারণা দেওয়া হয়। একটি নিরাপদ ও মাতৃতুল্য পরিবেশে আনন্দদায়ক খেলাধুলার মাধ্যমে শিশুদের মানসিক বিকাশ ঘটানো হয়।",
    progCard2Title: "কে.জি. (K.G.)", progCard2Subtitle: "৪ - ৬ বছর", progCard2Desc: "প্রথম শ্রেণীর জন্য প্রস্তুত করা। আমরা পড়া ও লেখার শক্তিশালী ভিত্তি তৈরি করি। উন্নত পাঠদানের মাধ্যমে শিশুদের তৈরি করা হয় যাতে তারা পরবর্তী স্তরে সহজেই মানিয়ে নিতে পারে।",
    progCard3Title: "প্রাথমিক (১ম - ৪র্থ শ্রেণী)", progCard3Subtitle: "৬ - ১০ বছর", progCard3Desc: "পর্ষদের সিলেবাস অনুযায়ী বিশেষ পাঠদান এবং কম্পিউটার শিক্ষা। চরিত্র গঠন এবং একাডেমিক উৎকর্ষে গুরুত্ব দিয়ে আমরা ভবিষ্যৎ প্রজন্মকে শিক্ষিত ও সচেতন নাগরিক হিসেবে গড়ে তুলি।",
    btnEnquire: "আরও জানুন", galleryTitle: "মিশনের জীবন", gal1: "বার্ষিক অনুষ্ঠান", gal2: "অঙ্কন ক্লাস",
    ctaTitle: "আপনার সন্তানের উজ্জ্বল ভবিষ্যতের সূচনা", ctaDesc: "ভর্তি প্রক্রিয়া এখন অনলাইনে। নিচের বোতামে ক্লিক করে ফর্মটি পূরণ করুন।",
    ctaBtn: "অনলাইন ভর্তি ফর্ম", enqTitle: "অনুসন্ধান করুন", enqDesc: "আপনার সন্তানের ভর্তির বিষয়ে কোন প্রশ্ন থাকলে আমাদের জানান। আমাদের প্রতিনিধি আপনার সাথে শীঘ্রই যোগাযোগ করবেন।",
    enqName: "পিতামাতার নাম", enqPhone: "ফোন নম্বর", enqChildAge: "সন্তানের বয়স", enqMessage: "আপনার বার্তা", enqSubmit: "জমা দিন",
    footerLogin: "লগইন", footerTop: "উপরে ফিরে যান ↑", rights: "সর্বস্বত্ব সংরক্ষিত।",
    teachersTitle: "আমাদের শিক্ষকমণ্ডলী",
    t1Name: "অদিতি বোস", t1Role: "প্রধান শিক্ষিকা", t1Desc: "১৫ বছরের অভিজ্ঞতা সম্পন্ন। শিশুদের সার্বিক বিকাশে নিবেদিতপ্রাণ এবং দক্ষ নেত্রী হিসেবে পরিচিত।",
    t2Name: "স্নেহা দাস", t2Role: "নার্সারি শিক্ষিকা", t2Desc: "খেলার ছলে শেখানোয় পারদর্শী। শিশুদের সাথে নিবিড় ভাবে মিশে তাদের প্রাথমিক পাঠ দেন।",
    t3Name: "রাহুল সেন", t3Role: "আর্ট শিক্ষক", t3Desc: "সৃজনশীলতা বিকাশে সাহায্য করেন। রং এবং তুলির মাধ্যমে শিশুদের কল্পনা শক্তিকে বাস্তব রূপ দেন।",
    founderTitle: "দূরदर्शी প্রতিষ্ঠাতা", founderName: "শ্রী [প্রতিষ্ঠাতার নাম]", founderRole: "প্রতিষ্ঠাতা",
    founderQuote: "“প্রকৃত শিক্ষা হলো একটি শিশুর চরিত্র ও অন্তরাত্মার সঠিক বিকাশ সাধন। এটি কেবল তথ্য দেওয়া নয় বরং শিশুর সুপ্ত প্রতিভাকে জাগ্রত করা।”",
    btnViewGallery: "সম্পূর্ণ গ্যালারি দেখুন",
    founderHistory1: "শিশুদের প্রতি গভীর ভালোবাসা নিয়ে এই মিশনটি প্রতিষ্ঠিত হয়েছিল। মানসম্মত প্রাক-প্রাথমিক শিক্ষা প্রদানের দৃষ্টিভঙ্গি নিয়ে আমাদের যাত্রা শুরু যা আজও অব্যাহত।",
    founderHistory2: "স্বামী বিবেকানন্দের আদর্শে অনুপ্রাণিত হয়ে এই প্রতিষ্ঠান পথ চলছে। আমরা বিশ্বাস করি প্রতিটি শিশুই অনন্য এবং তাদের পূর্ণ বিকাশের জন্য একটি স্নেহশীল পরিবেশ প্রয়োজন।"
  },
  en: {
    subtitle: "An Ideal K.G. & Nursery School", navHome: "Home", navAbout: "About Us", navPrograms: "Curriculum", navGallery: "Gallery", navAdmission: "Apply Now",
    heroBadge: "Admissions Open for {year} 🎉", heroTitle1: "Rooted in Culture,", heroTitle2: "Blooming in Joy.",
    heroDesc: "Providing a caring, value-based education in the heart of Budge Budge. We emphasize your child's educational foundation, character building, and holistic development to ensure they succeed in life.",
    btnEnquireHero: "Enquire About Admission", 
    aboutSchoolTitle: "The Legacy of Excellence",
    aboutSchoolDesc1: "Established in 1996, <strong>Vivekananda Child's Mission</strong> is a premier private institution located in Budge Budge, South 24 Parganas, West Bengal. It is dedicated to providing high-quality foundational education to young learners.",
    aboutSchoolDesc2: "<strong>Academic Structure:</strong> We offer comprehensive schooling from Pre-Primary through Class IV with a focus on holistic growth. The medium of instruction is Bengali/Hindi.",
    aboutSchoolDesc3: "<strong>Infrastructure & Facilities:</strong> Featuring safe drinking water, separate restrooms, and child-friendly vibrant learning environments designed to foster a love for learning.",
    aboutTitle: "Our Guiding Light", visionTitle: "Our Vision",
    visionDesc: "<strong>Swami Vivekananda</strong> used to say that education is the panacea of all social evils. He said, 'We must have life–building, man–making assimilation of ideas,' and added, 'What we want is that education by which character is formed and by which one can stand on one's feet.'",
    visionQuoteText: "“Arise, awake and stop not until the goal is reached.”", visionQuoteAuthor: "— <strong>Swami Vivekananda</strong>",
    missionTitle: "Our Mission", missionDesc: "At Vivekananda Child's Mission, we are dedicated to Swami Vivekananda's ideal of 'man-making' education. We blend our rich cultural heritage with modern learning to build a strong foundation.",
    missionQuoteText: "“Education is the manifestation of the perfection already in man.”", missionQuoteAuthor: "— <strong>Swami Vivekananda</strong>",
    growTitle: "Growing with Budge Budge", growDesc1: "Founded with a clear goal: to provide high-quality pre-primary education. Located in the vibrant environment of Budge Budge, this school is a landmark of excellence.",
    growDesc2: "We understand the importance of early years. We ensure that our students grasp basic concepts quickly and express themselves with joy and confidence.",
    point1: "Caring, motherly teachers", point2: "Strong educational foundation", point3: "Value-based storytelling",
    progTitle: "Our Joyful Curriculum", progSub: "A well-structured, colourful educational journey from Nursery up to Class IV.",
    progCard1Title: "Nursery", progCard1Subtitle: "Age 3 - 4 Years", progCard1Desc: "The beautiful beginning of playful learning. We focus on Special Identification (colors, shapes, surroundings), early English sounds, foundational communication classes, and physical play.",
    progCard2Title: "LKG & UKG", progCard2Subtitle: "Age 4 - 6 Years", progCard2Desc: "Building an unshakeable foundation. We heavily emphasize English development, daily conversation practice, and early General Knowledge through interactive smart classes.",
    progCard3Title: "Primary (Class I - IV)", progCard3Subtitle: "Age 6 - 10 Years", progCard3Desc: "Where academic excellence meets holistic growth. We focus on advanced communication, comprehensive General Knowledge, and the board syllabus with modern technology.",
    btnEnquire: "Know More", galleryTitle: "Life at Mission", gal1: "Cultural Event", gal2: "Art Class",
    ctaTitle: "Start Your Child's Journey Today", ctaDesc: "Our admission process is online. Join our vibrant family today and give your child the foundation they deserve.",
    ctaBtn: "Online Admission Form", enqTitle: "Admission Enquiry", enqDesc: "Have questions? Drop us a message below and we'll get back to you with a smile! We are here to help you every step of the way.",
    enqName: "Parent's Name", enqPhone: "Phone Number", enqChildAge: "Child's Age", enqMessage: "Your Message", enqSubmit: "Send Enquiry",
    footerLogin: "Login", footerTop: "Back to Top ↑", rights: "All rights reserved.",
    teachersTitle: "Our Dedicated Educators",
    t1Name: "Aditi Bose", t1Role: "Headmistress", t1Desc: "15+ years of pedagogical experience. Dedicated to the holistic development of our children and a skilled leader in the field.",
    t2Name: "Sneha Das", t2Role: "Nursery Teacher", t2Desc: "Expert in play-way teaching methods. Known for her motherly care and ability to connect with young learners on a personal level.",
    t3Name: "Rahul Sen", t3Role: "Art Teacher", t3Desc: "Fostering creativity in young minds. Helps children express themselves through colors and brushes, nurturing their artistic potential.",
    founderTitle: "A Visionary Leader", founderName: "Sri [Founder's Name]", founderRole: "Founder",
    founderQuote: "“True education is the gentle awakening of a child's soul. It is born not from textbooks, but from boundless love and belief.”",
    btnViewGallery: "View Full Gallery",
    founderHistory1: "Driven by a profound love for children and a vision for quality early education. Our founder established this mission to provide a strong foundation.",
    founderHistory2: "His unwavering dedication laid the strong foundation of this institution, inspired by Swami Vivekananda's ideals."
  },
  hi: {
    subtitle: "एक आदर्श के.जी. और नर्सरी स्कूल", navHome: "होम", navAbout: "हमारे बारे में", navPrograms: "पाठ्यक्रम", navGallery: "গ্যালারি", navAdmission: "अभी आवेदन करें",
    heroBadge: "सत्र {year} के लिए प्रवेश प्रारंभ 🎉", heroTitle1: "संस्कृति में निहित,", heroTitle2: "खुशी से खिले।",
    heroDesc: "बजबज के केंद्र में एक देखभाल पूर्ण, मूल्य-आधारित शिक्षा। हम आपके बच्चे की शैक्षिक नींव और चरित्र निर्माण पर जोर देते हैं ताकि वे जीवन में सफल हों।",
    btnEnquireHero: "प्रवेश पूछताछ", 
    aboutSchoolTitle: "शिक्षा की विरासत",
    aboutSchoolDesc1: "1996 में स्थापित, <strong>विवेकानंद चाइल्ड्स मिशन</strong> बजबज में स्थित एक प्रमुख शिक्षण संस्थान है। यह बच्चों को उच्च गुणवत्ता वाली बुनियादी शिक्षा प्रदान करने के लिए समर्पित है।",
    aboutSchoolDesc2: "<strong>शैक्षणिक संरचना:</strong> हम पूर्व-प्राथमिक से कक्षा 4 तक समग्र शिक्षा प्रदान करते हैं। शिक्षा का माध्यम बंगाली/हिंदी है और सत्र अप्रैल में शुरू होता है।",
    aboutSchoolDesc3: "<strong>सुविधाएं:</strong> सुरक्षित पेयजल, अलग शौचालय और बच्चों के अनुकूल वातावरण। हमारा परिसर बच्चों के लिए सुलभ और सीखने के प्रति प्रेम जगाने के लिए बनाया गया है।",
    aboutTitle: "हमारा मार्गदर्शक प्रकाश", visionTitle: "हमारा दृष्टिकोण",
    visionDesc: "<strong>स्वामी विवेकानंद</strong> से प्रेरित, हम मानते हैं कि शिक्षा चरित्र निर्माण और आत्मनिर्भरता का साधन है। हम ऐसी शिक्षा चाहते हैं जिससे चरित्र का निर्माण हो और व्यक्ति अपने पैरों पर खड़ा हो सके।",
    visionQuoteText: "“उठो, जागो और तब तक मत रुको जब तक लक्ष्य प्राप्त न हो जाए।”", visionQuoteAuthor: "— <strong>स्वामी विवेकानंद</strong>",
    missionTitle: "हमारा लक्ष्य", missionDesc: "एक ऐसा वातावरण प्रदान करना जहाँ बच्चे आधुनिक शिक्षा के साथ अपनी संस्कृति को भी सीखें। हमारा मिशन उनकी अद्वितीय प्रतिभाओं को निखारना और आत्मविश्वासी व्यक्तियों का निर्माण करना है।",
    growTitle: "बजबज के साथ विकास", growDesc1: "उच्च गुणवत्ता वाली पूर्व-प्राथमिक शिक्षा प्रदान करने के स्पष्ट लक्ष्य के साथ स्थापित। बजबज के जीवंत वातावरण में यह मिशन एक विशिष्ट पहचान रखता है।",
    growDesc2: "हम बचपन के शुरुआती वर्षों के महत्व को समझते हैं। हम सुनिश्चित करते हैं कि हमारे छात्र बुनियादी अवधारणाओं को जल्दी समझें और आत्मविश्वास के साथ खुद को व्यक्त करें।",
    point1: "देखभाल करने वाले शिक्षक", point2: "मजबूत शैक्षिक नींव", point3: "मूल्य-आधारित शिक्षा",
    progTitle: "हमारा पाठ्यक्रम", progSub: "नर्सरी से कक्षा IV तक एक संरचित और आनंदमय शैक्षिक यात्रा।",
    progCard1Title: "नर्सरी", progCard1Subtitle: "उम्र ३ - ৪ वर्ष", progCard1Desc: "खेल-खेल में सीखने की शुरुआत। रंग, आकार और परिवेश की पहचान के साथ-साथ बुनियादी अंग्रेजी शब्दों का ज्ञान दिया जाता है। मनोरंजक गतिविधियों के माध्यम से बच्चों का विकास किया जाता है।",
    progCard2Title: "एल.के.जी और यू.के.जी", progCard2Subtitle: "उम्र ৪ - ৬ वर्ष", progCard2Desc: "भविष्य की मजबूत नींव रखने का समय। इस स्तर पर स्पोकन इंग्लिश, दैनिक बातचीत और सामान्य ज्ञान पर जोर दिया जाता है। स्मार्ट क्लासेज बच्चों को चपल और जिज्ञासु बनाया जाता है।",
    progCard3Title: "प्राथमिक (कक्षा १ - ৪)", progCard3Subtitle: "उम्र ৬ - १० वर्ष", progCard3Desc: "बोर्ड के पाठ्यक्रम के साथ आधुनिक शिक्षा का बेहतरीन संगम। धाराप्रवाह अंग्रेजी बोलना, विषयों का गहरा ज्ञान और स्मार्ट क्लासेज के माध्यम से पढ़ाई को रोचक बनाया जाता है।",
    btnEnquire: "अधिक जानें", galleryTitle: "मिशन में जीवन", gal1: "सांस्कृतिक कार्यक्रम", gal2: "कला कक्षा",
    ctaTitle: "बच्चे के भविष्य की पहली सीढ़ी", ctaDesc: "हमारी प्रवेश प्रक्रिया अब ऑनलाइन है। आज ही हमसे जुड़ें और फॉर्म भरें ताकि आपके बच्चे को एक मजबूत नींव मिल सके।",
    ctaBtn: "प्रवेश फॉर्म भरें", enqTitle: "प्रवेश पूछताछ", enqDesc: "कोई प्रश्न है? फॉर्म भरें और हम आपसे संपर्क करेंगे। हम मुस्कान के साथ आपकी मदद करेंगे।",
    enqName: "माता-पिता का नाम", enqPhone: "फ़ोन नंबर", enqChildAge: "बच्चे की उम्र", enqMessage: "आपका संदेश", enqSubmit: "जमा करें",
    footerLogin: "लॉगिन", footerTop: "शीर्ष पर वापस जाएं ↑", rights: "सर्वाधिकार सुरक्षित।",
    teachersTitle: "हमारे समर्पित शिक्षक",
    t1Name: "अदिति बोस", t1Role: "प्रधानाध्यापिका", t1Desc: "15+ वर्षों का शैक्षणिक अनुभव। बच्चों के समग्र विकास के लिए पूरी तरह समर्पित और शिक्षा के क्षेत्र में एक कुशल नेता।",
    t2Name: "स्नेहा दास", t2Role: "नर्सरी शिक्षिका", t2Desc: "खेल-खेल में सिखाने में माहिर। अपनी मातृवत देखभाल और युवा शिक्षार्थियों के साथ जुड़ने की क्षमता के लिए जानी जाती हैं।",
    t3Name: "राहुल सेन", t3Role: "कला शिक्षक", t3Desc: "रचनात्मकता को बढ़ावा देते हैं। कला के माध्यम से बच्चों को अपनी कल्पना शक्ति को व्यक्त करने में मदद करते हैं।",
    founderTitle: "एक दूरदर्शी मार्गदर्शक", founderName: "श्री [नाम]", founderRole: "संस्थापक",
    founderQuote: "“सच्ची शिक्षा एक बच्चे के चरित्र और आत्मा का पोषण करना है। यह किताबों तक सीमित नहीं है, बल्कि अपार प्रेम और क्षमता में विश्वास है।”",
    btnViewGallery: "गैलरी देखें",
    founderHistory1: "बच्चों के प्रति प्रेम और बेहतर शिक्षा के दृष्टिकोण से प्रेरित। हमारे संस्थापक ने बच्चों के लिए एक मजबूत नींव प्रदान करने के लिए इस मिशन की स्थापना की।",
    founderHistory2: "स्वामी विवेकानंद के आदर्शों पर आधारित मजबूत नींव। उनका मानना था कि हर बच्चा विशिष्ट है और उसे खिलने के लिए प्यार भरे माहौल की आवश्यकता है।"
  }
};

const Home = () => {
  const [translations, setTranslations] = useState(fallbackTranslations);
  const [siteImages, setSiteImages] = useState({});
  const [contactInfo, setContactInfo] = useState({});
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState(localStorage.getItem('vcm_lang') || 'en'); 
  const t = translations[lang]; 
  
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    localStorage.setItem('vcm_lang', lang);
  }, [lang]);

  // Handle scroll for floating nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [admissionData, setAdmissionData] = useState({ isOpen: false, year: "" });
  const [enquiryForm, setEnquiryForm] = useState({ parentName: '', phone: '', childAge: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [galleryPreview, setGalleryPreview] = useState([]);

  useEffect(() => {
    document.title = "Vivekananda Child's Mission | Best Nursery & Primary School in Budge Budge";
    
    const fetchAllData = async () => {
      try {
        const transDoc = await getDoc(doc(db, 'site_settings', 'translations'));
        if (transDoc.exists()) {
          const dbTrans = transDoc.data();
          const cleanMerge = (fallback, dbData) => {
            const result = { ...fallback };
            if (!dbData) return result;
            for (const key in dbData) {
              if (dbData[key] && dbData[key].toString().trim() !== "") {
                result[key] = dbData[key];
              }
            }
            return result;
          };
          setTranslations({
            en: cleanMerge(fallbackTranslations.en, dbTrans.en),
            bn: cleanMerge(fallbackTranslations.bn, dbTrans.bn),
            hi: cleanMerge(fallbackTranslations.hi, dbTrans.hi)
          });
        }
        const imgDoc = await getDoc(doc(db, 'site_settings', 'site_images'));
        if (imgDoc.exists()) setSiteImages(imgDoc.data());
        const contactDoc = await getDoc(doc(db, 'site_settings', 'contact_info'));
        if (contactDoc.exists()) setContactInfo(contactDoc.data());
        const settingsRef = doc(db, 'admission_status', 'current');
        const admissionSnap = await getDoc(settingsRef);
        if (admissionSnap.exists()) {
          setAdmissionData({ isOpen: admissionSnap.data().isOpen || false, year: admissionSnap.data().sessionYear || "" });
        }
        const snapshot = await getDocs(collection(db, 'website_gallery'));
        let mediaItems = [];
        snapshot.forEach(doc => mediaItems.push({ id: doc.id, ...doc.data() }));
        mediaItems.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setGalleryPreview(mediaItems.slice(0, 4));
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchAllData();
  }, []);

  const openModal = (index) => setSelectedIndex(index);
  const closeModal = () => setSelectedIndex(null);
  const nextMedia = (e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev + 1) % galleryPreview.length); };
  const prevMedia = (e) => { e.stopPropagation(); setSelectedIndex((prev) => (prev - 1 + galleryPreview.length) % galleryPreview.length); };
  const closeMenu = () => setIsMobileMenuOpen(false);

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'enquiries'), {
        parentName: enquiryForm.parentName, phone: enquiryForm.phone, childAge: enquiryForm.childAge, message: enquiryForm.message,
        responded: false, date: new Date().toISOString().split('T')[0], createdAt: serverTimestamp() 
      });
      alert("🎉 Enquiry submitted successfully! We will contact you shortly.");
      setEnquiryForm({ parentName: '', phone: '', childAge: '', message: '' });
    } catch (error) {
      console.error("Error submitting enquiry:", error);
      alert("Failed to submit enquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTextWithColon = (text) => {
    if (!text) return null;
    const cleanText = text.replace(/\*\*/g, ''); 
    const parts = cleanText.split(':');
    if (parts.length > 1) {
      return (
        <>
          <strong className="font-black text-blue-950 uppercase tracking-tight">{parts[0]}:</strong>
          <span className="font-medium text-gray-700">{parts.slice(1).join(':')}</span>
        </>
      );
    }
    return cleanText;
  };

  if (isLoadingContent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 text-blue-900">
        <div className="bg-white p-1 rounded-full shrink-0 shadow-lg h-50 w-50 flex items-center justify-center overflow-hidden">
            <img src={siteImages?.logo || "/vcm_logo.jpeg"} alt="VCM Logo" className="h-full w-full object-cover" />
         </div>
        <h2 className="text-2xl font-black tracking-tight uppercase animate-bounce">Vivekananda Child's Mission</h2>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen font-sans antialiased text-slate-900 bg-slate-50 transition-all duration-300 overflow-x-hidden selection:bg-yellow-400 selection:text-blue-950">
      
<Helmet>
        <html lang={lang} />
        {/* --- Standard SEO --- */}
        <title>Best Nursery & Primary School in Budge Budge | Vivekananda Child's Mission</title>
        <meta name="title" content="Best Nursery & Primary School in Budge Budge | Vivekananda Child's Mission" />
        <meta name="description" content="Looking for the best KG school near me? Vivekananda Child's Mission offers value-based education from Nursery to Class 4 in Budge Budge, Kolkata. Admissions open!" />
        <meta name="keywords" content="Best nursery school in Budge Budge, KG school near me, Value-based education Kolkata, primary school Budge Budge, Best school in Kolkata for kids, Nursery to Class 4, Vivekananda Child's Mission" />
        <link rel="canonical" href="https://vivekanandachildsmission.org.in/" />

        {/* --- Open Graph / Facebook / WhatsApp --- */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Vivekananda Child's Mission" />
        <meta property="og:url" content="https://vivekanandachildsmission.org.in/" />
        <meta property="og:title" content="Vivekananda Child's Mission | Best School in Budge Budge" />
        <meta property="og:description" content="An ideal K.G. & Nursery school providing value-based education in the heart of Budge Budge. Admissions Open!" />
        <meta property="og:image" content="https://vivekanandachildsmission.org.in/vcm_logo.jpeg" />

        {/* --- Twitter --- */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vivekanandachildsmission.org.in/" />
        <meta property="twitter:title" content="Vivekananda Child's Mission | Best School in Budge Budge" />
        <meta property="twitter:description" content="An ideal K.G. & Nursery school providing value-based education in the heart of Budge Budge. Admissions Open!" />
        <meta property="twitter:image" content="https://vivekanandachildsmission.org.in/vcm_logo.jpeg" />

        {/* --- Google Structured Data (JSON-LD Schema) --- */}
        <script type="application/ld+json">
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "School",
              "name": "Vivekananda Child's Mission",
              "url": "https://vivekanandachildsmission.org.in/",
              "logo": "https://vivekanandachildsmission.org.in/vcm_logo.jpeg",
              "image": "https://vivekanandachildsmission.org.in/vcm_logo.jpeg",
              "description": "An ideal K.G. & Nursery school providing value-based education from Nursery to Class 4 in Budge Budge, Kolkata.",
              "telephone": "+919230261809",
              "email": "vivekanandachildsmission@gmail.com",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "371/A, M. G. Road",
                "addressLocality": "Budge Budge",
                "addressRegion": "West Bengal",
                "postalCode": "700137",
                "addressCountry": "IN"
              },
              "sameAs": [
                "https://www.facebook.com/your-facebook-page",
                "https://www.instagram.com/your-instagram-page"
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Vivekananda Child's Mission",
              "url": "https://vivekanandachildsmission.org.in/"
            }
          ])}
        </script>
      </Helmet>
      
      {/* --- FLOATING MODERN NAVIGATION --- */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 transition-all duration-500">
        <nav className={`mx-auto max-w-7xl rounded-full transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-2xl py-2 px-4 border border-white/20' : 'bg-transparent py-4'}`}>
          <div className="flex justify-between items-center h-16 sm:h-20 px-2 sm:px-4">
            
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-full shadow-lg shrink-0 overflow-hidden h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center border-4 border-yellow-400 group hover:rotate-12 transition-all duration-500 cursor-pointer">
                <img src={siteImages?.logo || "/vcm_logo.jpeg"} alt="VCM Logo" className="h-full w-full object-cover rounded-full" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className={`text-base sm:text-xl font-black tracking-tighter leading-none uppercase transition-colors duration-500 ${scrolled ? 'text-blue-950' : 'text-white drop-shadow-md'}`}>Vivekananda<br/><span className="text-yellow-400">Child's Mission</span></h1>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className={`hidden lg:flex space-x-1 items-center font-bold text-sm tracking-widest uppercase transition-colors duration-500 ${scrolled ? 'text-blue-950' : 'text-white'}`}>
              <a href="#home" className="hover:bg-yellow-400 hover:text-blue-950 px-4 py-2 rounded-full transition-all duration-300">{t.navHome}</a>
              <a href="#about" className="hover:bg-yellow-400 hover:text-blue-950 px-4 py-2 rounded-full transition-all duration-300">{t.navAbout}</a>
              <a href="#programs" className="hover:bg-yellow-400 hover:text-blue-950 px-4 py-2 rounded-full transition-all duration-300">{t.navPrograms}</a>
              <a href="#gallery" className="hover:bg-yellow-400 hover:text-blue-950 px-4 py-2 rounded-full transition-all duration-300">{t.navGallery}</a>
              
              <div className="flex items-center gap-4 pl-4 border-l border-current opacity-80">
                <div className={`relative flex items-center gap-1 cursor-pointer px-3 py-1.5 rounded-full border transition-all ${scrolled ? 'bg-blue-50 border-blue-200' : 'bg-white/20 border-white/30 backdrop-blur-sm'}`}>
                  <Globe className={`h-4 w-4 ${scrolled ? 'text-blue-600' : 'text-yellow-400'}`} />
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className={`bg-transparent text-sm outline-none cursor-pointer appearance-none pr-2 uppercase font-black tracking-widest ${scrolled ? 'text-blue-950' : 'text-white'}`}>
                    <option value="bn" className="text-blue-950 bg-white">বাংলা</option>
                    <option value="en" className="text-blue-950 bg-white">ENG</option>
                    <option value="hi" className="text-blue-950 bg-white">हिंदी</option>
                  </select>
                </div>
                {admissionData.isOpen && (
                  <Link to="/admission" className="bg-yellow-400 text-blue-950 px-6 py-3 rounded-full font-black uppercase tracking-widest hover:bg-yellow-300 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 whitespace-nowrap shadow-md">
                    {t.navAdmission}
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile Selection & Toggle (ALWAYS VISIBLE IN MOBILE) */}
            <div className="lg:hidden flex items-center gap-2">
               <select value={lang} onChange={(e) => setLang(e.target.value)} className={`border text-[10px] font-black outline-none rounded-full px-2 py-1.5 uppercase cursor-pointer transition-colors shadow-sm ${scrolled ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-white/20 border-white/30 text-white backdrop-blur-sm'}`}>
                  <option value="bn" className="text-blue-950">BN</option><option value="en" className="text-blue-950">EN</option><option value="hi" className="text-blue-950">HI</option>
                </select>
              <div className={`cursor-pointer p-2 rounded-full transition-colors ${scrolled ? 'bg-blue-100 text-blue-950' : 'bg-white/20 text-white backdrop-blur-sm'}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </div>
            </div>
          </div>
        </nav>
        
        {/* Mobile Dropdown Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 px-4 pt-24 pb-10 bg-blue-950/40 backdrop-blur-md overflow-y-auto">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-white flex flex-col gap-4 text-center animate-in slide-in-from-top-10 duration-500">
              <a href="#home" className="hover:bg-yellow-100 text-blue-950 py-4 rounded-full text-xl font-black uppercase tracking-widest transition-all" onClick={closeMenu}>{t.navHome}</a>
              <a href="#about" className="hover:bg-yellow-100 text-blue-950 py-4 rounded-full text-xl font-black uppercase tracking-widest transition-all" onClick={closeMenu}>{t.navAbout}</a>
              <a href="#programs" className="hover:bg-yellow-100 text-blue-950 py-4 rounded-full text-xl font-black uppercase tracking-widest transition-all" onClick={closeMenu}>{t.navPrograms}</a>
              <a href="#gallery" className="hover:bg-yellow-100 text-blue-950 py-4 rounded-full text-xl font-black uppercase tracking-widest transition-all" onClick={closeMenu}>{t.navGallery}</a>
              {admissionData.isOpen && (
                <div className="pt-4 mt-2 border-t border-slate-100">
                  <Link to="/admission" className="block w-full text-center bg-yellow-400 text-blue-950 py-5 rounded-full font-black text-xl uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform shadow-lg" onClick={closeMenu}>{t.navAdmission}</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <main className="flex-grow">
        
        {/* --- HERO SECTION --- */}
        <div id="home" className="relative pt-32 pb-24 sm:pt-48 sm:pb-32 lg:pt-56 lg:pb-40 flex items-center justify-center overflow-hidden bg-blue-950 rounded-b-[3rem] sm:rounded-b-[5rem] shadow-2xl">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
             <img src={siteImages?.heroBg || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop"} alt="Background" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
             <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse"></div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col items-center text-center">
            {admissionData.isOpen && (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-yellow-300 px-6 py-2 rounded-full text-xs sm:text-sm font-black tracking-widest uppercase mb-8 shadow-xl">
                <Sparkles className="w-4 h-4" /> {(t?.heroBadge || fallbackTranslations[lang].heroBadge).replace('{year}', admissionData.year)}
              </div>
            )}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[1.1] tracking-tighter drop-shadow-xl uppercase">
              {t.heroTitle1} <br className="hidden sm:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200">{t.heroTitle2}</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-blue-50 max-w-3xl mb-12 font-medium leading-relaxed px-4 drop-shadow-md text-justify [hyphens:auto]">
              {t.heroDesc}
            </p>
            <div className="w-full sm:w-auto px-4 sm:px-0">
              <a href="#enquiry" className="group flex items-center justify-center gap-3 w-full sm:w-auto bg-yellow-400 text-blue-950 px-10 py-5 rounded-full text-lg font-black uppercase tracking-wider hover:bg-yellow-300 transition-all shadow-[0_0_40px_-10px_rgba(250,204,21,0.5)] hover:-translate-y-1 hover:scale-105 active:scale-95 duration-300">
                {t.btnEnquireHero} <ArrowDown className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* --- FOUNDER SECTION --- */}
        <div className="bg-slate-50 py-24 sm:py-32 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="w-full lg:w-5/12 relative px-4 sm:px-0">
                <div className="absolute top-4 -left-4 w-full h-full bg-yellow-400 rounded-[4rem] transform -rotate-6 z-0"></div>
                <div className="absolute -bottom-4 -right-4 w-full h-full bg-blue-400 rounded-[4rem] transform rotate-6 z-0"></div>
                <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl bg-white border-8 border-white aspect-[4/5] group">
                  <img src={siteImages?.founderImg || "https://images.unsplash.com/photo-1558222218-b7b54eede3f3?q=80&w=1974&auto=format&fit=crop"} alt={t.founderName} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-8 text-white w-full text-center">
                    <h3 className="text-3xl font-black tracking-tight mb-1">{t.founderName}</h3>
                    <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest">{t.founderRole}</p>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-7/12 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-2 w-12 bg-yellow-400 rounded-full"></div>
                  <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{t.founderTitle}</h2>
                </div>
                <div className="relative mb-10 bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 group hover:shadow-2xl transition-shadow duration-500">
                  <Quote className="absolute -top-6 -left-6 h-16 w-16 text-yellow-400 drop-shadow-md transform -scale-x-100 group-hover:-rotate-12 transition-transform" />
                  <blockquote className="relative z-10 text-2xl sm:text-3xl md:text-4xl font-black text-blue-950 leading-[1.3] pt-4 px-4 tracking-tighter text-justify [hyphens:auto]">
                    {t.founderQuote}
                  </blockquote>
                </div>
                <div className="space-y-6 text-gray-600 text-lg sm:text-xl leading-relaxed px-4 font-medium text-justify [hyphens:auto]">
                  <p>{t.founderHistory1}</p>
                  <p>{t.founderHistory2}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- ABOUT OVERVIEW --- */}
        <div id="about" className="bg-white py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-4xl md:text-6xl font-black text-blue-950 mb-6 tracking-tighter uppercase">
                {t.aboutSchoolTitle}
              </h2>
              <div className="w-24 h-2 bg-yellow-400 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-blue-50 p-10 rounded-[3rem] shadow-lg border border-blue-100 hover:shadow-2xl hover:-translate-y-2 hover:bg-blue-100/50 transition-all duration-500 group">
                <div className="bg-blue-500 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-md">
                  <Info className="h-8 w-8 text-white" />
                </div>
                <p className="text-blue-900/80 leading-relaxed text-lg font-bold text-justify [hyphens:auto]" dangerouslySetInnerHTML={{ __html: t.aboutSchoolDesc1 }}></p>
              </div>
              <div className="bg-yellow-50 p-10 rounded-[3rem] shadow-lg border border-yellow-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                <div className="bg-yellow-400 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-md text-blue-950">
                  <BookOpen className="h-8 w-8" />
                </div>
                <p className="text-gray-900/80 leading-relaxed text-lg font-bold text-justify [hyphens:auto]" dangerouslySetInnerHTML={{ __html: t.aboutSchoolDesc2 }}></p>
              </div>
              <div className="bg-teal-50 p-10 rounded-[3rem] shadow-lg border border-teal-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
                <div className="bg-teal-400 w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-md text-white">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <p className="text-teal-900/80 leading-relaxed text-lg font-bold text-justify [hyphens:auto]" dangerouslySetInnerHTML={{ __html: t.aboutSchoolDesc3 }}></p>
              </div>
            </div>
          </div>
        </div>

        {/* --- VISION & MISSION --- */}
        <div className="bg-slate-50 py-24 sm:py-32 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16 sm:mb-24">
              <h2 className="text-4xl md:text-6xl font-black text-blue-950 mb-6 tracking-tighter uppercase">{t.aboutTitle}</h2>
              <div className="w-24 h-2 bg-yellow-400 mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
              {/* Vision Text */}
              <div className="lg:col-span-8 bg-blue-950 p-10 sm:p-14 rounded-[3rem] shadow-2xl hover:shadow-blue-900/40 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-center border-b-[12px] border-yellow-400">
                <Eye className="absolute -right-10 -top-10 text-white/5 w-72 h-72 rotate-12 transition-all duration-700" />
                <div className="relative z-10">
				   <h3 className="inline-block bg-yellow-400 text-blue-950 text-3xl sm:text-5xl font-black px-10 py-5 sm:px-14 sm:py-6 rounded-full tracking-tighter leading-tight shadow-2xl border-4 border-yellow-300/30 uppercase">
                      {t.visionTitle}
                    </h3>                 
                  <p dangerouslySetInnerHTML={{ __html: t.visionDesc }} className="text-yellow-400 leading-relaxed text-lg sm:text-xl font-medium max-w-3xl text-justify [hyphens:auto]"></p>
                </div>
              </div>
              {/* Vision Image */}
              <div className="lg:col-span-4 relative rounded-[3rem] overflow-hidden shadow-2xl group h-[400px] lg:h-auto border-[6px] border-white hover:-translate-y-2 transition-all duration-500">
                <img src={siteImages?.visionImg || defaultVivekanandaImg} alt="Vision" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 duration-700 object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/40 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>
                <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end h-full z-10">
                  <Quote className="text-yellow-400 w-12 h-12 mb-4 opacity-80 drop-shadow-md" />
                  <p className="font-black text-yellow-400 text-xl sm:text-2xl italic leading-tight mb-5 drop-shadow-lg text-justify [hyphens:auto]">"{t.visionQuoteText}"</p>
                  <div className="w-10 h-1.5 bg-yellow-400 rounded-full mb-3 shadow-md"></div>
                  <p dangerouslySetInnerHTML={{ __html: t.visionQuoteAuthor }} className="text-[10px] font-black text-yellow-300 uppercase tracking-widest drop-shadow-md"></p>
                </div>
              </div>
              {/* Mission Text */}
              <div className="lg:col-span-8 lg:order-4 bg-yellow-400 p-10 sm:p-14 rounded-[3rem] shadow-2xl hover:shadow-yellow-400/40 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden flex flex-col justify-center border-b-[12px] border-blue-950">
                <Target className="absolute -left-10 -bottom-10 text-blue-950/5 w-72 h-72 -rotate-12 transition-all duration-700" />
                <div className="relative z-10 lg:ml-auto">
                  <div className="mb-10 lg:text-right">
                    <h3 className="inline-block bg-blue-950 text-yellow-400 text-3xl sm:text-5xl font-black px-10 py-5 sm:px-14 sm:py-6 rounded-full tracking-tighter leading-tight shadow-2xl border-4 border-yellow-300/30 uppercase">
                      {t.missionTitle}
                    </h3>
                  </div>
                  <p className="text-blue-950/90 leading-relaxed text-lg sm:text-xl font-bold max-w-3xl ml-auto text-justify [hyphens:auto]">{t.missionDesc}</p>
                </div>
              </div>
              {/* Mission Image */}
              <div className="lg:col-span-4 lg:order-3 relative rounded-[3rem] overflow-hidden shadow-2xl group h-[400px] lg:h-auto border-[6px] border-white hover:-translate-y-2 transition-all duration-500">
                <img src={siteImages?.missionImg || "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=2000&auto=format&fit=crop"} alt="Mission" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-yellow-500 via-yellow-500/50 to-transparent opacity-90 transition-opacity group-hover:opacity-100"></div>
                <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col justify-end h-full z-10">
                  <Quote className="text-blue-950 w-12 h-12 mb-4 opacity-80 drop-shadow-md" />
                  <p className="font-black text-blue-950 text-xl sm:text-2xl italic leading-tight mb-5 drop-shadow-lg text-justify [hyphens:auto]">"{t.missionQuoteText}"</p>
                  <div className="w-10 h-1.5 bg-blue-950 rounded-full mb-3 shadow-md"></div>
                  <p dangerouslySetInnerHTML={{ __html: t.missionQuoteAuthor }} className="text-[10px] font-black text-blue-900 uppercase tracking-widest drop-shadow-md"></p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* --- WHY CHOOSE US --- */}
        <div className="bg-white py-24 sm:py-32 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="w-full lg:w-1/2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-2 w-12 bg-yellow-400 rounded-full"></div>
                  <h2 className="text-sm font-black text-blue-500 uppercase tracking-widest">Why Choose Us</h2>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-blue-950 mb-8 leading-[1.1] tracking-tighter uppercase">{t.growTitle}</h2>
                <div className="space-y-6 text-gray-600 text-lg sm:text-xl leading-relaxed mb-12 font-medium text-justify [hyphens:auto]">
                  <p>{formatTextWithColon(t.growDesc1)}</p>
                  <p>{formatTextWithColon(t.growDesc2)}</p>
                </div>
                <ul className="space-y-6">
                  {[ {point: t.point1, icon: <Star />, color: "bg-green-400"},
                     {point: t.point2, icon: <Book />, color: "bg-yellow-400"},
                     {point: t.point3, icon: <Heart />, color: "bg-rose-400"}
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-6 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className={`${item.color} p-4 rounded-[1.5rem] shrink-0 text-blue-950 shadow-md`}>{item.icon}</div>
                      <div className="text-blue-950 text-lg sm:text-xl leading-tight font-black uppercase tracking-tight">{formatTextWithColon(item.point)}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full lg:w-1/2 relative">
                <div className="absolute top-6 -right-6 w-full h-full bg-blue-100 rounded-[4rem] transform rotate-3 z-0"></div>
                <div className="relative z-10 rounded-[4rem] overflow-hidden shadow-2xl bg-white border-8 border-white group">
                  <img src={siteImages?.growImg || "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop"} alt="Growing" className="w-full h-[500px] sm:h-[600px] object-cover group-hover:scale-105 duration-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- TEACHERS SECTION --- */}
        <div id="teachers" className="bg-slate-50 py-24 sm:py-32 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20">
              <h2 className="text-4xl md:text-6xl font-black text-blue-950 mb-6 tracking-tighter uppercase">{t.teachersTitle}</h2>
              <div className="w-24 h-2 bg-yellow-400 mx-auto rounded-full mb-6"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
              {[ {name: t.t1Name, role: t.t1Role, desc: t.t1Desc, img: siteImages?.t1Img || "https://images.unsplash.com/photo-1544717302-de2939b7ef71?q=80&w=2000&auto=format&fit=crop"}, 
                 {name: t.t2Name, role: t.t2Role, desc: t.t2Desc, img: siteImages?.t2Img || "https://images.unsplash.com/photo-1580894732444-8ecded790047?q=80&w=2000&auto=format&fit=crop"}, 
                 {name: t.t3Name, role: t.t3Role, desc: t.t3Desc, img: siteImages?.t3Img || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2000&auto=format&fit=crop"} 
              ].map((teacher, i) => (
                <div key={i} className="bg-white rounded-[3rem] p-10 text-center border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 group">
                  <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-8 border-yellow-400 mb-8 group-hover:scale-110 group-hover:rotate-3 duration-500 shadow-xl">
                    <img src={teacher.img} alt={teacher.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-3xl font-black text-blue-950 mb-2 tracking-tight">{teacher.name}</h3>
                  <p className="inline-block bg-blue-50 text-blue-600 px-5 py-1.5 rounded-full text-[10px] font-black mb-8 uppercase tracking-widest">{teacher.role}</p>
                  <p className="text-gray-600 text-lg leading-relaxed font-medium text-justify [hyphens:auto]">{teacher.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- CURRICULUM SECTION --- */}
        <div id="programs" className="bg-blue-950 py-24 sm:py-32 text-white relative overflow-hidden">
          <Sparkles className="absolute top-20 left-20 w-32 h-32 text-yellow-400/10 animate-pulse" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-yellow-400 px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase mb-6">
                Learning Pathways
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase text-white">
                {t.progTitle}
              </h2>
              <div className="w-24 h-2 bg-yellow-400 mx-auto rounded-full mb-8"></div>
              <p className="text-blue-100 max-w-2xl mx-auto text-lg sm:text-xl font-medium leading-relaxed">{t.progSub}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
              {[
                {
                  title: t.progCard1Title,
                  age: t.progCard1Subtitle,
                  desc: t.progCard1Desc,
                  bg: "bg-rose-500",
                  shadow: "shadow-rose-500/40",
                  img: siteImages?.progCard1Img || "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2020&auto=format&fit=crop"
                },
                {
                  title: t.progCard2Title,
                  age: t.progCard2Subtitle,
                  desc: t.progCard2Desc,
                  bg: "bg-amber-500",
                  shadow: "shadow-amber-500/40",
                  img: siteImages?.progCard2Img || "https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=2072&auto=format&fit=crop"
                },
                {
                  title: t.progCard3Title,
                  age: t.progCard3Subtitle,
                  desc: t.progCard3Desc,
                  bg: "bg-teal-500",
                  shadow: "shadow-teal-500/40",
                  img: siteImages?.progCard3Img || "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop"
                }
              ].map((card, i) => (
                <div key={i} className="relative group flex flex-col h-full">
                  <div className={`relative ${card.bg} rounded-[3.5rem] p-8 sm:p-10 flex flex-col h-full border-4 border-white/20 shadow-2xl ${card.shadow} hover:-translate-y-3 transition-all duration-500 overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                    <div className="relative mb-10">
                      <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/30 aspect-video">
                        <img src={card.img} alt={card.title} className="w-full h-full object-cover group-hover:scale-110 duration-700" />
                      </div>
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-blue-950/90 backdrop-blur-md text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-white/20 shadow-xl whitespace-nowrap">
                        <Clock className="w-3 h-3 inline-block mr-2 text-yellow-400" /> {card.age}
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl sm:text-4xl font-black text-white mb-6 tracking-tighter uppercase drop-shadow-md">
                        {card.title}
                      </h3>
                      <p className="text-white text-sm sm:text-base font-bold leading-relaxed text-justify [hyphens:auto]">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-24 text-center">
               <a href="#enquiry" className="inline-flex items-center gap-3 bg-yellow-400 text-blue-950 px-12 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_50px_-10px_rgba(250,204,21,0.5)] hover:-translate-y-1 active:scale-95 duration-300">
                 {t.btnEnquire} <ArrowDown className="w-5 h-5 animate-bounce" />
               </a>
            </div>
          </div>
        </div>

        {/* --- GALLERY SECTION --- */}
        <div id="gallery" className="bg-white py-24 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="text-4xl md:text-6xl font-black text-blue-950 mb-6 tracking-tighter uppercase">{t.galleryTitle}</h2>
              <div className="w-24 h-2 bg-yellow-400 rounded-full mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[280px]">
              {galleryPreview.map((item, index) => (
                <div key={item.id} onClick={() => openModal(index)} className={`relative rounded-[2rem] overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all border-[6px] border-gray-50 bg-gray-100 ${index % 6 === 0 ? "sm:col-span-2 md:row-span-2 h-80 md:h-full" : "h-56 md:h-full"}`}>
                  {item.type === 'video' ? (
					  <>
						<video 
						  src={`${item.url}#t=0.001`} 
						  preload="metadata" 
						  playsInline 
						  muted 
						  className="w-full h-full object-cover bg-gray-200" 
						/>
						<div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
						  <PlayCircle className="text-white h-12 w-12 shadow-2xl rounded-full opacity-90 group-hover:scale-110 transition-transform" />
						</div>
					  </>
					) : (
					  <img src={item.url} alt="Gallery item" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
					)}
                </div>
              ))}
            </div>
            <div className="mt-16 text-center">
               <Link to="/gallery" className="inline-flex items-center gap-3 bg-blue-950 text-white px-10 py-5 rounded-full font-black text-lg uppercase tracking-wider hover:bg-blue-800 transition-all shadow-xl hover:-translate-y-1 hover:scale-105">
                 <Eye className="h-6 w-6 text-yellow-400" /> {t.btnViewGallery}
               </Link>
            </div>
          </div>
        </div>

        {/* --- ENQUIRY SECTION --- */}
        <div id="enquiry" className="bg-slate-50 py-24 sm:py-32 border-t border-gray-200 scroll-mt-24 relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-200/50 rounded-full blur-3xl pointer-events-none"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-blue-950 mb-6 tracking-tighter uppercase">{t.enqTitle}</h2>
              <div className="w-24 h-2 bg-yellow-400 rounded-full mx-auto mb-8"></div>
              <p className="text-gray-600 text-lg sm:text-xl font-bold text-justify [hyphens:auto]">{t.enqDesc}</p>
            </div>
            <form className="bg-white p-8 sm:p-14 rounded-[3rem] shadow-2xl border-4 border-white/50 backdrop-blur-sm" onSubmit={handleEnquirySubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="block text-xs font-black text-blue-950 uppercase tracking-[0.2em] mb-3 pl-2">{t.enqName}</label>
                  <input type="text" className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:bg-white focus:outline-none transition-all font-bold text-lg shadow-sm" placeholder="Full Name" required value={enquiryForm.parentName} onChange={(e) => setEnquiryForm({...enquiryForm, parentName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-blue-950 uppercase tracking-[0.2em] mb-3 pl-2">{t.enqPhone}</label>
                  <input type="tel" className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:bg-white focus:outline-none transition-all font-bold text-lg shadow-sm" placeholder="+91" required value={enquiryForm.phone} onChange={(e) => setEnquiryForm({...enquiryForm, phone: e.target.value})} />
                </div>
              </div>
              <div className="mb-8">
                <label className="block text-xs font-black text-blue-950 uppercase tracking-[0.2em] mb-3 pl-2">{t.enqChildAge}</label>
                <input type="text" className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:bg-white focus:outline-none transition-all font-bold text-lg shadow-sm" placeholder="Age (e.g. 4 Years)" required value={enquiryForm.childAge} onChange={(e) => setEnquiryForm({...enquiryForm, childAge: e.target.value})} />
              </div>
              <div className="mb-10">
                <label className="block text-xs font-black text-blue-950 uppercase tracking-[0.2em] mb-3 pl-2">{t.enqMessage}</label>
                <textarea rows="4" className="w-full bg-slate-50 px-6 py-4 rounded-2xl border-2 border-slate-100 focus:border-yellow-400 focus:bg-white focus:outline-none transition-all font-bold text-lg shadow-sm resize-none" placeholder="How can we help?" value={enquiryForm.message} onChange={(e) => setEnquiryForm({...enquiryForm, message: e.target.value})}></textarea>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-3 bg-blue-950 text-white px-10 py-5 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-blue-800 transition-all shadow-xl hover:-translate-y-1 active:scale-95 disabled:opacity-70 group">
                <Send className="h-6 w-6 text-yellow-400 group-hover:translate-x-1 transition-transform" /> {isSubmitting ? 'Sending...' : t.enqSubmit}
              </button>
            </form>
          </div>
        </div>		
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-blue-950 text-gray-300 pt-12 sm:pt-16 pb-8 border-t-[8px] border-yellow-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 mb-10 md:mb-12">
            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-full shrink-0 shadow-lg h-10 w-10 flex items-center justify-center overflow-hidden">
                  <img src={siteImages?.logo || "/vcm_logo.jpeg"} alt="VCM Logo" className="h-full w-full object-cover" />
                </div>
                <span className="text-white font-bold text-lg sm:text-xl tracking-tight">Vivekananda Child's Mission</span>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-yellow-400 shrink-0 mt-1" />
                  <p className="text-sm leading-relaxed text-justify">{contactInfo.address || "371/A, M. G. Road, Budge Budge, Kolkata - 700137"}</p>
                </div>
                <a href={`tel:${contactInfo.phone?.replace(/ /g, '') || "+919230261809"}`} className="flex items-center gap-3 hover:text-yellow-400 transition-colors group">
                  <Phone className="h-5 w-5 text-yellow-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <p className="text-sm">{contactInfo.phone || "+91 92302 61809"}</p>
                </a>
                <a href={`mailto:${contactInfo.email || "vivekanandachildsmission@gmail.com"}`} className="flex items-center gap-3 hover:text-yellow-400 transition-colors group">
                  <Mail className="h-5 w-5 text-yellow-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <p className="text-sm truncate">{contactInfo.email || "vivekanandachildsmission@gmail.com"}</p>
                </a>
              </div>
			<div className="pt-8 mt-8 border-t border-blue-200/60">
			  <h4 className="font-bold text-white mb-4 uppercase tracking-widest text-[10px]">Follow Us</h4>
			  <div className="flex items-center gap-4">
				<a href="https://facebook.com/your-profile" target="_blank" rel="noopener noreferrer" className="bg-[#1877F2] text-white p-3 rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center">
				  <Facebook className="w-6 h-6" />
				</a>
				<a href="https://instagram.com/your-profile" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white p-3 rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center">
				  <Instagram className="w-6 h-6" />
				</a>
				<a href={`https://wa.me/${contactInfo.phone?.replace(/[^0-9]/g, '') || "919230261809"}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white p-3 rounded-full shadow-md hover:shadow-lg hover:-translate-y-1 transition-all flex items-center justify-center">
				  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
				</a>
			  </div>
			</div>
            </div>
            <div className="md:col-span-1 lg:col-span-2 flex flex-col h-full mt-4 md:mt-0">
              <h4 className="text-white font-semibold mb-3 sm:mb-4 uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2"><Globe className="h-4 w-4 text-yellow-400" /> Locate Us</h4>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden h-48 sm:h-64 border-2 border-blue-800 shadow-xl relative group">
                <iframe title="Map" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3686.953494793616!2d88.1747!3d22.4831!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a027c5415555555%3A0x1234567890abcdef!2s371%2FA%2C%20M.%20G.%20Road%2C%20Budge%20Budge%2C%20Kolkata%20-%20700137!5e0!3m2!1sen!2sin!4v1712400000000!5m2!1sen!2sin" className="absolute inset-0 w-full h-full border-0" allowFullScreen loading="lazy" />
			  </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-blue-900 pt-6 sm:pt-8 text-center md:text-left">
            <p className="text-xs sm:text-sm text-gray-400 font-medium">© {new Date().getFullYear()} Vivekananda Child's Mission. {t.rights}</p>
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-yellow-400 transition font-medium">Privacy Policy</Link>
			  <Link to="/login" className="text-gray-400 hover:text-yellow-400 transition font-medium">{t.footerLogin}</Link>
              <a href="#home" className="text-gray-400 hover:text-yellow-400 transition font-medium">{t.footerTop}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;