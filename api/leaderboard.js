/**
 * Vercel Serverless Function - Leaderboard Backend Proxy
 * Completely protects and encapsulates Supabase credentials on the server side.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_PIN = process.env.ADMIN_PIN || '1008';

function getHeaders() {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

export default async function handler(req, res) {
  // Enable CORS for frontend origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase server environment variables not configured.' });
  }

  try {
    // 1. GET: Fetch Top Leaderboard Items & Total Count
    if (req.method === 'GET') {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

      const [itemsRes, countRes] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?select=id,player_id,player_name,university,high_score,max_combo,updated_at&order=high_score.desc,updated_at.asc&limit=${limit}`,
          { headers: getHeaders() }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?select=id`,
          {
            headers: {
              ...getHeaders(),
              'Prefer': 'count=exact',
              'Range': '0-0'
            }
          }
        )
      ]);

      if (!itemsRes.ok) {
        throw new Error(`Supabase items fetch failed: ${itemsRes.status}`);
      }

      const items = await itemsRes.json();
      let totalCount = items.length;

      const range = countRes.headers.get('content-range');
      if (range) {
        const parts = range.split('/');
        if (parts.length > 1) {
          const parsed = parseInt(parts[1], 10);
          if (!isNaN(parsed)) totalCount = parsed;
        }
      }

      return res.status(200).json({ items, totalCount });
    }

    // 2. POST: Actions (save_profile, sync_score, verify_pin)
    if (req.method === 'POST') {
      const { action, payload } = req.body || {};

      // Verify Admin PIN
      if (action === 'verify_pin') {
        const isValid = String(payload?.pin || '').trim() === String(ADMIN_PIN).trim();
        return res.status(200).json({ valid: isValid });
      }

      // Save Devotee Profile
      if (action === 'save_profile') {
        const { playerId, playerName, university, highScore, maxCombo, gamesPlayed } = payload || {};
        if (!playerId || !playerName || !university) {
          return res.status(400).json({ error: 'Missing required profile fields.' });
        }

        const safeName = String(playerName).trim().slice(0, 40);
        const safeUni = String(university).trim().slice(0, 60);
        const safeScore = Math.min(Math.max(parseInt(highScore, 10) || 0, 0), 500000);

        const upsertRes = await fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?on_conflict=player_id`,
          {
            method: 'POST',
            headers: {
              ...getHeaders(),
              'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify({
              player_id: playerId,
              player_name: safeName,
              university: safeUni,
              high_score: safeScore,
              max_combo: Math.max(parseInt(maxCombo, 10) || 1, 1),
              games_played: Math.max(parseInt(gamesPlayed, 10) || 0, 0),
              updated_at: new Date().toISOString()
            })
          }
        );

        if (!upsertRes.ok) {
          const errText = await upsertRes.text();
          throw new Error(`Failed to save profile: ${errText}`);
        }

        const data = await upsertRes.json();
        return res.status(200).json({ success: true, data });
      }

      // Sync High Score
      if (action === 'sync_score') {
        const { playerId, playerName, university, score, maxCombo } = payload || {};
        if (!playerId) return res.status(400).json({ error: 'Missing playerId.' });

        const safeScore = Math.min(Math.max(parseInt(score, 10) || 0, 0), 500000);

        // Fetch current record first to avoid overriding a higher existing record
        let finalScore = safeScore;
        try {
          const getRes = await fetch(
            `${SUPABASE_URL}/rest/v1/leaderboard?player_id=eq.${encodeURIComponent(playerId)}&select=high_score`,
            { headers: getHeaders() }
          );
          if (getRes.ok) {
            const current = await getRes.json();
            if (current && current.length > 0 && typeof current[0].high_score === 'number') {
              finalScore = Math.max(current[0].high_score, safeScore);
            }
          }
        } catch (fetchErr) {
          console.warn('Could not query current high score:', fetchErr);
        }

        const patchRes = await fetch(
          `${SUPABASE_URL}/rest/v1/leaderboard?player_id=eq.${encodeURIComponent(playerId)}`,
          {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
              player_name: String(playerName || '').trim().slice(0, 40),
              university: String(university || '').trim().slice(0, 60),
              high_score: finalScore,
              max_combo: Math.max(parseInt(maxCombo, 10) || 1, 1),
              updated_at: new Date().toISOString()
            })
          }
        );

        return res.status(200).json({ success: patchRes.ok, highScore: finalScore });
      }

      return res.status(400).json({ error: 'Unknown action.' });
    }

    // 3. DELETE: Admin Devotee Deletion
    if (req.method === 'DELETE') {
      const { id, pin } = req.body || {};
      if (!id || !pin) {
        return res.status(400).json({ error: 'Missing devotee ID or Security PIN.' });
      }

      // Strictly verify PIN on server
      if (String(pin).trim() !== String(ADMIN_PIN).trim()) {
        return res.status(401).json({ error: 'Invalid Security PIN.' });
      }

      const rpcRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/admin_delete_devotee`,
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            devotee_id: id,
            admin_pin: String(pin).trim()
          })
        }
      );

      if (!rpcRes.ok) {
        return res.status(rpcRes.status).json({ error: 'Delete failed on database.' });
      }

      const result = await rpcRes.json();
      return res.status(200).json({ success: result === true });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    return res.status(500).json({ error: 'Internal server error processing leaderboard request.' });
  }
}
