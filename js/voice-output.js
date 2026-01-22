// Gateway Trainer - Voice Output (TTS)
// =====================================
// Calls Cloudflare Worker which proxies to OpenAI TTS API
// Uses "spruce" voice for calm, meditative guidance

class VoiceOutput {
  constructor() {
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    this.enabled = true;
    this.onSpeakingStart = null;
    this.onSpeakingEnd = null;
    
    // Mobile audio unlock state
    this.audioUnlocked = false;
    this.audioContext = null;
    
    // Bind the unlock method so we can remove the listener later
    this._unlockAudio = this._unlockAudio.bind(this);
    
    // Setup mobile audio unlock on first user interaction
    this._setupMobileUnlock();
  }
  
  // Setup listeners to unlock audio on mobile
  _setupMobileUnlock() {
    const events = ['touchstart', 'touchend', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, this._unlockAudio, { once: false, passive: true });
    });
  }
  
  // Unlock audio context for mobile browsers
  async _unlockAudio() {
    if (this.audioUnlocked) return;
    
    try {
      // Create AudioContext if needed (for iOS Safari)
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
        }
      }
      
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create and play a silent audio to unlock
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+xBkAA/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
      silentAudio.volume = 0.01;
      
      const playPromise = silentAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
        silentAudio.pause();
        silentAudio.remove();
      }
      
      this.audioUnlocked = true;
      console.log('Audio unlocked for mobile playback');
      
      // Remove listeners once unlocked
      const events = ['touchstart', 'touchend', 'click', 'keydown'];
      events.forEach(event => {
        document.removeEventListener(event, this._unlockAudio);
      });
      
    } catch (error) {
      // Silent fail - will try again on next interaction
      console.log('Audio unlock pending...');
    }
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
    
    // Ensure audio is unlocked on mobile
    if (!this.audioUnlocked) {
      await this._unlockAudio();
    }
    
    try {
      // Notify that speaking is starting
      if (this.onSpeakingStart) {
        this.onSpeakingStart();
      }
      
      const response = await fetch(`${CONFIG.WORKER_URL}/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          speed: CONFIG.VOICE.speed
        })
      });
      
      if (!response.ok) {
        console.warn('Voice output unavailable:', response.status);
        if (this.onSpeakingEnd) {
          this.onSpeakingEnd();
        }
        return;
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return new Promise((resolve) => {
        this.currentAudio = new Audio();
        
        // Set properties before setting src (important for mobile)
        this.currentAudio.preload = 'auto';
        this.currentAudio.playsinline = true;
        this.currentAudio.setAttribute('playsinline', '');
        this.currentAudio.setAttribute('webkit-playsinline', '');
        
        // Store original volume for restoration
        const originalVolume = binauralBeats.getVolume();
        
        // Setup event handlers before setting src
        this.currentAudio.oncanplaythrough = () => {
          // Lower binaural beat volume while speaking
          binauralBeats.setVolume(originalVolume * 0.3);
          this.isPlaying = true;
          
          // Play with promise handling for mobile
          const playPromise = this.currentAudio.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('Audio playback started');
              })
              .catch((error) => {
                console.warn('Audio play failed:', error);
                this._handlePlaybackError(originalVolume, audioUrl, resolve);
              });
          }
        };
        
        this.currentAudio.onended = () => {
          this._cleanupAudio(originalVolume, audioUrl, resolve);
        };
        
        this.currentAudio.onerror = (error) => {
          console.warn('Audio error:', error);
          this._handlePlaybackError(originalVolume, audioUrl, resolve);
        };
        
        // Handle stalled/stuck audio (common on mobile)
        this.currentAudio.onstalled = () => {
          console.warn('Audio stalled, attempting recovery...');
        };
        
        // Set source last (after all handlers are attached)
        this.currentAudio.src = audioUrl;
        this.currentAudio.load();
        
        // Fallback timeout in case audio never plays (mobile issue)
        setTimeout(() => {
          if (this.isPlaying && this.currentAudio) {
            // Check if audio is actually progressing
            if (this.currentAudio.currentTime === 0 && !this.currentAudio.paused) {
              console.warn('Audio not progressing, forcing cleanup');
              this._handlePlaybackError(originalVolume, audioUrl, resolve);
            }
          }
        }, 10000); // 10 second timeout
      });
      
    } catch (error) {
      console.warn('Voice output error:', error);
      
      if (this.onSpeakingEnd) {
        this.onSpeakingEnd();
      }
    }
  }
  
  // Clean up after successful playback
  _cleanupAudio(originalVolume, audioUrl, resolve) {
    URL.revokeObjectURL(audioUrl);
    this.currentAudio = null;
    this.isPlaying = false;
    
    // Restore binaural beat volume
    binauralBeats.setVolume(originalVolume);
    
    if (this.onSpeakingEnd) {
      this.onSpeakingEnd();
    }
    
    resolve();
  }
  
  // Handle playback errors
  _handlePlaybackError(originalVolume, audioUrl, resolve) {
    URL.revokeObjectURL(audioUrl);
    this.currentAudio = null;
    this.isPlaying = false;
    
    // Restore binaural beat volume
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
      // Small pause between phrases
      await this.delay(300);
    }
  }
  
  // Stop current playback
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
      this.isPlaying = false;
      
      if (this.onSpeakingEnd) {
        this.onSpeakingEnd();
      }
    }
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
  
  // Check if audio is likely to work (for UI feedback)
  isAudioSupported() {
    return !!(window.Audio && (window.AudioContext || window.webkitAudioContext));
  }
  
  // Manual unlock trigger (can be called from a button if needed)
  async manualUnlock() {
    await this._unlockAudio();
    return this.audioUnlocked;
  }
}

// Create global instance
const voiceOutput = new VoiceOutput();
