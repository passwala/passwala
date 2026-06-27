import React, { useState, useEffect, useRef, useCallback } from 'react';
import './OnboardingWizard.css';

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    mascotMood: 'wave',
    question: "yo, welcome to Passwala! 🔥",
    subtitle: "ur neighbourhood super-app just dropped. let's vibe fr fr 🫡",
    type: 'info',
    cta: "let's go bestie →",
  },
  {
    id: 'use_for',
    mascotMood: 'think',
    question: "what you here for? no cap 👀",
    subtitle: 'pick all that hit different',
    type: 'multi_card',
    options: [
      { id: 'rides',    emoji: '🚗', label: 'City Rides',      sub: 'drop off szn' },
      { id: 'events',   emoji: '🎟️', label: 'Events',          sub: 'main character era' },
      { id: 'shopping', emoji: '🛍️', label: 'Near Shops',      sub: 'treat yourself bestie' },
      { id: 'services', emoji: '🔧', label: 'Home Services',   sub: 'adulting unlocked' },
      { id: 'community', emoji: '💬', label: 'Community',       sub: 'vibe with neighbors' },
    ],
  },
  {
    id: 'vibe',
    mascotMood: 'happy',
    question: "what's ur vibe rn? ✨",
    subtitle: 'we stan personalisation',
    type: 'single_card',
    options: [
      { id: 'quick', emoji: '⚡', label: 'Fast mode',    sub: 'no time to waste fr' },
      { id: 'rich',  emoji: '🌟', label: 'Explore mode', sub: 'all the features bestie' },
      { id: 'deals', emoji: '🏷️', label: 'Deal hunter',  sub: 'slay + save era' },
    ],
  },
  {
    id: 'language',
    mascotMood: 'speak',
    question: "what's ur language? 🗣️",
    subtitle: "we talk local, select ur vibe",
    type: 'single_card',
    options: [
      { id: 'en', emoji: '🇬🇧', label: 'English',            sub: 'global energy' },
      { id: 'hi', emoji: '🇮🇳', label: 'हिन्दी (Hindi)',       sub: 'desi vibe' },
      { id: 'gu', emoji: '🦁', label: 'ગુજરાતી (Gujarati)',   sub: 'ahmedabad pride' },
    ],
  },
  {
    id: 'theme',
    mascotMood: 'happy',
    question: "what's ur aesthetic? 🎨",
    subtitle: "customize how Passwala looks for u",
    type: 'single_card',
    options: [
      { id: 'dark',  emoji: '🌌', label: 'Midnight dark', sub: 'easy on the eyes' },
      { id: 'light', emoji: '☀️', label: 'Vivid light',  sub: 'clean & bright' },
      { id: 'cyber', emoji: '👾', label: 'Neon orange',   sub: 'cyberpunk vibe fr' },
    ],
  },
  {
    id: 'voice',
    mascotMood: 'speak',
    question: "want me to talk? 🔊",
    subtitle: "i can literally narrate ur life (app updates ofc)",
    type: 'voice_toggle',
  },
  {
    id: 'notifications',
    mascotMood: 'happy',
    question: "stay in the loop? 🔔",
    subtitle: "get high-key order updates & local deals",
    type: 'single_card',
    options: [
      { id: 'whatsapp', emoji: '💬', label: 'WhatsApp alerts', sub: 'fast & direct fr' },
      { id: 'push',     emoji: '📱', label: 'Push notifications', sub: 'sleek popups bestie' },
      { id: 'silent',   emoji: '📴', label: 'Silent mode', sub: 'lowkey, check when i want' },
    ],
  },
  {
    id: 'done',
    mascotMood: 'celebrate',
    question: "ur all set bestie!! 🎉",
    subtitle: "Passwala just got customised for YOU. it's giving main character.",
    type: 'done',
    cta: 'Start exploring 🚀',
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
    if (current.type === 'multi_card') setSelected(Array.isArray(saved) ? saved : []);
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
      setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
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
              {['🛍️ Shopping', '🚗 Rides', '🎟️ Events', '🔧 Services', '💬 Community'].map(c => (
                <span key={c} className="onb-pill">{c}</span>
              ))}
            </div>
          )}

          {(current.type === 'single_card' || current.type === 'multi_card') && (
            <div className="onb-grid onb-grid-2">
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
                    <div className="onb-v-label">voice {voiceOn ? 'ON 🔊' : 'OFF 🔇'}</div>
                    <div className="onb-v-sub">{voiceOn ? "giving podcast energy rn" : "silent mode, lowkey"}</div>
                  </div>
                  <button
                    className={`onb-toggle ${voiceOn ? 'ton' : ''}`}
                    onClick={() => { const n = !voiceOn; setVoiceOn(n); if (n) speak("voice mode on bestie!"); else window.speechSynthesis?.cancel(); }}
                  >
                    <span className="onb-knob" />
                  </button>
                </div>
              </div>
              <div className="onb-grid onb-grid-2">
                <button className={`onb-card-opt ${!voiceOn ? 'onb-selected' : ''}`} onClick={() => { setVoiceOn(false); window.speechSynthesis?.cancel(); }}>
                  <span className="onb-opt-emoji">🔇</span>
                  <span className="onb-opt-label">Silent</span>
                  <span className="onb-opt-sub">lowkey vibes</span>
                </button>
                <button className={`onb-card-opt ${voiceOn ? 'onb-selected' : ''}`} onClick={() => { setVoiceOn(true); speak("voice mode!"); }}>
                  <span className="onb-opt-emoji">🔊</span>
                  <span className="onb-opt-label">Voice On</span>
                  <span className="onb-opt-sub">podcast mode</span>
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
                welcome to the squad,{' '}
                <span className="onb-name-hl">{user?.displayName?.split(' ')[0] || 'bestie'}</span>! 🙌
                <br /><span className="onb-done-sub">it's giving personalised Passwala energy ngl</span>
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
