/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Ding-dong chime generator
export function playChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First note (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    
    // Second note (C5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, ctx.currentTime + 0.25); // C5
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
    
    // Connections
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.85);
  } catch (e) {
    console.warn('Audio context failed or blocked by browser policy:', e);
  }
}

// Speak queue ticket using Web Speech API with an extremely robust online Brazilian Portuguese TTS fallback for Smart TVs and restricted environments
export function speakTicket(code: any, guicheNumber: number, vocalizeAllLetters: boolean = true) {
  if (!code) {
    console.warn('speakTicket called with empty code');
    return;
  }

  // Robust parsing in case an object with property "code" is passed
  let cleanCode = '';
  if (typeof code === 'string') {
    cleanCode = code;
  } else if (typeof code === 'object' && code !== null) {
    cleanCode = code.code || '';
  }

  if (!cleanCode) {
    console.warn('Could not extract ticket code from provided parameter:', code);
    return;
  }

  // Format the text in Portuguese for natural speaking:
  // e.g. "Senha A 0 1 4, Guichê 1"
  const letter = cleanCode.charAt(0);
  const numbers = cleanCode.substring(2);
  const formattedNumbers = numbers.split('').join(' ');
  
  const textToSpeak = `Senha, ${letter} ${vocalizeAllLetters ? formattedNumbers : parseInt(numbers)}, no guichê ${guicheNumber}`;

  // Local helper to play high-quality Portuguese TTS online stream (perfect for Smart TVs)
  const playOnlineTTSFallback = () => {
    try {
      console.log('Using high-quality online Portuguese TTS fallback for speech...');
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encodeURIComponent(textToSpeak)}`;
      const audio = new Audio(url);
      audio.play().catch(err => {
        console.warn('Online TTS fallback playback failed/blocked by autoplay policy:', err);
      });
    } catch (e) {
      console.error('Critical audio fallback generation failure:', e);
    }
  };

  // 1. Detect if we are on a Smart TV using common user agent tokens
  const ua = (navigator.userAgent || '').toLowerCase();
  const isSmartTV = ua.includes('smarttv') || 
                    ua.includes('smart-tv') || 
                    ua.includes('tizen') || 
                    ua.includes('webos') || 
                    ua.includes('netcast') || 
                    ua.includes('viera') || 
                    ua.includes('opera tv') || 
                    ua.includes('playstation') || 
                    ua.includes('xbox') || 
                    ua.includes('appletv') || 
                    ua.includes('googletv') || 
                    ua.includes('hbbtv') ||
                    ua.includes('sonyhdmi') ||
                    ua.includes('tv browser');

  // Smart TVs usually have completely empty local voices or no local synthesis. Force online TTS on them.
  if (isSmartTV) {
    console.log('Smart TV detected. Directing to online TTS streaming...');
    playOnlineTTSFallback();
    return;
  }

  // 2. Check if Web Speech API is present in the browser
  if (!('speechSynthesis' in window)) {
    console.log('Web Speech API not supported on this browser. Falling back to online TTS...');
    playOnlineTTSFallback();
    return;
  }
  
  try {
    // Cancel any active speech to avoid overlays
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05; // Slightly faster for responsiveness
    utterance.pitch = 1.0;
    
    // Check if we can find a Brazilian/Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => {
      const l = v.lang.toLowerCase().replace('_', '-');
      return l.startsWith('pt-br') || l.startsWith('pt');
    });

    // If no Portuguese voice is installed/available, fall back to online TTS
    if (!ptVoice) {
      console.log('No Portuguese voice installed/found on local OS. Streaming high-quality fallback...');
      playOnlineTTSFallback();
      return;
    }

    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    // Set up a safety timeout: if speech fails or remains stuck, run the fallback
    let isSpeakingOrFinished = false;
    utterance.onstart = () => {
      isSpeakingOrFinished = true;
    };
    utterance.onend = () => {
      isSpeakingOrFinished = true;
    };
    utterance.onerror = (evt) => {
      console.warn('Speech synthesis triggered an error event:', evt);
      if (!isSpeakingOrFinished) {
        isSpeakingOrFinished = true;
        playOnlineTTSFallback();
      }
    };

    // If speech doesn't start in 1 second, it might be a silent failure of Synthesis (very common in cheap tablets/TVs)
    setTimeout(() => {
      if (!isSpeakingOrFinished) {
        console.warn('Local SpeechSynthesis is stalling. Falling back to online TTS...');
        window.speechSynthesis.cancel();
        playOnlineTTSFallback();
      }
    }, 1200);
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis initiation failed. Resorting to online streaming:', e);
    playOnlineTTSFallback();
  }
}
