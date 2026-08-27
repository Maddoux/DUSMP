(() => {
  const status = document.querySelector('#server-status');
  if (!status) return;

  const label = status.querySelector('.status-label');
  const playerCount = status.querySelector('.player-count');
  const endpoint = 'https://api.mcsrvstat.us/3/play.dusmp.com';

  function showStatus(state, message, count) {
    status.dataset.state = state;
    label.textContent = message;
    playerCount.textContent = count;
  }

  async function updateStatus() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Status request failed');

      const data = await response.json();
      const online = Number(data.players?.online);
      const max = Number(data.players?.max);

      if (!data.online) {
        showStatus('offline', 'Server offline', '0 players');
      } else if (Number.isFinite(online) && Number.isFinite(max)) {
        showStatus('online', 'Server online', `${online} / ${max} players`);
      } else {
        throw new Error('Player count missing');
      }
    } catch {
      showStatus('unavailable', 'Status unavailable', '— players');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  updateStatus();
  window.setInterval(updateStatus, 300000);
})();
