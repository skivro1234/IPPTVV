/**
 * lib/scheduler.js
 * Schedules automatic daily IPTV updates.
 * Replaces the GitHub Actions cron workflow (update-m3u.yml).
 */

const { updateIPTV } = require('./updater');
const { generatePlaylist } = require('./playlist');

// How often to run the update (default: every 24 hours)
const UPDATE_INTERVAL_MS = parseInt(process.env.UPDATE_INTERVAL_HOURS || '24', 10) * 60 * 60 * 1000;

let updateTimer = null;

async function runUpdate() {
  console.log('[scheduler] Running scheduled IPTV update…');
  try {
    await updateIPTV();
    await generatePlaylist();
    console.log('[scheduler] Scheduled update complete.');
  } catch (err) {
    console.error('[scheduler] Scheduled update failed:', err.message);
  }
}

function scheduleUpdates() {
  // Run once at startup if enabled
  if (process.env.UPDATE_ON_START === 'true') {
    console.log('[scheduler] Running initial update on startup…');
    runUpdate();
  }

  // Then repeat on interval
  updateTimer = setInterval(runUpdate, UPDATE_INTERVAL_MS);
  console.log(`[scheduler] Auto-update scheduled every ${UPDATE_INTERVAL_MS / 3600000}h`);
}

function stopSchedule() {
  if (updateTimer) clearInterval(updateTimer);
}

module.exports = { scheduleUpdates, stopSchedule, runUpdate };
