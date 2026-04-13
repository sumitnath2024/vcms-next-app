import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'; 
import { 
  Phone, Smartphone, AlertCircle, Loader2, 
  ArrowLeft, CheckCircle, Clock, RefreshCw, Power, Sparkles, BookOpen
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem('lastLoginPhone') || '');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  
  const [timer, setTimer] = useState(0);

  const isAndroidApp = !!(window.Android || (window.navigator && window.navigator.app));

  const handleExitOrBack = () => {
    if (window.Android && typeof window.Android.exitApp === 'function') {
      window.Android.exitApp(); 
    } else if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp(); 
    } else if (isAndroidApp) {
      window.close(); 
    } else {
      navigate('/'); 
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let interval;
    if (timer > 0 && confirmationResult) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, confirmationResult]);

  useEffect(() => {
    if (confirmationResult && 'credentials' in navigator) {
      const abortController = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: abortController.signal
      })
      .then((otpAuth) => {
        if (otpAuth && otpAuth.code) {
          setOtp(otpAuth.code);
        }
      })
      .catch((err) => {
        console.log("Web OTP API cancelled or not supported.", err);
      });
      return () => abortController.abort();
    }
  }, [confirmationResult]);

  useEffect(() => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } catch (err) {}

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchRoleAndRedirect(user.uid); 
      } else {
        setCheckingAuth(false);
      }
    });
    
    return () => {
      unsubscribe();
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      } catch (err) {}
    };
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': (response) => { console.log("[reCAPTCHA] Success solved."); }
        });
      } catch (err) { console.error("[reCAPTCHA] Init Error:", err); }
    }
  };

  const fetchRoleAndRedirect = async (uid) => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.status === 'Inactive') {
          await signOut(auth); 
          setError("Your portal access is inactive. Please contact administration.");
          setCheckingAuth(false);
          setLoading(false);
          return;
        }

        const nativeAppToken = localStorage.getItem('app_fcm_token') || window.appFcmToken;
        if (nativeAppToken) {
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(nativeAppToken),
            lastLoginPlatform: 'Web',
            lastLoginTime: new Date().toISOString()
          });
        }

        const role = userData.role?.trim().toLowerCase(); 
        if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'teacher') navigate('/teacher/dashboard');
        else if (role === 'student' && userData.registrationStatus !== 'Pending') navigate('/student/dashboard');
        else if (userData.registrationStatus === 'Pending') navigate('/pending-approval'); 
        else {
          await signOut(auth);
          setError("Unauthorized role.");
          setCheckingAuth(false);
        }
      } else {
        await signOut(auth);
        fetch('https://us-central1-vcms-fa31a.cloudfunctions.net/deleteFirebaseAuthUser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { targetUid: uid } })
        }).catch(e => console.warn("Background cleanup failed:", e));

        setError("No portal profile is registered to this number. Please contact administration.");
        setCheckingAuth(false);
      }
    } catch (err) {
      console.error("[DB Lookup] Error:", err);
      setError("Failed to verify account permissions.");
      setCheckingAuth(false);
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setError('');
    const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanNumber.length < 10) return setError("Please enter a valid 10-digit mobile number.");

    localStorage.setItem('lastLoginPhone', cleanNumber);
    setLoading(true);
    const finalPhone = `+91${cleanNumber}`;

    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      setupRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, finalPhone, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      setTimer(60); 
      setOtp(''); 
      setLoading(false);
    } catch (err) {
      setError(`Failed to send SMS: ${err.message || "Unknown error"}`);
      setLoading(false);
      if(window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    }
  };

  const handleRequestOtp = (e) => {
    e.preventDefault();
    sendOtp();
  };

  const handleVerifyOtp = async (e) => {
    if(e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
    } catch (err) {
      setError("Invalid OTP. Please check and try again.");
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-blue-900">
		<div className="bg-white p-1 rounded-full shrink-0 shadow-lg h-50 w-50 flex items-center justify-center overflow-hidden">
			<img src="/vcm_logo.jpeg" alt="VCM Logo" className="h-full w-full object-cover" />
		</div>
	  <h2 className="text-2xl font-black tracking-tight uppercase animate-bounce">Vivekananda Child's Mission</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-yellow-400 selection:text-blue-950 relative overflow-hidden">
      <div id="recaptcha-container"></div>
      
      {/* Abstract Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-pulse"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
      </div>

      {/* --- FLOATING GLASS NAVIGATION --- */}
      <div className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4 pointer-events-none transition-all duration-500">
        <nav className={`mx-auto max-w-7xl pointer-events-auto transition-all duration-500 rounded-full ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-2xl py-2 px-4 border border-white/20' : 'bg-transparent py-4'}`}>
          <div className="flex justify-between items-center h-16 px-2 sm:px-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="bg-white p-1 rounded-full shadow-md shrink-0 overflow-hidden h-12 w-12 flex items-center justify-center border-4 border-yellow-400 group-hover:rotate-12 transition-all duration-500">
                <BookOpen className="h-6 w-6 text-blue-950" />
              </div>
              <h1 className="text-base sm:text-xl font-black tracking-tighter leading-none uppercase text-blue-950">
                Vivekananda <br className="sm:hidden"/><span className="text-yellow-500">Child's Mission</span>
              </h1>
            </Link>
            <button onClick={handleExitOrBack} className="flex items-center gap-2 bg-white text-gray-700 hover:bg-yellow-400 hover:text-blue-950 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 border border-gray-100">
              {isAndroidApp ? <Power size={18} className="text-red-500" /> : <ArrowLeft size={18} />} 
              <span className="hidden sm:block">{isAndroidApp ? 'Exit App' : 'Back to Home'}</span>
            </button>
          </div>
        </nav>
      </div>

      <main className="flex-grow flex items-center justify-center pt-32 pb-20 px-4 relative z-10">
        <div className="max-w-md w-full">
          
          <div className="text-center mb-10">
            <div className="bg-white p-1.5 rounded-full shadow-2xl mx-auto mb-8 h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center border-4 border-yellow-400 overflow-hidden hover:rotate-6 transition-transform duration-500">
              <img src="/vcm_logo.jpeg" alt="VCM Logo" className="h-full w-full object-cover rounded-full" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-blue-950 tracking-tighter uppercase mb-2 drop-shadow-sm">
                {confirmationResult ? 'Verify Code' : 'Portal Login'}
            </h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">
                {confirmationResult ? 'ওটিপি যাচাই করুন | ओटीपी सत्यापित करें' : 'আপনার পোর্টালে লগইন করুন | पोर्टल लॉगिन'}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[3rem] shadow-2xl border-[6px] border-white relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-700"></div>

            {error && (
              <div className="mb-8 bg-rose-50 border-l-4 border-rose-500 p-4 flex items-start gap-4 rounded-r-2xl animate-in slide-in-from-left-2">
                <AlertCircle className="h-6 w-6 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-rose-800 leading-snug">{error}</p>
              </div>
            )}

            {!confirmationResult ? (
              <form className="space-y-8" onSubmit={handleRequestOtp}>
                <div className="group">
                  <label className="flex flex-col mb-3 ml-2 cursor-pointer">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-widest">Mobile Number</span>
                    <span className="text-[10px] text-gray-500 font-bold mt-1 uppercase opacity-80">ফোন নম্বর | फोन नंबर</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Smartphone className="h-5 w-5 text-blue-400 group-focus-within:text-yellow-500 transition-colors" />
                    </div>
                    <input
                      type="tel" required maxLength="10" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      className="block w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 focus:bg-white text-lg font-black outline-none transition-all tracking-widest"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={loading || phoneNumber.length < 10}
                  className="w-full flex flex-col justify-center items-center py-5 px-6 bg-blue-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-blue-700 hover:shadow-[0_10px_30px_-10px_rgba(37,99,235,0.5)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 transition-all shadow-xl group"
                >
                  <div className="flex items-center gap-3">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Phone size={20} className="group-hover:rotate-12 transition-transform"/>}
                    <span>{loading ? 'Sending...' : 'Send OTP'}</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70 mt-1">ওটিপি পাঠান | ओटीपी भेजें</span>
                </button>
              </form>
            ) : (
              <form className="space-y-8" onSubmit={handleVerifyOtp}>
                <div className="group text-center">
                  <label className="flex flex-col mb-4 cursor-pointer">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-widest">Enter Verification Code</span>
                    <span className="text-[10px] text-emerald-500 font-bold mt-1 uppercase">প্রেরিত ওটিপি দিন | ओटीपी दर्ज करें</span>
                  </label>
                  <input
                    type="text" required maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)}
                    autoComplete="one-time-code"
                    className="block w-full px-4 py-5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:ring-4 focus:ring-emerald-400/20 focus:border-emerald-400 focus:bg-white text-4xl font-black outline-none transition-all text-center tracking-[0.3em] text-emerald-700"
                    placeholder="••••••"
                  />
                  <p className="text-[11px] text-gray-400 mt-4 font-bold flex items-center justify-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" /> Code sent to +91 {phoneNumber.slice(-10)}
                  </p>
                </div>

                <button
                  type="submit" disabled={loading || otp.length < 6}
                  className="w-full flex flex-col justify-center items-center py-5 px-6 bg-emerald-600 text-white rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-emerald-700 hover:shadow-[0_10px_30px_-10px_rgba(5,150,105,0.5)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 transition-all shadow-xl group"
                >
                  <div className="flex items-center gap-3">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles size={20}/>}
                    <span>{loading ? 'Verifying...' : 'Verify & Login'}</span>
                  </div>
                  <span className="text-[10px] font-bold opacity-70 mt-1 uppercase">লগইন করুন | लॉगिन करें</span>
                </button>

                <div className="flex flex-col items-center gap-5 pt-6 border-t-2 border-slate-50">
                  <div className="flex items-center gap-3">
                    {timer > 0 ? (
                      <span className="text-emerald-600 flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border-2 border-emerald-100 text-xs font-black uppercase tracking-widest">
                        <Clock size={14} /> Resend in {timer}s
                      </span>
                    ) : (
                      <button type="button" onClick={sendOtp} disabled={loading} className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Resend Now
                      </button>
                    )}
                  </div>
                  
                  <button type="button" onClick={() => { setConfirmationResult(null); setOtp(''); setError(''); }} 
                    className="text-[10px] font-black text-gray-400 hover:text-blue-500 uppercase tracking-widest transition-colors py-2 px-4 hover:bg-blue-50 rounded-full"
                  >
                    Change Phone Number
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 text-center px-4">
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed uppercase tracking-tight opacity-60">
              Secured by Google reCAPTCHA. <br className="sm:hidden"/>
              <a href="https://policies.google.com/privacy" className="text-blue-400 underline mx-1">Privacy</a> & <a href="https://policies.google.com/terms" className="text-blue-400 underline mx-1">Terms</a> apply.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;