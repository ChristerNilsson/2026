(async () => {
  'use strict';
  const playerId = cell => {
    const action = cell.getAttribute('onclick') || '';
    return action.match(/postshowindtournamentresultform\('\d+'\s*,\s*'(\d+)'\)/)?.[1]
      || action.match(/[?&]partid=(\d+)/)?.[1];
  };
  const scores = new Map();
  const fideCells = new Map();
  const fideCache = window.chessFideIds ??= new Map();
  let standingsFound = false;
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row =>
      Array.from(row.cells).some(cell => cell.textContent.trim().toUpperCase() === 'POÄNG'));
    if (!header) continue;
    standingsFound = true;
    table.querySelectorAll('[data-fide-column]').forEach(node => node.remove());
    const nameIndex = Array.from(header.cells).findIndex(cell => cell.textContent.trim().toUpperCase() === 'NAMN');
    const index = Array.from(header.cells).findIndex(cell => cell.textContent.trim().toUpperCase() === 'POÄNG');
    for (const row of table.rows) {
      const id = Array.from(row.cells).map(playerId).find(Boolean);
      const score = row.cells[index]?.textContent.trim();
      if (id && score && /^\d+(?:[.,]\d+)?$/.test(score)) scores.set(id, score);
      if (nameIndex < 0 || (row !== header && !id)) continue;
      const nameCell = row.cells[nameIndex];
      if (!nameCell) continue;
      const cell = document.createElement(row === header ? 'th' : 'td');
      cell.dataset.fideColumn = '';
      cell.className = row === header ? 'listheader js-sort-number' : 'listrighttext';
      cell.style.padding = '0 0.6em';
      cell.style.textAlign = 'right';
      if (row === header) {
        cell.textContent = 'FIDE-ID';
        cell.scope = 'col';
      } else {
        cell.textContent = '…';
        if (!fideCells.has(id)) fideCells.set(id, []);
        fideCells.get(id).push(cell);
      }
      nameCell.after(cell);
    }
  }
  let count = 0;
  for (const table of document.querySelectorAll('table')) {
    const header = Array.from(table.rows).find(row => {
      const labels = Array.from(row.cells).map(cell => cell.textContent.trim().toUpperCase());
      return labels.includes('BORD') && labels.includes('VIT') && labels.includes('SVART');
    });
    if (!header) continue;
    table.querySelectorAll('[data-player-score], [data-score-column]').forEach(node => node.remove());
    const positions = Array.from(header.cells)
      .map((cell, index) => ({ index, name: cell.textContent.trim().toUpperCase() }))
      .filter(({ name }) => name === 'VIT' || name === 'SVART')
      .reverse();
    for (const row of table.rows) {
      for (const { index, name } of positions) {
        const playerCell = row.cells[index];
        if (!playerCell) continue;
        if (row !== header && !row.querySelector('td[onclick]')) continue;
        const cell = document.createElement(row === header ? 'th' : 'td');
        cell.dataset.scoreColumn = name;
        cell.className = row === header ? 'listheader' : 'listrighttext';
        cell.style.padding = '0 0.6em';
        cell.style.textAlign = 'right';
        if (row === header) {
          cell.textContent = 'POÄNG';
          cell.scope = 'col';
        } else {
          const score = scores.get(playerId(playerCell));
          cell.textContent = score ?? '';
          if (score !== undefined) count++;
        }
        playerCell.after(cell);
      }
    }
  }
  if (!count && !standingsFound) alert('Kunde inte hitta ställningslista eller bordslista. Öppna turneringssidan och försök igen.');
  const form = document.querySelector('form[name="showIndTournamentResult"]');
  const tournamentId = form?.querySelector('[name="id"]')?.value || new URL(location.href).searchParams.get('id');
  let failures = 0;
  const pending = Array.from(fideCells);
  const worker = async () => {
    while (pending.length) {
      const [id, cells] = pending.shift();
      try {
        if (!fideCache.has(id)) {
          const request = (async () => {
            const url = new URL(form?.getAttribute('action') || './ShowTournamentParticipantResultServlet', location.href);
            url.searchParams.set('id', tournamentId || '');
            url.searchParams.set('partid', id);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const page = new DOMParser().parseFromString(await response.text(), 'text/html');
            for (const link of page.querySelectorAll('a[href]')) {
              const match = link.href.match(/^https?:\/\/ratings\.fide\.com\/(?:profile\/|card\.phtml\?event=)(\d+)(?:[/?&#]|$)/);
              if (match) return match[1];
            }
            const label = Array.from(page.querySelectorAll('td')).find(cell => /^FIDE\s*[- ]?\s*ID$/i.test(cell.textContent.trim()));
            if (!label) throw new Error('FIDE-fält saknas');
            return Array.from(label.parentElement.cells).slice(label.cellIndex + 1)
              .map(cell => cell.textContent.trim()).find(value => /^[1-9]\d*$/.test(value)) || '';
          })();
          fideCache.set(id, request);
          request.catch(() => { if (fideCache.get(id) === request) fideCache.delete(id); });
        }
        const fideId = await fideCache.get(id);
        for (const cell of cells) {
          cell.replaceChildren();
          if (!fideId) continue;
          const link = document.createElement('a');
          link.href = `https://ratings.fide.com/profile/${fideId}`;
          link.textContent = fideId;
          link.target = '_blank';
          link.rel = 'noopener';
          cell.append(link);
        }
      } catch {
        failures++;
        for (const cell of cells) {
          cell.textContent = '?';
          cell.title = 'Kunde inte hämta FIDE-id. Klicka på bokmärket igen för att försöka på nytt.';
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
  if (failures) alert(`Kunde inte hämta FIDE-id för ${failures} spelare. Klicka på bokmärket igen för att försöka på nytt.`);
})();
