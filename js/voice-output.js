// Gateway Trainer - Voice Output (TTS)
// =====================================
// Calls Cloudflare Worker which proxies to OpenAI TTS API
// Uses Web Audio API for better mobile compatibility

class VoiceOutput {
  constructor() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentSource = null;
    this.currentAudioElement = null; // Track HTML5 audio element
    this.audioContext = null;
    this.gainNode = null;
    this.enabled = true;
    this.onSpeakingStart = null;
    this.onSpeakingEnd = null;
    
    // Track unlock state
    this.audioUnlocked = false;
    
    // Track if we're in the middle of a speak operation
    this.speakingPromise = null;
    this.abortController = null;
    
    // Bind methods
    this._unlockAudio = this._unlockAudio.bind(this);
    
    // Setup mobile audio unlock
    this._setupMobileUnlock();
  }
  
  // Initialize Web Audio API context
  async _initAudioContext() {
    if (this.audioContext) return true;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.error('Web Audio API not supported');
        return false;
      }
      
      this.audioContext = new AudioContext();
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('Audio context initialized, state:', this.audioContext.state);
      return true;
    } catch (error) {
      console.error('Failed to init audio context:', error);
      return false;
    }
  }
  
  // Setup listeners to unlock audio on mobile
  _setupMobileUnlock() {
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    const handler = () => this._unlockAudio();
    events.forEach(event => {
      document.addEventListener(event, handler, { once: false, passive: true });
    });
    
    // Store for cleanup
    this._unlockHandler = handler;
    this._unlockEvents = events;
  }
  
  // Unlock audio context for mobile browsers
  async _unlockAudio() {
    if (this.audioUnlocked) return true;
    
    try {
      await this._initAudioContext();
      
      if (!this.audioContext) return false;
      
      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('Audio context resumed');
      }
      
      // Play a short silent buffer to fully unlock
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      
      this.audioUnlocked = true;
      console.log('Audio unlocked successfully, context state:', this.audioContext.state);
      
      // Remove listeners
      if (this._unlockHandler && this._unlockEvents) {
        this._unlockEvents.forEach(event => {
          document.removeEventListener(event, this._unlockHandler);
        });
      }
      
      return true;
    } catch (error) {
      console.warn('Audio unlock failed:', error);
      return false;
    }
  }
  
  // Stop any currently playing speech immediately
  stopCurrentSpeech() {
    console.log('Stopping current speech...');
    
    // Stop Web Audio source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // Already stopped
      }
      this.currentSource = null;
    }
    
    // Stop HTML5 Audio element
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
        this.currentAudioElement.src = '';
      } catch (e) {
        // Already stopped
      }
      this.currentAudioElement = null;
    }
    
    // Abort any pending fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    
    this.isPlaying = false;
  }
  
  // Speak text using OpenAI TTS via Cloudflare Worker
  async speak(text) {
    if (!this.enabled || !CONFIG.PREMIUM.voiceOutput) {
      console.log('Voice output disabled, text only:', text);
      return;
    }
    
    if (!text || text.trim() === '') {
      return;
    }
    
    console.log('TTS request for:', text.substring(0, 50) + '...');
    
    // CRITICAL: Stop any existing speech before starting new
    this.stopCurrentSpeech();
    
    // Ensure audio is ready
    const unlocked = await this._unlockAudio();
    if (!unlocked) {
      console.error('Could not unlock audio');
      return;
    }
    
    // Create new abort controller for this request
    this.abortController = new AbortController();
    
    try {
      // Notify that speaking is starting
      if (this.onSpeakingStart) {
        this.onSpeakingStart();
      }
      
      console.log('Fetching TTS from:', CONFIG.WORKER_URL + '/speech');
      
      const response = await fetch(`${CONFIG.WORKER_URL}/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          speed: CONFIG.VOICE.speed
        }),
        signal: this.abortController.signal
      });
      
      console.log('TTS response status:', response.status);
      console.log('TTS response type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API error:', response.status, errorText);
        if (this.onSpeakingEnd) {
          this.onSpeakingEnd();
        }
        return;
      }
      
      // Get the audio data as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      console.log('Received audio data, size:', arrayBuffer.byteLength, 'bytes');
      
      if (arrayBuffer.byteLength === 0) {
        console.error('Received empty audio data');
        if (this.onSpeakingEnd) {
          this.onSpeakingEnd();
        }
        return;
      }
      
      // Make sure context is running
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Decode the audio data
      console.log('Decoding audio...');
      
      let audioBuffer;
      try {
        audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
        console.log('Audio decoded successfully, duration:', audioBuffer.duration, 'seconds');
      } catch (decodeError) {
        console.error('Failed to decode audio:', decodeError);
        // Try alternative: use HTML5 Audio as fallback
        console.log('Attempting HTML5 Audio fallback...');
        await this._playWithHtmlAudio(arrayBuffer);
        return;
      }
      
      // Lower binaural beat volume while speaking
      const originalVolume = binauralBeats.getVolume();
      binauralBeats.setVolume(originalVolume * 0.3);
      
      return new Promise((resolve) => {
        // Create buffer source
        this.currentSource = this.audioContext.createBufferSource();
        this.currentSource.buffer = audioBuffer;
        this.currentSource.connect(this.gainNode);
        
        this.isPlaying = true;
        
        this.currentSource.onended = () => {
          console.log('TTS playback completed');
          this.currentSource = null;
          this.isPlaying = false;
          
          // Restore binaural beat volume
          binauralBeats.setVolume(originalVolume);
          
          if (this.onSpeakingEnd) {
            this.onSpeakingEnd();
          }
          
          resolve();
        };
        
        // Start playback
        console.log('Starting TTS playback...');
        this.currentSource.start(0);
      });
      
    } catch (error) {
      // Check if this was an abort
      if (error.name === 'AbortError') {
        console.log('TTS request was aborted');
        return;
      }
      
      console.error('Voice output error:', error);
      
      if (this.onSpeakingEnd) {
        this.onSpeakingEnd();
      }
    }
  }
  
  // Fallback: Play using HTML5 Audio element
  async _playWithHtmlAudio(arrayBuffer) {
    console.log('Using HTML5 Audio fallback');
    
    const originalVolume = binauralBeats.getVolume();
    binauralBeats.setVolume(originalVolume * 0.3);
    
    return new Promise((resolve) => {
      try {
        // Create blob from array buffer
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        const audio = new Audio();
        this.currentAudioElement = audio; // Track for cancellation
        audio.preload = 'auto';
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        
        audio.oncanplaythrough = () => {
          console.log('HTML5 Audio ready, playing...');
          audio.play().catch(e => {
            console.error('HTML5 Audio play failed:', e);
            this._cleanup(originalVolume, url, resolve);
          });
        };
        
        audio.onended = () => {
          console.log('HTML5 Audio playback completed');
          this.currentAudioElement = null;
          this._cleanup(originalVolume, url, resolve);
        };
        
        audio.onerror = (e) => {
          console.error('HTML5 Audio error:', e);
          this.currentAudioElement = null;
          this._cleanup(originalVolume, url, resolve);
        };
        
        this.isPlaying = true;
        audio.src = url;
        audio.load();
        
      } catch (error) {
        console.error('HTML5 Audio fallback failed:', error);
        this._cleanup(originalVolume, null, resolve);
      }
    });
  }
  
  // Cleanup helper
  _cleanup(originalVolume, url, resolve) {
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.isPlaying = false;
    this.currentAudioElement = null;
    binauralBeats.setVolume(originalVolume);
    if (this.onSpeakingEnd) {
      this.onSpeakingEnd();
    }
    resolve();
  }
  
  // Queue multiple texts to speak in sequence
  async speakQueue(texts) {
    for (const text of texts) {
      await this.speak(text);
      await this.delay(300);
    }
  }
  
  // Stop current playback (alias for stopCurrentSpeech)
  stop() {
    this.stopCurrentSpeech();
  }
  
  // Enable/disable voice output
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }
  
  // Check if currently speaking
  getIsSpeaking() {
    return this.isPlaying;
  }
  
  // Helper delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Manual unlock trigger (can be called from a button if needed)
  async manualUnlock() {
    return await this._unlockAudio();
  }
  
  // Get diagnostic info
  getDiagnostics() {
    return {
      audioUnlocked: this.audioUnlocked,
      contextState: this.audioContext ? this.audioContext.state : 'no context',
      isPlaying: this.isPlaying,
      enabled: this.enabled,
      premiumVoice: CONFIG.PREMIUM.voiceOutput
    };
  }
}

// Create global instance
const voiceOutput = new VoiceOutput();
