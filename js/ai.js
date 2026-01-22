// Gateway Trainer - AI Guide
// ===========================
// Calls Cloudflare Worker which proxies to OpenAI GPT-4o
// Acts as the "monitor" guiding remote viewing sessions

const MONITOR_SYSTEM_PROMPT = `You are a remote viewing training monitor based on declassified CIA Stargate Project protocols. You speak with a calm, measured voice to guide users through psychic perception exercises.

Your role:
1. Guide users through the viewing process with short, calm prompts
2. Encourage sensory impressions over analytical thinking
3. Ask about: colors, shapes, textures, sounds, temperatures, emotions, scale
4. Never reveal the target until the viewing is complete
5. Keep responses BRIEF during viewing (1-2 sentences max) - you're speaking aloud
6. Be more detailed during scoring/feedback phase
7. Provide encouraging, specific feedback

Tone: Calm, supportive, almost meditative. Like a hypnotherapist meets intelligence officer.

IMPORTANT: Keep all responses short enough to sound natural when spoken. Avoid long paragraphs. Use simple, clear language.`;

const SCORING_SYSTEM_PROMPT = `You are analyzing a remote viewing attempt. Be encouraging but accurate.

Respond with valid JSON only, no other text:
{
  "matchScore": <0-100>,
  "matchedElements": ["list of correct perceptions"],
  "partialMatches": ["things that were close"],
  "missedElements": ["significant aspects they missed"],
  "spokenFeedback": "2-3 SHORT sentences for voice feedback (keep brief, natural)",
  "suggestion": "One sentence tip for next time"
}`;

const JOURNAL_SYSTEM_PROMPT = `You are a consciousness exploration guide analyzing a user's meditation journal entry. Provide brief, insightful interpretation of their experience. Keep response to 2-3 sentences, suitable for speaking aloud.`;

class AIGuide {
  constructor() {
    this.conversationHistory = [];
    this.currentTarget = null;
    this.userImpressions = [];
  }
  
  // Generic chat with GPT-4o via Cloudflare Worker
  async chat(userMessage, systemPrompt = MONITOR_SYSTEM_PROMPT) {
    this.conversationHistory.push({ role: 'user', content: userMessage });
    
    try {
      const response = await fetch(`${CONFIG.WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }
      
      const assistantMessage = data.choices[0].message.content;
      this.conversationHistory.push({ role: 'assistant', content: assistantMessage });
      
      return assistantMessage;
    } catch (error) {
      console.error('AI chat error:', error);
      return "Let's continue. What impressions are coming to you?";
    }
  }
  
  // Speak response if premium voice is enabled
  async respond(text) {
    if (CONFIG.PREMIUM.voiceOutput) {
      await voiceOutput.speak(text);
    }
    return text;
  }
  
  // Start a new training session
  async startSession(target) {
    this.currentTarget = target;
    this.userImpressions = [];
    this.conversationHistory = [];
    
    const opening = await this.chat(
      "Begin a new remote viewing session. Give a brief relaxation prompt (2-3 sentences max). Guide the user to relax and prepare to receive impressions."
    );
    
    await this.respond(opening);
    return opening;
  }
  
  // Prompt user for target impressions
  async promptForTarget() {
    const prompt = await this.chat(
      "The target is ready. Ask the user what first impressions come to them. Keep it to 1-2 sentences. Be encouraging."
    );
    
    await this.respond(prompt);
    return prompt;
  }
  
  // Record and respond to user impression
  async recordImpression(impression) {
    this.userImpressions.push(impression);
    
    const response = await this.chat(
      `User impression: "${impression}". Acknowledge briefly and ask ONE follow-up question about a different sensory aspect (color, shape, texture, sound, temperature, emotion, or scale). 1-2 sentences max.`
    );
    
    await this.respond(response);
    return response;
  }
  
  // Score the viewing and reveal target
  async scoreAndReveal() {
    const scoringPrompt = `Analyze this remote viewing attempt:

TARGET: ${this.currentTarget.name}
TARGET DESCRIPTION: ${this.currentTarget.description}
TARGET KEYWORDS: ${this.currentTarget.keywords.join(', ')}
TARGET TRAITS: natural=${this.currentTarget.traits.natural}, hasWater=${this.currentTarget.traits.hasWater}, indoor=${this.currentTarget.traits.indoor}, living=${this.currentTarget.traits.living}, large=${this.currentTarget.traits.large}
TARGET COLORS: ${this.currentTarget.colors.join(', ')}
TARGET TEXTURES: ${this.currentTarget.textures.join(', ')}
TARGET EMOTIONS: ${this.currentTarget.emotions.join(', ')}

USER'S IMPRESSIONS:
${this.userImpressions.map((imp, i) => `${i + 1}. "${imp}"`).join('\n')}

Respond with JSON only.`;

    try {
      const response = await fetch(`${CONFIG.WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: SCORING_SYSTEM_PROMPT },
            { role: 'user', content: scoringPrompt }
          ],
          max_tokens: 500,
          temperature: 0.5
        })
      });
      
      const data = await response.json();
      let result;
      
      try {
        // Try to parse JSON from response
        let content = data.choices[0].message.content;
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        result = JSON.parse(content);
      } catch (parseError) {
        console.warn('Failed to parse scoring JSON:', parseError);
        // Fallback scoring
        result = this._fallbackScoring();
      }
      
      // Speak the feedback
      await this.respond(result.spokenFeedback);
      
      return result;
    } catch (error) {
      console.error('Scoring error:', error);
      const fallback = this._fallbackScoring();
      await this.respond(fallback.spokenFeedback);
      return fallback;
    }
  }
  
  // Fallback scoring if API fails
  _fallbackScoring() {
    return {
      matchScore: 50,
      matchedElements: [],
      partialMatches: this.userImpressions.slice(0, 2),
      missedElements: [],
      spokenFeedback: "Interesting session. Your perceptions show potential. Let's continue practicing.",
      suggestion: "Try to focus on the very first impression that comes to mind."
    };
  }
  
  // Provide session summary
  async sessionSummary(sessionData) {
    const summaryPrompt = `Summarize this remote viewing training session in 2-3 sentences (will be spoken aloud):
- Targets attempted: ${sessionData.targetCount}
- Average accuracy: ${sessionData.averageScore}%
- Best score: ${sessionData.bestScore}%
- Focus level used: Focus ${sessionData.focusLevel}

Be encouraging and note any patterns or suggestions. Keep it brief and conversational.`;

    const response = await this.chat(summaryPrompt);
    await this.respond(response);
    return response;
  }
  
  // Interpret a journal entry
  async interpretJournal(journalEntry) {
    const prompt = `The user just completed a meditation/exploration session and wrote this journal entry:

"${journalEntry}"

Provide a brief, insightful interpretation of their experience. 2-3 sentences max.`;

    try {
      const response = await fetch(`${CONFIG.WORKER_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: JOURNAL_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          max_tokens: 200,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      const interpretation = data.choices[0].message.content;
      
      await this.respond(interpretation);
      return interpretation;
    } catch (error) {
      console.error('Journal interpretation error:', error);
      const fallback = "Thank you for sharing your experience. Keeping a journal helps track your progress and patterns over time.";
      await this.respond(fallback);
      return fallback;
    }
  }
  
  // Provide focus level guidance
  async focusLevelGuidance(focusLevel) {
    const focusConfig = CONFIG.FOCUS_LEVELS[focusLevel];
    
    const prompt = `The user is entering ${focusConfig.name} (${focusConfig.description}). Provide a brief 1-2 sentence guidance about what they might experience at this level. Be calm and encouraging.`;
    
    const response = await this.chat(prompt);
    await this.respond(response);
    return response;
  }
  
  // Reset for next target (within same session)
  resetForNextTarget(target) {
    this.currentTarget = target;
    this.userImpressions = [];
    // Keep conversation history for continuity within session
  }
  
  // Full reset for new session
  reset() {
    this.conversationHistory = [];
    this.currentTarget = null;
    this.userImpressions = [];
  }
}

// Create global instance
const aiGuide = new AIGuide();
