import React, { useState, useEffect, useRef, useCallback } from 'react';
import './OnboardingWizard.css';

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    mascotMood: 'wave',
    question: "Welcome to Passwala! 🔥",
    subtitle: "Your neighbourhood super-app — shop, ride, explore and connect, all in one place.",
    type: 'info',
    cta: "Get Started →",
  },
  {
    id: 'use_for',
    mascotMood: 'think',
    question: "What are you looking for?",
    subtitle: 'Pick everything that applies to you',
    type: 'multi_card',
    options: [
      // { id: 'rides',     emoji: '🛵', label: 'City Rides',     sub: 'Quick rides around the city' },
      { id: 'events',    emoji: '🎟️', label: 'Events',          sub: 'Local events & city experiences' },
      { id: 'sports',    emoji: '⚽', label: 'Sports Venues',   sub: 'Book play areas & sports slots' },
      // { id: 'shopping',  emoji: '🛍️', label: 'Near Shops',     sub: 'Shop from stores near you' },
      // { id: 'services',  emoji: '🔧', label: 'Home Services',  sub: 'Professionals at your doorstep' },
      // { id: 'community', emoji: '💬', label: 'Community',      sub: 'Connect with your neighbours' },
    ],
  },
  {
    id: 'vibe',
    mascotMood: 'happy',
    question: "How do you like to explore?",
    subtitle: 'Choose the experience that suits you',
    type: 'single_card',
    options: [
      { id: 'quick', emoji: '⚡', label: 'Fast & Simple',  sub: 'Quick access to what you need' },
      { id: 'rich',  emoji: '🌟', label: 'Full Experience', sub: 'Explore all features in detail' },
      { id: 'deals', emoji: '🏷️', label: 'Deal Finder',    sub: 'Always looking for the best price' },
    ],
  },
  {
    id: 'language',
    mascotMood: 'speak',
    question: "Select your preferred language",
    subtitle: "Choose the language you are most comfortable with",
    type: 'single_card',
    options: [
      { id: 'en', emoji: '🇬🇧', label: 'English',            sub: 'International language' },
      { id: 'hi', emoji: '🇮🇳', label: 'हिन्दी (Hindi)',       sub: 'Most spoken in India' },
      { id: 'gu', emoji: '🦁', label: 'ગુજરાતી (Gujarati)',   sub: 'Local language of Ahmedabad' },
    ],
  },
  {
    id: 'theme',
    mascotMood: 'happy',
    question: "Choose your app theme",
    subtitle: "Pick how Passwala looks on your device",
    type: 'single_card',
    options: [
      { id: 'dark',  emoji: '🌌', label: 'Dark Mode',    sub: 'Easy on the eyes at night' },
      { id: 'light', emoji: '☀️', label: 'Light Mode',   sub: 'Bright and clean interface' },
      { id: 'cyber', emoji: '👾', label: 'Neon Orange',  sub: 'Bold, high-energy look' },
    ],
  },
  {
    id: 'voice',
    mascotMood: 'speak',
    question: "Enable voice announcements?",
    subtitle: "Get spoken updates for orders and important alerts",
    type: 'voice_toggle',
  },
  {
    id: 'notifications',
    mascotMood: 'happy',
    question: "How should we notify you?",
    subtitle: "Stay updated with order status and local offers",
    type: 'single_card',
    options: [
      { id: 'whatsapp', emoji: '💬', label: 'WhatsApp Alerts',      sub: 'Instant messages on WhatsApp' },
      { id: 'push',     emoji: '📱', label: 'Push Notifications',   sub: 'Pop-ups directly on your phone' },
      { id: 'silent',   emoji: '📴', label: 'Silent Mode',          sub: 'No alerts — I will check manually' },
    ],
  },
  {
    id: 'done',
    mascotMood: 'celebrate',
    question: "You are all set! 🎉",
    subtitle: "Passwala has been personalised for you. Welcome to your neighbourhood super-app.",
    type: 'done',
    cta: 'Start Exploring →',
  },
];

const MASCOT_EMOJI = {
  wave:      '👋',
  think:     '🤔',
  map:       '📍',
  happy:     '😎',
  speak:     '🎙️',
  celebrate: '🥳',
};

// ─── TTS helper ───────────────────────────────────────────────────────────────
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-IN'; utt.rate = 0.95; utt.pitch = 1.1;
    window.speechSynthesis.speak(utt);
  } catch (_) {}
}

const OnboardingWizard = ({ user, onComplete }) => {

  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState({});
  const [selected, setSelected]   = useState([]);
  const [voiceOn, setVoiceOn]     = useState(false);
  const [animDir, setAnimDir]     = useState('enter');
  const [visible, setVisible]     = useState(true);
  const [mascotAnim, setMascotAnim] = useState('pop');
  const transRef = useRef(false);

  const current = STEPS[step];

  useEffect(() => {
    if (voiceOn) speak(current.question);
    setMascotAnim('pop');
    const t = setTimeout(() => setMascotAnim('float'), 700);
    return () => clearTimeout(t);
  }, [step, voiceOn]);

  useEffect(() => {
    const saved = answers[current.id];
    if (current.type === 'multi_card') {
      // Pre-select ALL options by default; restore saved selection if returning to this step
      const allIds = current.options.map(o => o.id);
      setSelected(Array.isArray(saved) && saved.length > 0 ? saved : allIds);
    }
    else if (current.type === 'single_card') setSelected(saved ? [saved] : []);
    else setSelected([]);
  }, [step]);

  const goTo = useCallback((target, newAns) => {
    if (transRef.current) return;
    transRef.current = true;
    setAnimDir('exit'); setVisible(false);
    setTimeout(() => {
      setAnswers(newAns); setStep(target);
      setAnimDir('enter'); setVisible(true);
      transRef.current = false;
    }, 300);
  }, []);

  const toggleCard = (id) => {
    if (current.type === 'multi_card') {
      // Cards cannot be unselected — only add, never remove
      setSelected(p => p.includes(id) ? p : [...p, id]);
    } else { setSelected([id]); }
  };

  const handleSkip = () => {
    try {
      localStorage.setItem('passwala_onboarding_done', 'true');
    } catch (_) {}
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    onComplete(answers);
  };

  const handleContinue = () => {
    const newAns = { ...answers };
    if (current.type === 'multi_card')   newAns[current.id] = selected;
    if (current.type === 'single_card')  newAns[current.id] = selected[0];
    if (current.type === 'voice_toggle') newAns.voice = voiceOn;

    if (step < STEPS.length - 1) { goTo(step + 1, newAns); }
    else {
      try {
        localStorage.setItem('passwala_onboarding_done', 'true');
        localStorage.setItem('passwala_onboarding_prefs', JSON.stringify(newAns));
      } catch (_) {}
      if (voiceOn) window.speechSynthesis?.cancel();
      onComplete(newAns);
    }
  };

  const canContinue =
    current.type === 'info'         ? true :
    current.type === 'done'         ? true :
    current.type === 'voice_toggle' ? true :
    selected.length > 0;

  const totalMiddle = STEPS.length - 2;

  return (
    <div className="onb-overlay">
      {/* Decorative blobs */}
      <div className="onb-blob onb-blob-1" />
      <div className="onb-blob onb-blob-2" />
      <div className="onb-blob onb-blob-3" />

      <div className={`onb-card ${visible ? `onb-${animDir}` : 'onb-hidden'}`}>

        {/* Top bar */}
        <div className="onb-topbar">
          {step > 0 && step < STEPS.length - 1
            ? <button className="onb-back" onClick={() => goTo(step - 1, answers)} title="Go back">←</button>
            : <span className="onb-back onb-invis" />
          }
          <div className="onb-prog-track">
            {Array.from({ length: totalMiddle }).map((_, i) => (
              <div key={i} className={`onb-prog-seg ${i < step - 1 ? 'done' : i === step - 1 ? 'active' : ''}`} />
            ))}
          </div>
          <div className="onb-top-actions">
            {voiceOn && (
              <button className="onb-vol-btn" onClick={() => speak(current.question)} title="Speak question">🔊</button>
            )}
            <button className="onb-close-btn" onClick={handleSkip} title="Skip onboarding">×</button>
          </div>
        </div>

        {/* Mascot */}
        <div className={`onb-mascot onb-mascot-${mascotAnim}`}>
          <div className="onb-gem">
            <span className="onb-gem-emoji">{MASCOT_EMOJI[current.mascotMood]}</span>
          </div>
          {current.type === 'done' && <div className="onb-gem-glow" />}
        </div>

        {/* Question */}
        <div className="onb-qblock">
          <h2 className="onb-q">{current.question}</h2>
          {current.subtitle && <p className="onb-sub">{current.subtitle}</p>}
        </div>

        {/* Body */}
        <div className="onb-body">

          {current.type === 'info' && (
            <div className="onb-pills">
              {/* Hidden features: 'show event and sport other all feature hide, not a remove' */}
              {/* <span className="onb-pill">🛍️ Shopping</span> */}
              {/* <span className="onb-pill">🛵 Rides</span> */}
              <span className="onb-pill">🎟️ Events</span>
              <span className="onb-pill">⚽ Sports</span>
              {/* <span className="onb-pill">🔧 Services</span> */}
              {/* <span className="onb-pill">💬 Community</span> */}
            </div>
          )}

          {(current.type === 'single_card' || current.type === 'multi_card') && (
            <div className={`onb-grid ${current.options.length === 3 ? 'onb-grid-3' : 'onb-grid-2'}`}>
              {current.options.map(opt => (
                <button
                  key={opt.id}
                  className={`onb-card-opt ${selected.includes(opt.id) ? 'onb-selected' : ''}`}
                  onClick={() => toggleCard(opt.id)}
                >
                  <span className="onb-opt-emoji">{opt.emoji}</span>
                  <span className="onb-opt-label">{opt.label}</span>
                  {opt.sub && <span className="onb-opt-sub">{opt.sub}</span>}
                  {selected.includes(opt.id) && <span className="onb-check-badge">✓</span>}
                </button>
              ))}
            </div>
          )}


          {current.type === 'voice_toggle' && (
            <div className="onb-voice-wrap">
              <div className={`onb-voice-card ${voiceOn ? 'v-on' : ''}`}>
                <div className="onb-voice-row">
                  <div>
                    <div className="onb-v-label">Voice {voiceOn ? 'ON 🔊' : 'OFF 🔇'}</div>
                    <div className="onb-v-sub">{voiceOn ? 'Spoken announcements are enabled' : 'All announcements are silent'}</div>
                  </div>
                  <button
                    className={`onb-toggle ${voiceOn ? 'ton' : ''}`}
                    onClick={() => { const n = !voiceOn; setVoiceOn(n); if (n) speak('Voice mode enabled'); else window.speechSynthesis?.cancel(); }}
                  >
                    <span className="onb-knob" />
                  </button>
                </div>
              </div>
              <div className="onb-grid onb-grid-2">
                <button className={`onb-card-opt ${!voiceOn ? 'onb-selected' : ''}`} onClick={() => { setVoiceOn(false); window.speechSynthesis?.cancel(); }}>
                  <span className="onb-opt-emoji">🔇</span>
                  <span className="onb-opt-label">Silent</span>
                  <span className="onb-opt-sub">No audio announcements</span>
                  {!voiceOn && <span className="onb-check-badge">✓</span>}
                </button>
                <button className={`onb-card-opt ${voiceOn ? 'onb-selected' : ''}`} onClick={() => { setVoiceOn(true); speak('Voice mode!'); }}>
                  <span className="onb-opt-emoji">🔊</span>
                  <span className="onb-opt-label">Voice On</span>
                  <span className="onb-opt-sub">Speak order & alert updates</span>
                  {voiceOn && <span className="onb-check-badge">✓</span>}
                </button>
              </div>
            </div>
          )}

          {current.type === 'done' && (
            <div className="onb-done-wrap">
              <div className="onb-confetti-row">
                {['🎉','✨','🔥','💫','🎊','⚡'].map((e, i) => (
                  <span key={i} className="onb-conf-piece" style={{ '--i': i }}>{e}</span>
                ))}
              </div>
              <p className="onb-done-text">
                Welcome,{' '}
                <span className="onb-name-hl">{user?.displayName?.split(' ')[0] || 'there'}</span>! 🙌
                <br /><span className="onb-done-sub">Passwala is now personalised just for you.</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="onb-footer">
          <button
            className={`onb-cta ${canContinue ? 'onb-cta-on' : 'onb-cta-off'}`}
            onClick={canContinue ? handleContinue : undefined}
            disabled={!canContinue}
          >
            {current.cta || 'continue →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
