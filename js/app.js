// Gateway Trainer - Main Application Controller
// ==============================================
// Ties together all modules and handles UI interactions

class GatewayApp {
  constructor() {
    this.currentScreen = 'landing';
    this.voiceModeEnabled = true;
    this.isAISpeaking = false;
    this.sessionResult = null;
    
    // Training setup state
    this.trainingSetup = {
      duration: CONFIG.DEFAULTS.trainingDuration,
      targets: CONFIG.DEFAULTS.targetCount,
      focus: CONFIG.DEFAULTS.focusLevel
    };
    
    // Exploration setup state
    this.explorationSetup = {
      duration: CONFIG.DEFAULTS.explorationDuration,
      focus: CONFIG.DEFAULTS.focusLevel
    };
    
    // Quick setup state
    this.quickSetup = {
      duration: CONFIG.DEFAULTS.quickDuration,
      focus: CONFIG.DEFAULTS.focusLevel
    };
  }
  
  // Initialize the app
  init() {
    this.bindEvents();
    this.loadUserPreferences();
    this.updateUserStats();
    this.setupVoiceCallbacks();
    
    console.log('Gateway Trainer initialized');
  }
  
  // Bind all event listeners
  bindEvents() {
    // Mode card clicks
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        this.handleModeSelect(mode);
      });
    });
    
    // Back buttons
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        this.showScreen(target);
      });
    });
    
    // Option buttons (duration, targets, focus)
    document.querySelectorAll('.option-buttons').forEach(group => {
      group.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          // Remove active from siblings
          group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // Update state based on which setting
          const setting = group.dataset.setting;
          const value = parseInt(btn.dataset.value);
          this.handleOptionChange(setting, value);
        });
      });
    });
    
    // Focus cards for exploration
    document.querySelectorAll('.focus-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.focus-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.explorationSetup.focus = parseInt(card.dataset.value);
      });
    });
    
    // Voice mode toggle
    const voiceToggle = document.getElementById('toggle-voice');
    if (voiceToggle) {
      voiceToggle.addEventListener('change', () => {
        this.voiceModeEnabled = voiceToggle.checked;
      });
    }
    
    // Start buttons
    document.getElementById('btn-start-training')?.addEventListener('click', () => this.startTraining());
    document.getElementById('btn-start-exploration')?.addEventListener('click', () => this.startExploration());
    document.getElementById('btn-start-quick')?.addEventListener('click', () => this.startQuick());
    
    // Training session controls
    document.getElementById('btn-reveal')?.addEventListener('click', () => this.revealTarget());
    document.getElementById('btn-end-session')?.addEventListener('click', () => this.endSession());
    document.getElementById('btn-send-impression')?.addEventListener('click', () => this.sendTextImpression());
    document.getElementById('impression-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendTextImpression();
    });
    
    // Reveal screen controls
    document.getElementById('btn-next-target')?.addEventListener('click', () => this.nextTarget());
    document.getElementById('btn-end-from-reveal')?.addEventListener('click', () => this.endSession());
    
    // Summary screen controls
    document.getElementById('btn-share')?.addEventListener('click', () => this.shareResults());
    document.getElementById('btn-new-session')?.addEventListener('click', () => this.showScreen('training-setup'));
    document.getElementById('btn-home')?.addEventListener('click', () => this.showScreen('landing'));
    
    // Exploration controls
    document.getElementById('btn-exploration-pause')?.addEventListener('click', () => this.toggleExplorationPause());
    document.getElementById('btn-exploration-stop')?.addEventListener('click', () => this.endExploration());
    
    // Quick session controls
    document.getElementById('btn-quick-pause')?.addEventListener('click', () => this.toggleQuickPause());
    document.getElementById('btn-quick-stop')?.addEventListener('click', () => this.endQuick());
    
    // Journal controls
    document.getElementById('btn-save-journal')?.addEventListener('click', () => this.saveJournal());
    document.getElementById('btn-skip-journal')?.addEventListener('click', () => this.showScreen('landing'));
    
    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', () => this.showModal('settings'));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.hideModal('settings'));
    document.getElementById('btn-clear-data')?.addEventListener('click', () => this.clearData());
    
    // Settings inputs
    document.getElementById('setting-volume')?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      document.getElementById('volume-value').textContent = `${value}%`;
      binauralBeats.setVolume(value / 100);
      sessionManager.setPreference('volume', value / 100);
    });
    
    document.getElementById('setting-voice-output')?.addEventListener('change', (e) => {
      sessionManager.setPreference('voiceOutput', e.target.checked);
    });
    
    document.getElementById('setting-voice-input')?.addEventListener('change', (e) => {
      sessionManager.setPreference('voiceInput', e.target.checked);
    });
    
    document.getElementById('setting-carrier')?.addEventListener('change', (e) => {
      const value = parseInt(e.target.value);
      binauralBeats.setCarrierFrequency(value);
      sessionManager.setPreference('carrier', value);
    });
    
    // Headphone modal
    document.getElementById('btn-headphones-confirm')?.addEventListener('click', () => {
      this.hideModal('headphones');
      this.proceedAfterHeadphoneWarning();
    });
    document.getElementById('btn-headphones-cancel')?.addEventListener('click', () => {
      this.hideModal('headphones');
    });
    
    // Mic permission modal
    document.getElementById('btn-enable-mic')?.addEventListener('click', () => this.enableMicrophone());
    document.getElementById('btn-skip-mic')?.addEventListener('click', () => {
      this.voiceModeEnabled = false;
      this.hideModal('mic-permission');
      this.proceedAfterMicDecision();
    });
  }
  
  // Setup voice callbacks
  setupVoiceCallbacks() {
    // Voice output callbacks
    voiceOutput.onSpeakingStart = () => {
      this.isAISpeaking = true;
      this.updateListeningStatus();
      voiceInput.pause();
    };
    
    voiceOutput.onSpeakingEnd = () => {
      this.isAISpeaking = false;
      this.updateListeningStatus();
      if (this.voiceModeEnabled) {
        voiceInput.resume();
      }
    };
    
    // Voice input callbacks
    voiceInput.onFinalResult = (transcript) => {
      if (!this.isAISpeaking) {
        this.handleVoiceImpression(transcript);
      }
    };
    
    voiceInput.onInterimResult = (transcript) => {
      this.showInterimText(transcript);
    };
    
    voiceInput.onListeningChange = (isListening) => {
      this.updateListeningStatus();
    };
    
    voiceInput.onError = (error) => {
      if (error === 'microphone-denied') {
        this.voiceModeEnabled = false;
        this.showTextInput();
      }
    };
  }
  
  // Handle mode selection
  handleModeSelect(mode) {
    switch (mode) {
      case 'training':
        this.showScreen('training-setup');
        break;
      case 'exploration':
        this.showScreen('exploration-setup');
        break;
      case 'quick':
        this.showScreen('quick-setup');
        break;
    }
  }
  
  // Handle option button changes
  handleOptionChange(setting, value) {
    switch (setting) {
      case 'duration':
        this.trainingSetup.duration = value;
        break;
      case 'targets':
        this.trainingSetup.targets = value;
        break;
      case 'focus':
        this.trainingSetup.focus = value;
        this.updateFocusDescription(value);
        break;
      case 'exploration-duration':
        this.explorationSetup.duration = value;
        break;
      case 'quick-duration':
        this.quickSetup.duration = value;
        break;
    }
  }
  
  // Update focus level description
  updateFocusDescription(level) {
    const desc = document.getElementById('focus-description');
    if (desc && CONFIG.FOCUS_LEVELS[level]) {
      desc.textContent = CONFIG.FOCUS_LEVELS[level].description;
    }
  }
  
  // Show headphone warning before starting
  startTraining() {
    this.pendingAction = 'training';
    this.showModal('headphones');
  }
  
  startExploration() {
    this.pendingAction = 'exploration';
    this.showModal('headphones');
  }
  
  startQuick() {
    this.pendingAction = 'quick';
    this.showModal('headphones');
  }
  
  // Called after headphone confirmation
  proceedAfterHeadphoneWarning() {
    if (this.pendingAction === 'training' && this.voiceModeEnabled) {
      this.showModal('mic-permission');
    } else {
      this.proceedAfterMicDecision();
    }
  }
  
  // Enable microphone
  async enableMicrophone() {
    const result = await voiceInput.requestPermission();
    this.hideModal('mic-permission');
    
    if (!result.granted) {
      this.voiceModeEnabled = false;
    }
    
    this.proceedAfterMicDecision();
  }
  
  // Start the actual session after all confirmations
  proceedAfterMicDecision() {
    switch (this.pendingAction) {
      case 'training':
        this.beginTrainingSession();
        break;
      case 'exploration':
        this.beginExplorationSession();
        break;
      case 'quick':
        this.beginQuickSession();
        break;
    }
    this.pendingAction = null;
  }
  
  // Begin training session
  async beginTrainingSession() {
    const { duration, targets, focus } = this.trainingSetup;
    
    // Start session
    sessionManager.startTrainingSession(focus, targets, duration);
    
    // Start audio
    await binauralBeats.start(focus);
    
    // Setup UI
    this.showScreen('training-session');
    this.updateSessionUI();
    
    // Setup input mode
    if (this.voiceModeEnabled) {
      this.showVoiceInput();
      voiceInput.startSession();
    } else {
      this.showTextInput();
    }
    
    // Start timer
    sessionManager.startTimer(duration, 
      (min, sec) => this.updateTimer(min, sec),
      () => this.onTimerEnd()
    );
    
    // AI starts the session
    const target = sessionManager.getCurrentTarget();
    this.setMonitorText('Initializing session...');
    
    const opening = await aiGuide.startSession(target);
    this.setMonitorText(opening);
    
    // After opening, prompt for impressions
    setTimeout(async () => {
      const prompt = await aiGuide.promptForTarget();
      this.setMonitorText(prompt);
    }, 3000);
  }
  
  // Begin exploration session
  async beginExplorationSession() {
    const { duration, focus } = this.explorationSetup;
    
    sessionManager.startExplorationSession(focus, duration);
    await binauralBeats.start(focus);
    
    this.showScreen('exploration-session');
    
    // Update UI
    document.getElementById('exploration-focus-level').textContent = focus;
    const focusConfig = CONFIG.FOCUS_LEVELS[focus];
    document.getElementById('exploration-frequency').textContent = `${focusConfig.beatFreq} Hz`;
    
    // Start timer
    sessionManager.startTimer(duration,
      (min, sec) => {
        document.getElementById('exploration-timer').textContent = 
          `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      },
      () => this.endExploration()
    );
    
    // AI guidance for this focus level
    if (this.voiceModeEnabled) {
      await aiGuide.focusLevelGuidance(focus);
    }
  }
  
  // Begin quick session
  async beginQuickSession() {
    const { duration, focus } = this.quickSetup;
    
    sessionManager.startQuickSession(focus, duration);
    await binauralBeats.start(focus);
    
    this.showScreen('quick-session');
    
    // Update UI
    document.getElementById('quick-focus-level').textContent = focus;
    
    // Start timer
    sessionManager.startTimer(duration,
      (min, sec) => {
        document.getElementById('quick-timer').textContent = 
          `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      },
      () => this.endQuick()
    );
  }
  
  // Update session UI
  updateSessionUI() {
    const progress = sessionManager.getProgress();
    const session = sessionManager.currentSession;
    
    document.getElementById('session-focus').textContent = `Focus ${session.focusLevel}`;
    document.getElementById('session-progress').textContent = `Target ${progress.current}/${progress.total}`;
    document.getElementById('envelope-label').textContent = `TARGET ${progress.current} OF ${progress.total}`;
  }
  
  // Update timer display
  updateTimer(min, sec) {
    const timerEl = document.getElementById('session-timer');
    if (timerEl) {
      timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
  }
  
  // Timer ended
  onTimerEnd() {
    // Could auto-end session or just let user continue
    console.log('Session timer ended');
  }
  
  // Handle voice impression
  async handleVoiceImpression(transcript) {
    if (!transcript || this.isAISpeaking) return;
    
    this.addImpressionToList(transcript);
    this.clearInterimText();
    
    const response = await aiGuide.recordImpression(transcript);
    this.setMonitorText(response);
  }
  
  // Handle text impression
  async sendTextImpression() {
    const input = document.getElementById('impression-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    input.value = '';
    this.addImpressionToList(text);
    
    const response = await aiGuide.recordImpression(text);
    this.setMonitorText(response);
  }
  
  // Add impression to the list
  addImpressionToList(text) {
    const list = document.getElementById('impressions-list');
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
    
    // Scroll to bottom
    list.scrollTop = list.scrollHeight;
  }
  
  // Show interim text
  showInterimText(text) {
    const el = document.getElementById('interim-text');
    if (el) {
      el.textContent = text ? `${text}...` : '';
    }
  }
  
  // Clear interim text
  clearInterimText() {
    const el = document.getElementById('interim-text');
    if (el) {
      el.textContent = '';
    }
  }
  
  // Set monitor text
  setMonitorText(text) {
    const el = document.getElementById('monitor-text');
    if (el) {
      el.textContent = text;
    }
  }
  
  // Update listening status indicator
  updateListeningStatus() {
    const statusEl = document.getElementById('listening-status');
    const textEl = document.getElementById('status-text');
    
    if (!statusEl || !textEl) return;
    
    if (this.isAISpeaking) {
      statusEl.classList.add('ai-speaking');
      textEl.textContent = 'AI SPEAKING...';
    } else if (voiceInput.getIsListening()) {
      statusEl.classList.remove('ai-speaking');
      textEl.textContent = 'LISTENING...';
    } else {
      statusEl.classList.add('ai-speaking');
      textEl.textContent = 'PAUSED';
    }
  }
  
  // Show voice input UI
  showVoiceInput() {
    document.getElementById('voice-input-area')?.classList.remove('hidden');
    document.getElementById('text-input-area')?.classList.add('hidden');
  }
  
  // Show text input UI
  showTextInput() {
    document.getElementById('voice-input-area')?.classList.add('hidden');
    document.getElementById('text-input-area')?.classList.remove('hidden');
  }
  
  // Reveal target
  async revealTarget() {
    // Stop voice input during reveal
    voiceInput.pause();
    
    // Get scoring from AI
    const result = await aiGuide.scoreAndReveal();
    const target = sessionManager.getCurrentTarget();
    
    // Record result
    sessionManager.recordTargetResult(result.matchScore, aiGuide.userImpressions);
    
    // Update reveal screen
    document.getElementById('revealed-image').src = target.image;
    document.getElementById('revealed-name').textContent = target.name;
    document.getElementById('score-value').textContent = `${result.matchScore}%`;
    document.getElementById('score-fill').style.width = `${result.matchScore}%`;
    document.getElementById('reveal-feedback').textContent = result.spokenFeedback;
    
    // Build match breakdown
    const breakdown = document.getElementById('match-breakdown');
    breakdown.innerHTML = '';
    
    result.matchedElements.forEach(item => {
      const div = document.createElement('div');
      div.className = 'match-item matched';
      div.textContent = item;
      breakdown.appendChild(div);
    });
    
    result.partialMatches.forEach(item => {
      const div = document.createElement('div');
      div.className = 'match-item partial';
      div.textContent = item;
      breakdown.appendChild(div);
    });
    
    // Show reveal screen
    this.showScreen('reveal');
  }
  
  // Next target
  async nextTarget() {
    if (!sessionManager.hasMoreTargets()) {
      this.endSession();
      return;
    }
    
    // Clear impressions list
    document.getElementById('impressions-list').innerHTML = '';
    
    // Update session UI
    this.updateSessionUI();
    
    // Get next target
    const target = sessionManager.getCurrentTarget();
    aiGuide.resetForNextTarget(target);
    
    // Switch back to training screen
    this.showScreen('training-session');
    
    // Resume voice input
    if (this.voiceModeEnabled) {
      voiceInput.resume();
    }
    
    // AI prompts for new target
    const prompt = await aiGuide.promptForTarget();
    this.setMonitorText(prompt);
  }
  
  // End training session
  async endSession() {
    voiceInput.stopSession();
    binauralBeats.stop();
    binauralBeats.playChime();
    
    this.sessionResult = sessionManager.endTrainingSession();
    
    if (!this.sessionResult) {
      this.showScreen('landing');
      return;
    }
    
    // Update summary screen
    document.getElementById('summary-targets').textContent = this.sessionResult.targetCount;
    document.getElementById('summary-accuracy').textContent = `${this.sessionResult.averageScore}%`;
    document.getElementById('summary-best').textContent = `${this.sessionResult.bestScore}%`;
    document.getElementById('summary-streak').textContent = this.sessionResult.streak;
    
    // Get AI summary
    const summary = await aiGuide.sessionSummary(this.sessionResult);
    document.getElementById('summary-feedback').textContent = summary;
    
    // Reset AI
    aiGuide.reset();
    
    this.showScreen('summary');
    this.updateUserStats();
  }
  
  // End exploration
  endExploration() {
    binauralBeats.stop();
    binauralBeats.playChime();
    sessionManager.endExplorationSession();
    
    // Show journal prompt
    document.getElementById('journal-entry').value = '';
    this.showScreen('journal');
  }
  
  // Save journal
  async saveJournal() {
    const entry = document.getElementById('journal-entry').value.trim();
    
    if (entry) {
      sessionManager.saveJournalEntry(entry);
      
      // Get AI interpretation
      await aiGuide.interpretJournal(entry);
    }
    
    this.showScreen('landing');
    this.updateUserStats();
  }
  
  // Toggle exploration pause
  toggleExplorationPause() {
    if (binauralBeats.getIsPlaying()) {
      binauralBeats.pause();
    } else {
      binauralBeats.resume();
    }
  }
  
  // End quick session
  endQuick() {
    binauralBeats.stop();
    sessionManager.endQuickSession();
    this.showScreen('landing');
  }
  
  // Toggle quick pause
  toggleQuickPause() {
    const icon = document.getElementById('quick-pause-icon');
    
    if (binauralBeats.getIsPlaying()) {
      binauralBeats.pause();
      icon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    } else {
      binauralBeats.resume();
      icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    }
  }
  
  // Share results
  shareResults() {
    if (this.sessionResult) {
      shareToX(this.sessionResult);
    }
  }
  
  // Clear all data
  clearData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      sessionManager.clearUserData();
      this.hideModal('settings');
      this.updateUserStats();
    }
  }
  
  // Update user stats display
  updateUserStats() {
    const stats = sessionManager.getUserStats();
    const statsContainer = document.getElementById('user-stats');
    
    if (sessionManager.isReturningUser()) {
      statsContainer?.classList.remove('hidden');
      document.getElementById('stat-sessions').textContent = stats.sessions;
      document.getElementById('stat-accuracy').textContent = `${stats.accuracy}%`;
      document.getElementById('stat-streak').textContent = stats.streak;
    } else {
      statsContainer?.classList.add('hidden');
    }
  }
  
  // Load user preferences
  loadUserPreferences() {
    const prefs = sessionManager.getPreferences();
    
    // Volume
    const volumeSlider = document.getElementById('setting-volume');
    if (volumeSlider) {
      volumeSlider.value = prefs.volume * 100;
      document.getElementById('volume-value').textContent = `${Math.round(prefs.volume * 100)}%`;
    }
    
    // Voice toggles
    document.getElementById('setting-voice-output').checked = prefs.voiceOutput;
    document.getElementById('setting-voice-input').checked = prefs.voiceInput;
    
    // Carrier frequency
    document.getElementById('setting-carrier').value = prefs.carrier;
  }
  
  // Show screen
  showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    
    const screen = document.getElementById(`screen-${screenName}`);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenName;
    }
  }
  
  // Show modal
  showModal(modalName) {
    const modal = document.getElementById(`modal-${modalName}`);
    if (modal) {
      modal.classList.add('active');
    }
  }
  
  // Hide modal
  hideModal(modalName) {
    const modal = document.getElementById(`modal-${modalName}`);
    if (modal) {
      modal.classList.remove('active');
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new GatewayApp();
  app.init();
  
  // Make app globally accessible for debugging
  window.gatewayApp = app;
});
