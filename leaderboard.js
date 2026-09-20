/**
 * Mushak's Modak Dash - Secure Leaderboard Service
 * 100% Protected: Zero Supabase URLs or API keys exposed to the client.
 * All operations proxy securely through Vercel Serverless Function (/api/leaderboard).
 */

(function () {
  const API_ENDPOINT = '/api/leaderboard';
  const PROFILE_STORAGE_KEY = 'mushak_devotee_profile_v1';
  const HIGH_SCORE_KEY = 'mushak_modak_high_score';

  class LeaderboardService {
    constructor() {
      this.profile = this.loadLocalProfile();
      this.cachedCount = null;
    }

    // Load devotee profile from localStorage
    loadLocalProfile() {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.warn('Could not parse local devotee profile', e);
      }
      return null;
    }

    hasProfile() {
      return !!(this.profile && this.profile.playerName && this.profile.university);
    }

    getProfile() {
      return this.profile;
    }

    // Generate unique client ID for devotee record
    generatePlayerId() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'devotee_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    }

    // Save or update devotee profile via secure API proxy
    async saveProfile(name, university) {
      const cleanName = (name || '').trim().slice(0, 40);
      const cleanUni = (university || '').trim().slice(0, 60);

      if (!cleanName || !cleanUni) {
        throw new Error('Please enter both your name and university.');
      }

      const playerId = this.profile?.playerId || this.generatePlayerId();
      const currentHighScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);

      this.profile = {
        playerId,
        playerName: cleanName,
        university: cleanUni,
        highScore: currentHighScore,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profile));

      try {
        await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_profile',
            payload: {
              playerId,
              playerName: cleanName,
              university: cleanUni,
              highScore: currentHighScore,
              maxCombo: 1,
              gamesPlayed: 1
            }
          })
        });
      } catch (err) {
        console.warn('Network issue saving devotee profile:', err);
      }

      return this.profile;
    }

    // Synchronize high score to secure API proxy if it beats personal record
    async syncScore(score, maxCombo = 1) {
      if (!this.hasProfile()) return;

      const playerId = this.profile.playerId;
      const isNewHighScore = score > (this.profile.highScore || 0);

      if (isNewHighScore) {
        this.profile.highScore = score;
        this.profile.updatedAt = new Date().toISOString();
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profile));
        localStorage.setItem(HIGH_SCORE_KEY, score.toString());
      }

      try {
        await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_score',
            payload: {
              playerId,
              playerName: this.profile.playerName,
              university: this.profile.university,
              score: isNewHighScore ? score : this.profile.highScore,
              maxCombo
            }
          })
        });
      } catch (err) {
        console.warn('Could not sync score to leaderboard server:', err);
      }
    }

    // Fetch top devotees and offerings via secure API proxy
    async fetchTopOfferings(limit = 30) {
      try {
        const res = await fetch(`${API_ENDPOINT}?limit=${encodeURIComponent(limit)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (typeof data.totalCount === 'number') {
          this.cachedCount = data.totalCount;
        }
        return data.items || [];
      } catch (err) {
        console.warn('Failed to fetch leaderboard:', err);
        return [];
      }
    }

    // Delete a devotee record via secure API proxy
    async deleteDevotee(id, pin) {
      if (!id || !pin) return false;
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            pin: String(pin).trim()
          })
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.success === true;
      } catch (err) {
        console.error('Failed to delete devotee record:', err);
        return false;
      }
    }

    // Verify admin moderation PIN via secure API proxy
    async verifyAdminPin(pin) {
      if (!pin) return false;
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify_pin',
            payload: { pin: String(pin).trim() }
          })
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data.valid === true;
      } catch (err) {
        return false;
      }
    }

    // Fetch total participant count
    async fetchParticipantCount() {
      if (this.cachedCount !== null) return this.cachedCount;
      try {
        const items = await this.fetchTopOfferings(1);
        return this.cachedCount || items.length;
      } catch (e) {
        return 1;
      }
    }
  }

  window.leaderboardService = new LeaderboardService();
})();
