/**
 * Mushak's Modak Dash - Real-time Global Leaderboard & Devotee Registration
 * Powered by Supabase PostgreSQL REST API
 */

(function () {
  const SUPABASE_URL = 'https://ainetahaisilqyuljdul.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbmV0YWhhaXNpbHF5dWxqZHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMTE3MzIsImV4cCI6MjEwNDY4NzczMn0.A1Pg2F3X0UiPEHlCHCLznFmTckrdtNV13xbn3XLKDwM';
  const PROFILE_STORAGE_KEY = 'mushak_devotee_profile_v1';
  const HIGH_SCORE_KEY = 'mushak_modak_high_score';
  const ADMIN_PIN = '1008';

  class LeaderboardService {
    constructor() {
      this.profile = this.loadLocalProfile();
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

    // Save or update devotee profile
    async saveProfile(name, university) {
      const cleanName = (name || '').trim();
      const cleanUni = (university || '').trim();

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

      // Upsert to Supabase
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify({
            player_id: playerId,
            player_name: cleanName,
            university: cleanUni,
            high_score: currentHighScore,
            updated_at: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn('Network issue registering devotee with leaderboard server', err);
      }

      return this.profile;
    }

    // Synchronize high score to Supabase if it beats personal record
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
        await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?player_id=eq.${encodeURIComponent(playerId)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            player_name: this.profile.playerName,
            university: this.profile.university,
            ...(isNewHighScore ? { high_score: score } : {}),
            max_combo: maxCombo,
            updated_at: new Date().toISOString()
          })
        });
      } catch (err) {
        console.warn('Could not sync score to global leaderboard', err);
      }
    }

    // Fetch top devotees and offerings
    async fetchTopOfferings(limit = 25) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?select=id,player_id,player_name,university,high_score,max_combo,updated_at&order=high_score.desc,updated_at.asc&limit=${limit}`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn('Failed to fetch leaderboard:', err);
        return [];
      }
    }

    // Delete a devotee record by Supabase ID
    async deleteDevotee(id) {
      if (!id) return false;
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return res.ok;
      } catch (err) {
        console.error('Failed to delete devotee record:', err);
        return false;
      }
    }

    // Verify admin moderation PIN
    verifyAdminPin(pin) {
      return String(pin).trim() === ADMIN_PIN;
    }

    // Fetch total participant count
    async fetchParticipantCount() {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?select=id`,
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'count=exact',
              'Range': '0-0'
            }
          }
        );
        const range = res.headers.get('content-range');
        if (range) {
          const parts = range.split('/');
          if (parts.length > 1) {
            const count = parseInt(parts[1], 10);
            if (!isNaN(count)) return count;
          }
        }
        // Fallback: fetch list
        const items = await this.fetchTopOfferings(100);
        return items.length;
      } catch (e) {
        return 1;
      }
    }
  }

  window.leaderboardService = new LeaderboardService();
})();
