/**
 * IPTV M3U Server - Node.js
 * Serves playlists, checks stream health, and auto-updates channel lists.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { updateIPTV } = require('./lib/updater');
const { generatePlaylist } = require('./lib/playlist');
const { scheduleUpdates } = require('./lib/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Serve static files (HTML player, etc.)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve the main active playlist
app.get('/index.m3u', (req, res) => {
  const filePath = path.join(DATA_DIR, 'index.m3u');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('# Playlist not yet generated. Call /api/update first.\n');
  }
  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.sendFile(filePath);
});

// Serve dead channels list
app.get('/dead.m3u', (req, res) => {
  const filePath = path.join(DATA_DIR, 'index_dead.m3u');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('# No dead channels recorded yet.\n');
  }
  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.sendFile(filePath);
});

// Serve generated playlist (music + podcasts)
app.get('/playlist.m3u', (req, res) => {
  const filePath = path.join(DATA_DIR, 'playlist.m3u');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('# Playlist not yet generated.\n');
  }
  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.sendFile(filePath);
});

// Serve iptv-org international playlist
app.get('/iptv-org.m3u', (req, res) => {
  const filePath = path.join(DATA_DIR, 'iptv-org.m3u');
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('# International playlist not yet generated.\n');
  }
  res.setHeader('Content-Type', 'application/x-mpegurl');
  res.sendFile(filePath);
});

// Dashboard / stats
app.get('/api/stats', (req, res) => {
  const reportPath = path.join(DATA_DIR, 'report.json');
  if (!fs.existsSync(reportPath)) {
    return res.json({ message: 'No report yet. Run /api/update first.' });
  }
  res.json(JSON.parse(fs.readFileSync(reportPath, 'utf-8')));
});

// Trigger a manual update
app.post('/api/update', async (req, res) => {
  res.json({ message: 'Update started in background. Check /api/stats for progress.' });
  try {
    await updateIPTV();
    console.log('[server] IPTV update completed.');
  } catch (err) {
    console.error('[server] IPTV update failed:', err.message);
  }
});

// Trigger playlist generation
app.post('/api/generate-playlist', async (req, res) => {
  res.json({ message: 'Playlist generation started.' });
  try {
    await generatePlaylist();
    console.log('[server] Playlist generated.');
  } catch (err) {
    console.error('[server] Playlist generation failed:', err.message);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[server] IPTV server running on port ${PORT}`);
  console.log(`[server] Endpoints:`);
  console.log(`  GET  /index.m3u          → Active channel playlist`);
  console.log(`  GET  /dead.m3u           → Dead channel list`);
  console.log(`  GET  /playlist.m3u       → Music + podcast playlist`);
  console.log(`  GET  /iptv-org.m3u       → International channels`);
  console.log(`  GET  /api/stats          → Dashboard stats`);
  console.log(`  POST /api/update         → Trigger channel health check`);
  console.log(`  POST /api/generate-playlist → Regenerate podcast playlist`);
  scheduleUpdates();
});
