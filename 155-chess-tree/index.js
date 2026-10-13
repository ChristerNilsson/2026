'use strict';
const dataSource = document.currentScript?.dataset.source;
const maxMoves = 34;
const signed = value => `${value >= 0 ? '+' : '-'}${Number((Math.abs(value) / 100).toFixed(2))}`;
function truncate(game) {
    const moves = game.moves.trim() ? game.moves.trim().split(/\s+/) : [];
    const evals = game.evals.trim() ? game.evals.trim().split(/\s+/).map(value => value === '?' ? null : Number(value)) : [];
    let previous = game.initialEval ?? null;
    for (let i = 0; i < Math.min(moves.length, maxMoves); i++) {
        const current = evals[i] ?? null;
        if (current !== null) {
            if (Math.abs(current) > 300) return [moves.slice(0, i + 1), `A${signed(current)}`];
            if (previous !== null && Math.abs(current - previous) > 100)
                return [moves.slice(0, i + 1), `R${signed(current - previous)}`];
        }
        previous = current;
    }
    if (moves.length > maxMoves) {
        const current = evals[maxMoves - 1] ?? null;
        return [moves.slice(0, maxMoves), current === null ? 'A?' : `A${signed(current)}`];
    }
    return [moves, `Slut:${game.Result}`];
}
function cell(row, text, tag = 'td') {
    const element = document.createElement(tag);
    element.textContent = text;
    if (tag === 'th') element.scope = 'col';
    row.append(element);
    return element;
}
function relativeEvaluations(game) {
    let previous = game.initialEval ?? null;
    return (game.evals.trim() ? game.evals.trim().split(/\s+/) : []).map(value => {
        const current = value === '?' ? null : Number(value);
        const delta = current === null || previous === null ? null : current - previous;
        previous = current;
        return delta;
    });
}
function moveCell(row, move, delta, hasMove) {
    const element = cell(row, '');
    element.className = 'move-cell';
    const text = document.createElement('span');
    text.className = 'move-text';
    text.textContent = move;
    const indicator = document.createElement('span');
    indicator.className = 'relative-eval';
    if (hasMove) {
        indicator.title = delta === null ? 'Relativ eval saknas' : `Relativ eval: ${delta > 0 ? '+' : ''}${delta} cp`;
        indicator.setAttribute('aria-label', indicator.title);
        if (delta !== null) {
            const line = document.createElement('span');
            line.className = 'eval-line';
            line.style.width = `${Math.min(100, Math.round(Math.abs(delta) / 10) * 10)}%`;
            indicator.append(line);
        }
    }
    element.append(text, indicator);
}
function render(games) {
    const header = document.createElement('tr');
    for (let i = 0; i < maxMoves; i++) cell(header, i % 2 ? '..' : i / 2 + 1, 'th');
    for (const title of ['Orsak', 'Res', 'Länk']) cell(header, title, 'th');
    document.querySelector('thead').replaceChildren(header);
    const body = document.querySelector('tbody');
    body.replaceChildren();
    let previous = [];
    const ordered = games.map(game => ({game, moves: game.moves.trim().split(/\s+/)}));
    ordered.sort((a, b) => {
        for (let i = 0; i < Math.min(a.moves.length, b.moves.length); i++) {
            if (a.moves[i] !== b.moves[i]) return a.moves[i] < b.moves[i] ? -1 : 1;
        }
        return a.moves.length - b.moves.length;
    });
    for (const {game} of ordered) {
        const [moves, reason] = truncate(game);
        let common = 0;
        while (common < moves.length && moves[common] === previous[common]) common++;
        const row = document.createElement('tr');
        row.title = `${game.White} – ${game.Black}, ${game.Date}`;
        const relative = relativeEvaluations(game);
        for (let i = 0; i < maxMoves; i++)
            moveCell(row, i >= common ? moves[i] ?? '' : '', relative[i] ?? null, i >= common && i < moves.length);
        cell(row, reason);
        cell(row, {'1-0': '1', '0-1': '0', '1/2-1/2': '=', remi: '='}[game.Result.toLowerCase()] ?? '*');
        const linkCell = cell(row, '');
        if (game.ChapterURL) {
            try {
                const url = new URL(game.ChapterURL);
                if (['http:', 'https:'].includes(url.protocol)) {
                    const link = document.createElement('a');
                    link.href = url.href;
                    link.textContent = 'Länk';
                    linkCell.append(link);
                }
            } catch { /* Saknad eller ogiltig länk lämnas tom. */ }
        }
        body.append(row);
        previous = moves;
    }
    document.querySelector('table').hidden = false;
}
async function main() {
    const data = dataSource;
    if (!data) return;
    const status = document.querySelector('#status');
    try {
        const url = new URL(data, location.href);
        if (url.origin !== location.origin) throw new Error('Datafilen måste finnas på samma plats som vyn.');
        if (!url.pathname.endsWith('.json')) throw new Error('Ange en W.json- eller B.json-fil.');
        status.textContent = 'Läser partier…';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const games = await response.json();
        render(games);
        document.title = `Schackträd – ${decodeURIComponent(url.pathname.split('/').slice(-2).join('/'))}`;
        status.textContent = `${games.length} partier`;
    } catch (error) {
        status.textContent = `Kunde inte läsa partier: ${error.message}`;
    }
}
main();
