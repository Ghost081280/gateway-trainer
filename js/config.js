// Gateway Trainer Configuration
// ================================

const CONFIG = {
  // Cloudflare Worker URL (proxies OpenAI API)
  WORKER_URL: 'https://gateway-trainer.andrew-w-couch.workers.dev',
  
  // Voice settings
  VOICE: {
    outputEnabled: true,    // AI speaks responses
    inputEnabled: true,     // User speaks impressions
    speed: 0.95             // TTS speed: 0.8 = slow, 1.0 = normal
  },
  
  // Premium features (all free in V1, flip these to paywall later)
  PREMIUM: {
    voiceOutput: true,      // Set false to disable AI voice for free tier
    voiceInput: true        // Set false to disable mic input for free tier
  },
  
  // Binaural beat settings
  AUDIO: {
    defaultVolume: 0.7,     // 0-1
    carrierFrequency: 200,  // Hz (base frequency)
    fadeInTime: 3,          // seconds
    fadeOutTime: 3          // seconds
  },
  
  // Focus levels (Monroe Institute terminology)
  FOCUS_LEVELS: {
    10: { 
      name: 'Focus 10', 
      beatFreq: 10, 
      description: 'Mind Awake, Body Asleep',
      brainwave: 'Alpha'
    },
    12: { 
      name: 'Focus 12', 
      beatFreq: 7, 
      description: 'Expanded Awareness',
      brainwave: 'Theta'
    },
    15: { 
      name: 'Focus 15', 
      beatFreq: 5, 
      description: 'No Time',
      brainwave: 'Theta'
    },
    21: { 
      name: 'Focus 21', 
      beatFreq: 4, 
      description: 'The Bridge',
      brainwave: 'Theta/Delta'
    }
  },
  
  // Session defaults
  DEFAULTS: {
    focusLevel: 10,
    targetCount: 5,
    trainingDuration: 10,     // minutes
    explorationDuration: 20,  // minutes
    quickDuration: 10         // minutes
  },
  
  // Voice input settings
  SPEECH: {
    silenceDelay: 1500,       // ms of silence before phrase is considered complete
    language: 'en-US'
  }
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.VOICE);
Object.freeze(CONFIG.PREMIUM);
Object.freeze(CONFIG.AUDIO);
Object.freeze(CONFIG.FOCUS_LEVELS);
Object.freeze(CONFIG.DEFAULTS);
Object.freeze(CONFIG.SPEECH);
