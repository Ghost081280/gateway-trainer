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
        this.currentAudio = new Audio(audioUrl);
        this.isPlaying = true;
        
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isPlaying = false;
          
          // Notify that speaking ended
          if (this.onSpeakingEnd) {
            this.onSpeakingEnd();
          }
          
          resolve();
        };
        
        this.currentAudio.onerror = (error) => {
          console.warn('Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isPlaying = false;
          
          if (this.onSpeakingEnd) {
            this.onSpeakingEnd();
          }
          
          resolve();
        };
        
        // Lower binaural beat volume while speaking
        const originalVolume = binauralBeats.getVolume();
        binauralBeats.setVolume(originalVolume * 0.3);
        
        this.currentAudio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
          this.isPlaying = false;
          
          // Restore binaural beat volume
          binauralBeats.setVolume(originalVolume);
          
          if (this.onSpeakingEnd) {
            this.onSpeakingEnd();
          }
          
          resolve();
        };
        
        this.currentAudio.play().catch((error) => {
          console.warn('Failed to play audio:', error);
          this.isPlaying = false;
          binauralBeats.setVolume(originalVolume);
          
          if (this.onSpeakingEnd) {
            this.onSpeakingEnd();
          }
          
          resolve();
        });
      });
    } catch (error) {
      console.warn('Voice output error:', error);
      
      if (this.onSpeakingEnd) {
        this.onSpeakingEnd();
      }
    }
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
}

// Create global instance
const voiceOutput = new VoiceOutput();
