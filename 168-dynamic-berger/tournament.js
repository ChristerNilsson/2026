(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function load(input) {
    const data = clone(input);
    if (!Array.isArray(data.spelare) || !data.spelare.length || !Array.isArray(data.ronder) || !data.ronder.length) throw Error('Filen behöver innehålla spelare och ronder.');
    const ids = new Set();
    for (const p of data.spelare) {
      if (!Number.isInteger(p.id) || ids.has(p.id) || typeof p.signatur !== 'string' || !Number.isFinite(p.elo)) throw Error('Ogiltig eller dubblerad spelare.');
      ids.add(p.id);
    }
    data.ronder.forEach((r, i) => {
      if (r.rond !== i + 1 || !r.grupper) throw Error('Ronderna måste vara numrerade i ordning från 1.');
      const active = Object.values(r.grupper).flat();
      if (active.some(id => !ids.has(id)) || new Set(active).size !== active.length || active.some(id => (r.inaktiva || []).includes(id))) throw Error('Ogiltiga gruppdeltagare.');
      r.resultat = {...(r['resultat:'] || {}), ...(r.resultat || {})};
      delete r['resultat:'];
      const paired = new Set();
      for (const [group, pairs] of Object.entries(r.lottning || {})) {
        if (!Array.isArray(pairs) || !r.grupper[group]) throw Error('Ogiltig lottning.');
        for (const pair of pairs) {
          if (!Array.isArray(pair) || pair.length !== 2) throw Error('Varje parti behöver två spelare.');
          for (const id of pair) {
            if (!r.grupper[group].includes(id) || paired.has(id)) throw Error('En spelare saknas eller är lottad flera gånger.');
            paired.add(id);
          }
        }
        const result = r.resultat[group] ?? '';
        if (typeof result !== 'string' || /[^01r ]/.test(result) || result.length > pairs.length) throw Error('Resultat ska innehålla 0, r, 1 eller mellanslag.');
        r.resultat[group] = result.padEnd(pairs.length, ' ');
      }
    });
    data.app = data.app || {};
    const drawn = data.app.lottadeRonder || [];
    if (!Array.isArray(drawn) || drawn.some((n, i) => n !== i + 1 || n > data.ronder.length)) throw Error('Ogiltig rondstatus.');
    data.app.lottadeRonder = drawn;
    return data;
  }
  function rows(data, number) {
    const r = data.ronder[number - 1];
    return Object.entries(r.lottning || {}).flatMap(([group, pairs]) => pairs.map(([white, black], index) => ({group, index, white, black, result: r.resultat[group][index]})));
  }
  function pending(data, number) {
    const r = data.ronder[number - 1];
    const paired = new Set(rows(data, number).flatMap(p => [p.white, p.black]));
    return Object.values(r.grupper).flat().filter(id => !paired.has(id));
  }
  function setResult(data, number, row, value) {
    if (!data.app.lottadeRonder.includes(number)) throw Error('Lotta ronden först.');
    if (!['0', '1', 'r', ' '].includes(value)) throw Error('Ogiltigt resultat.');
    const match = rows(data, number)[row];
    if (!match) throw Error('Bordet finns inte.');
    const r = data.ronder[number - 1];
    const chars = [...r.resultat[match.group]];
    chars[match.index] = value;
    r.resultat[match.group] = chars.join('');
  }
  function draw(data) {
    const number = data.app.lottadeRonder.length + 1;
    if (number > data.ronder.length) throw Error('Alla ronder är lottade.');
    if (number > 1 && rows(data, number - 1).some(p => p.result === ' ')) throw Error('Mata in alla resultat i föregående rond först.');
    const remaining = data.spelare.filter(p => !(data.avhopp || []).some(a => a.spelare === p.id && a.rond <= number));
    if (remaining.length < data.ronder.length) throw Error('Turneringen är avslutad: färre kvarvarande deltagare än ronder.');
    if (!rows(data, number).length && Object.values(data.ronder[number - 1].grupper).flat().length) throw Error('Ronden saknar lottning.');
    data.app.lottadeRonder.push(number);
    return number;
  }
  function serialize(data) {
    function format(value, depth = 0) {
      const pad = '    '.repeat(depth), inner = pad + '    ';
      if (Array.isArray(value)) {
        if (value.every(item => item === null || typeof item !== 'object' || (Array.isArray(item) && item.every(n => typeof n === 'number')))) return JSON.stringify(value);
        return '[\n' + value.map(item => inner + format(item, depth + 1)).join(',\n') + '\n' + pad + ']';
      }
      if (value && typeof value === 'object') {
        if ('id' in value && 'signatur' in value) return JSON.stringify(value);
        return '{\n' + Object.entries(value).map(([key, item]) => inner + JSON.stringify(key) + ': ' + format(item, depth + 1)).join(',\n') + '\n' + pad + '}';
      }
      return JSON.stringify(value);
    }
    return format(data) + '\n';
  }
  const api = {load, rows, pending, setResult, draw, serialize};
  if (typeof module !== 'undefined') module.exports = api;
  else root.Tournament = api;
})(globalThis);
