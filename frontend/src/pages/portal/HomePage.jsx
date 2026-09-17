import React, { useState, useRef, useEffect } from 'react';

// Translations Dictionary for Dual Language Support (English / Nepali)
const translations = {
  en: {
    badge: "Official e-Governance Healthcare Initiative",
    heroTitle: "Unified Healthcare Access for Every Citizen",
    heroSubtitle: "Connect directly with authorized hospitals, book instant OPD appointments, reduce waiting queues, and access public healthcare services securely from your device.",
    getStartedCitizen: "Get Started as Citizen",
    aboutTitle: "System Overview",
    aboutHeading: "Streamlining Healthcare Delivery Across the Nation",
    aboutDesc: "The National Health Access System (e-Swasthya) serves as the core digital infrastructure bridging citizens with certified medical institutions. Designed for seamless public service delivery, it eliminates long waiting queues, simplifies appointment scheduling, and brings maximum convenience to users.",
    bullet1: "Secure OTP Verification: Robust identity checks safeguarding your personal account and booking details.",
    bullet2: "Queue Reduction: Skip physical lines by reserving digital OPD tokens in advance.",
    bullet3: "Real-Time Scheduling: Direct synchronization with hospital OPD queues and practitioner timetables.",
    coreModules: "Core Services",
    modulesHeading: "Designed for Citizen Convenience and Fast Booking",
    opdTitle: "Instant OPD Booking",
    opdDesc: "Browse available doctors, check department schedules, and reserve your appointment token instantly to bypass long physical queues.",
    queueTitle: "Queue Reduction & Tokens",
    queueDesc: "Track your scheduled visits and secure digital queue numbers for a seamless, hassle-free hospital visit experience.",
    convenienceTitle: "Absolute User Convenience",
    convenienceDesc: "Access reliable healthcare services, emergency helplines, and hospital network directories from a single centralized portal.",
    networkTitle: "Integrated Healthcare Network",
    networkHeading: "Authorized & Recognized Medical Institutions",
    hosp1Name: "Central Teaching Hospital",
    hosp1Type: "Federal Institution",
    hosp1Desc: "Fully integrated with specialized emergency wards, multi-specialty OPDs, and advanced digital token booking.",
    hosp2Name: "Regional Medical Center",
    hosp2Type: "Provincial Hub",
    hosp2Desc: "Equipped with specialized trauma units, pediatric care, and direct outpatient scheduling channels.",
    hosp3Name: "Community General Hospital",
    hosp3Type: "District Hospital",
    hosp3Desc: "Providing accessible primary healthcare, maternity services, and streamlined digital queue tokens.",
    online247: "Status: Online 24/7",
    quickLinks: "Quick Links",
    supportHeading: "Support & Helplines",
    emergencyDesk: "National Health Emergency Desk:",
    navAbout: "About System",
    navServices: "Services",
    navHospitals: "Hospitals",
    navContact: "Help & Support",
    loginDropdown: "Login",
    registerDropdown: "Register",
    loginUser: "Login as User",
    loginHospital: "Login as Hospital",
    registerUser: "Register as User",
    registerHospital: "Register as Hospital",
    rights: "All rights reserved.",
    contactSectionTitle: "Contact Us",
    phoneLabel: "Phone:",
    emailLabel: "Email:",
    addressLabel: "Address:",
    addressValue: "Kathmandu, Nepal",
    phoneValue: "+977 01-5900000 / 1115"
  },
  ne: {
    badge: "आधिकारिक ई-शासन स्वास्थ्य सेवा पहल",
    heroTitle: "प्रत्येक नागरिकका लागि एकीकृत स्वास्थ्य सेवा पहुँच",
    heroSubtitle: "अधिकृत अस्पतालहरूसँग सीधै जोडिनुहोस्, तुरुन्तै ओपिडी एपोइन्टमेन्ट बुक गर्नुहोस्, लामो लाइनहरू कम गर्नुहोस् र सहज रूपमा स्वास्थ्य सेवाहरू प्राप्त गर्नुहोस्।",
    getStartedCitizen: "नागरिकको रूपमा सुरु गर्नुहोस्",
    aboutTitle: "प्रणालीको अवलोकन",
    aboutHeading: "राष्ट्रव्यापी स्वास्थ्य सेवा वितरणलाई सहज बनाउँदै",
    aboutDesc: "राष्ट्रिय स्वास्थ्य पहुँच प्रणाली (ई-स्वास्थ्य) ले नागरिकहरूलाई प्रमाणित चिकित्सा संस्थाहरूसँग जोड्ने मुख्य डिजिटल पूर्वाधारको रूपमा काम गर्छ। यसले लामो लाइनहरू हटाउँछ, एपोइन्टमेन्ट प्रक्रियालाई सरल बनाउँछ र प्रयोगकर्ताहरूलाई उच्च सुविधा प्रदान गर्दछ।",
    bullet1: "सुरक्षित ओटिपी प्रमाणीकरण: तपाईंको खाता र बुकिङ विवरण सुरक्षित राख्ने भरपर्दो पहिचान जाँच।",
    bullet2: "लामो लाइनमा बस्नु पर्दैन: डिजिटल टोकनहरू अग्रिम आरक्षित गरेर भौतिक लाइनहरूबाट मुक्ति पाउनुहोस्।",
    bullet3: "वास्तविक समयको समय तालिका: अस्पतालको ओपिडी पालो र चिकित्सकहरूको समयसँग प्रत्यक्ष समन्वय।",
    coreModules: "मुख्य सेवाहरू",
    modulesHeading: "नागरिकहरूको सुविधा र छिटो बुकिङका लागि डिजाइन गरिएको",
    opdTitle: "तत्काल ओपिडी बुकिङ",
    opdDesc: "उपलब्ध डाक्टरहरू खोज्नुहोस्, विभागको समय तालिका जाँच गर्नुहोस्, र लामो भौतिक लाइनहरू छल्न तुरुन्तै टोकन आरक्षित गर्नुहोस्।",
    queueTitle: "लाइन व्यवस्थापन र टोकनहरू",
    queueDesc: "तपाईंको निर्धारित भ्रमणहरू ट्र्याक गर्नुहोस् र झन्झटमुक्त अस्पताल अनुभवको लागि डिजिटल टोकन सुरक्षित गर्नुहोस्।",
    convenienceTitle: "पूर्ण प्रयोगकर्ता सुविधा",
    convenienceDesc: "एकै केन्द्रीय पोर्टलबाट भरपर्दो स्वास्थ्य सेवाहरू, आपतकालीन हेल्पलाइनहरू र अस्पताल नेटवर्क डाइरेक्टरीहरू प्राप्त गर्नुहोस्।",
    networkTitle: "एकीकृत स्वास्थ्य सेवा नेटवर्क",
    networkHeading: "अधिकृत तथा मान्यता प्राप्त चिकित्सा संस्थाहरू",
    hosp1Name: "केन्द्रीय शिक्षण अस्पताल",
    hosp1Type: "संघीय संस्था",
    hosp1Desc: "विशेष आपतकालीन वार्डहरू, बहु-विशेषता ओपिडीहरू, र उन्नत डिजिटल टोकन बुकिङसँग पूर्ण रूपमा एकीकृत।",
    hosp2Name: "क्षेत्रीय चिकित्सा केन्द्र",
    hosp2Type: "प्रान्तीय केन्द्र",
    hosp2Desc: "विशेष ट्रमा युनिट, बाल हेरचाह, र प्रत्यक्ष आउटपेन्ट समयतालिका च्यानलहरूले सुसज्जित।",
    hosp3Name: "सामुदायिक सामान्य अस्पताल",
    hosp3Type: "जिल्ला अस्पताल",
    hosp3Desc: "सुलभ प्राथमिक स्वास्थ्य सेवा, प्रसूति सेवा, र सुव्यवस्थित डिजिटल टोकनहरू प्रदान गर्दै।",
    online247: "स्थिति: अनलाइन २४/७",
    quickLinks: "द्रुत लिङ्कहरू",
    supportHeading: "सहयोग तथा हेल्पलाइन",
    emergencyDesk: "राष्ट्रिय स्वास्थ्य आपतकालीन डेस्क:",
    navAbout: "प्रणाली बारे",
    navServices: "सेवाहरू",
    navHospitals: "अस्पतालहरू",
    navContact: "सहायता र समर्थन",
    loginDropdown: "लगइन",
    registerDropdown: "दर्ता",
    loginUser: "प्रयोगकर्ता लगइन",
    loginHospital: "अस्पताल लगइन",
    registerUser: "प्रयोगकर्ता दर्ता",
    registerHospital: "अस्पताल दर्ता",
    rights: "सर्वाधिकार सुरक्षित।",
    contactSectionTitle: "सम्पर्क गर्नुहोस्",
    phoneLabel: "फोन:",
    emailLabel: "इमेल:",
    addressLabel: "ठेगाना:",
    addressValue: "काठमाडौं, नेपाल",
    phoneValue: "+९७७ ०१-५९००००० / १११५"
  }
};

export default function HomePage() {
  const [lang, setLang] = useState('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Dropdown states
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const loginRef = useRef(null);
  const registerRef = useRef(null);
  const t = translations[lang];

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setLoginOpen(false);
      }
      if (registerRef.current && !registerRef.current.contains(event.target)) {
        setRegisterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* HEADER & NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-600/20 shrink-0">
              🏥
            </div>
            <div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 block leading-none">
                e-Swasthya
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 tracking-wide uppercase">
                {lang === 'en' ? 'National Health Access System' : 'राष्ट्रिय स्वास्थ्य पहुँच प्रणाली'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#about" className="hover:text-emerald-600 transition-colors">{t.navAbout}</a>
            <a href="#services" className="hover:text-emerald-600 transition-colors">{t.navServices}</a>
            <a href="#hospitals" className="hover:text-emerald-600 transition-colors">{t.navHospitals}</a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">{t.navContact}</a>
          </nav>

          {/* Right Action Items (Language Toggle & Dropdowns) */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Toggle Button */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              {lang === 'en' ? '🇳🇵 Nepali' : '🇬🇧 English'}
            </button>
            
            {/* Login Dropdown */}
            <div className="relative" ref={loginRef}>
              <button
                onClick={() => { setLoginOpen(!loginOpen); setRegisterOpen(false); }}
                className="px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center space-x-1.5 border border-emerald-200/60"
              >
                <span>👤</span>
                <span>{t.loginDropdown}</span>
                <span className="text-xs">▼</span>
              </button>

              {loginOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <a
                    href="/user/login"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 font-medium transition-colors"
                  >
                    👤 {t.loginUser}
                  </a>
                  <a
                    href="/hospital/login"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 font-medium transition-colors"
                  >
                    🏥 {t.loginHospital}
                  </a>
                </div>
              )}
            </div>

            {/* Register Dropdown */}
            <div className="relative" ref={registerRef}>
              <button
                onClick={() => { setRegisterOpen(!registerOpen); setLoginOpen(false); }}
                className="px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
              >
                <span>📝</span>
                <span>{t.registerDropdown}</span>
                <span className="text-xs">▼</span>
              </button>

              {registerOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <a
                    href="/user/register"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 font-medium transition-colors"
                  >
                    👤 {t.registerUser}
                  </a>
                  <a
                    href="/hospital/register"
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 font-medium transition-colors"
                  >
                    🏥 {t.registerHospital}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu & Language Button Bar */}
          <div className="flex items-center space-x-2 lg:hidden">
            <button
              onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              {lang === 'en' ? '🇳🇵 Nepali' : '🇬🇧 English'}
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none"
              aria-label="Toggle Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-2 text-base font-medium text-slate-700">
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t.navAbout}
              </a>
              <a 
                href="#services" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t.navServices}
              </a>
              <a 
                href="#hospitals" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t.navHospitals}
              </a>
              <a 
                href="#contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                {t.navContact}
              </a>
            </nav>
            <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Login Options</div>
              <a
                href="/user/login"
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>👤</span>
                <span>{t.loginUser}</span>
              </a>
              <a
                href="/hospital/login"
                className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>🏥</span>
                <span>{t.loginHospital}</span>
              </a>

              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 pt-2">Register Options</div>
              <a
                href="/user/register"
                className="w-full px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all flex items-center space-x-2 shadow-sm"
              >
                <span>📝</span>
                <span>{t.registerUser}</span>
              </a>
              <a
                href="/hospital/register"
                className="w-full px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center space-x-2"
              >
                <span>🏥</span>
                <span>{t.registerHospital}</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-block px-3 sm:px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] sm:text-xs font-semibold uppercase tracking-widest mb-6 border border-emerald-500/30">
              {t.badge}
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              {t.heroTitle}
            </h1>
            <p className="text-base sm:text-xl text-slate-300 mb-8 sm:mb-10 leading-relaxed font-light">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/user/register"
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all text-center text-sm sm:text-base"
              >
                {t.getStartedCitizen}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SYSTEM SECTION */}
      <section id="about" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t.aboutTitle}</h2>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight mb-6">
                {t.aboutHeading}
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 text-sm sm:text-base">
                {t.aboutDesc}
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mt-0.5 shrink-0">✓</div>
                  <p className="text-sm text-slate-700">{t.bullet1}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mt-0.5 shrink-0">✓</div>
                  <p className="text-sm text-slate-700">{t.bullet2}</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mt-0.5 shrink-0">✓</div>
                  <p className="text-sm text-slate-700">{t.bullet3}</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video lg:aspect-square rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80"
                  alt="Modern Hospital Infrastructure"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services" className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t.coreModules}</h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t.modulesHeading}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-6">📅</div>
              <h4 className="text-lg font-bold text-slate-900 mb-3">{t.opdTitle}</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{t.opdDesc}</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-6">⏳</div>
              <h4 className="text-lg font-bold text-slate-900 mb-3">{t.queueTitle}</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{t.queueDesc}</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-6">✨</div>
              <h4 className="text-lg font-bold text-slate-900 mb-3">{t.convenienceTitle}</h4>
              <p className="text-slate-600 text-sm leading-relaxed">{t.convenienceDesc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED HOSPITALS SECTION */}
      <section id="hospitals" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">{t.networkTitle}</h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{t.networkHeading}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Hospital 1 */}
            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60 flex flex-col">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=80"
                  alt="Central Teaching Hospital"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t.hosp1Type}</span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1 mb-2">{t.hosp1Name}</h4>
                  <p className="text-slate-600 text-sm">{t.hosp1Desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="text-emerald-600 font-semibold">{t.online247}</span>
                  <span>Kathmandu Valley</span>
                </div>
              </div>
            </div>

            {/* Hospital 2 */}
            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60 flex flex-col">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80"
                  alt="Regional Medical Center"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t.hosp2Type}</span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1 mb-2">{t.hosp2Name}</h4>
                  <p className="text-slate-600 text-sm">{t.hosp2Desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="text-emerald-600 font-semibold">{t.online247}</span>
                  <span>Western Sector</span>
                </div>
              </div>
            </div>

            {/* Hospital 3 */}
            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200/60 flex flex-col">
              <div className="h-48 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
                  alt="Community General Hospital"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">{t.hosp3Type}</span>
                  <h4 className="text-lg font-bold text-slate-900 mt-1 mb-2">{t.hosp3Name}</h4>
                  <p className="text-slate-600 text-sm">{t.hosp3Desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="text-emerald-600 font-semibold">{t.online247}</span>
                  <span>Southern Hub</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER & CONTACT SECTION */}
      <footer id="contact" className="bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
            
            {/* Col 1: Brand info */}
            <div className="lg:col-span-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  🏥
                </div>
                <span className="text-lg font-bold text-white tracking-tight">e-Swasthya</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {t.heroSubtitle}
              </p>
              <p className="text-xs text-slate-500">
                {t.emergencyDesk} <br />
                <strong className="text-emerald-400 text-sm">1115 / 01-5900000</strong>
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="lg:col-span-3">
              <h5 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">{t.quickLinks}</h5>
              <ul className="space-y-2.5 text-sm">
                <li><a href="#about" className="hover:text-white transition-colors">{t.navAbout}</a></li>
                <li><a href="#services" className="hover:text-white transition-colors">{t.navServices}</a></li>
                <li><a href="#hospitals" className="hover:text-white transition-colors">{t.navHospitals}</a></li>
              </ul>
            </div>

            {/* Col 3: Portal Links */}
            <div className="lg:col-span-2">
              <h5 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Portals</h5>
              <ul className="space-y-2.5 text-sm">
                <li><a href="/user/login" className="hover:text-white transition-colors">👤 User Login</a></li>
                <li><a href="/hospital/login" className="hover:text-white transition-colors">🏥 Hospital Login</a></li>
              </ul>
            </div>

            {/* Col 4: Contact Section */}
            <div className="lg:col-span-3 bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60">
              <h5 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">{t.contactSectionTitle}</h5>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start space-x-2 text-slate-300">
                  <span className="text-emerald-400 font-semibold">📧</span>
                  <div>
                    <span className="block text-xs text-slate-400">Email</span>
                    <a href="mailto:nahs-info@gmail.com" className="text-emerald-400 hover:underline font-medium break-all">
                      nahs-info@gmail.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start space-x-2 text-slate-300">
                  <span className="text-emerald-400 font-semibold">📞</span>
                  <div>
                    <span className="block text-xs text-slate-400">Phone</span>
                    <span>{t.phoneValue}</span>
                  </div>
                </li>
                <li className="flex items-start space-x-2 text-slate-300">
                  <span className="text-emerald-400 font-semibold">📍</span>
                  <div>
                    <span className="block text-xs text-slate-400">Address</span>
                    <span>{t.addressValue}</span>
                  </div>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <div>&copy; {new Date().getFullYear()} National Health Access System (e-Swasthya). {t.rights}</div>
            
            {/* HIDDEN ADMIN LINK LOCATION:
              Located right inside the copyright bar below. It's styled with a tiny, non-distracting dot/lock character 
              (`•` turning into a subtle `🔒` on hover) that blends seamlessly with the text so ordinary users 
              and hospitals won't notice it. Link directs to `/admin/login`.
            */}
            <div className="mt-4 sm:mt-0 flex items-center space-x-1">
              <span>System Operational</span>
              <a 
                href="/admin/login" 
                className="text-slate-700 hover:text-emerald-500 transition-colors px-1 text-[10px]" 
                title="System Portal"
              >
                🔒
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}