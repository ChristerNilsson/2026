'use strict';

// Bokstäverna går medurs: upp längs vänster sida, ned längs höger.
function createRounds(count) {
  if (!Number.isInteger(count) || count < 4 || count > 20 || count % 2) {
    throw new RangeError('Välj ett jämnt antal deltagare mellan 4 och 20.');
  }
  const rounds = [];
  let seats = Array.from({ length: count }, (_, i) => i + 1);
  for (let round = 0; round < count - 1; round++) {
    rounds.push(Array.from({ length: count / 2 }, (_, row) => {
      const left = count / 2 - 1 - row;
      const right = count - 1 - left;
      return { left: seats[round % 2 && left === 0 ? right : left], right: seats[round % 2 && left === 0 ? left : right], leftSeat: left, rightSeat: right };
    }));
    seats = [seats[0], seats[count - 1], ...seats.slice(1, count - 1)];
  }
  return rounds;
}

const letter = index => String.fromCharCode(97 + index);

function printTickets(group) {
  const container = document.getElementById('tickets');
  container.replaceChildren();
  let sheet;
  for (let seat = 0; seat < 20; seat++) {
    if (seat === 0) {
      sheet = document.createElement('section');
      sheet.className = 'ticket-sheet';
      container.append(sheet);
    }
    const card = document.createElement('article');
    card.className = 'ticket';
    const heading = document.createElement('div');
    heading.className = 'ticket-heading';
    const groupText = document.createElement('span');
    groupText.textContent = group;
    const seatText = document.createElement('span');
    seatText.textContent = letter(seat);
    heading.append(groupText, seatText);
    const color = document.createElement('div');
    color.className = 'ticket-color';
    color.textContent = seat % 2 === 0 ? 'WHITE' : 'BLACK';
    card.append(heading, color);
    sheet.append(card);
  }
  document.body.classList.add('print-tickets');
  window.print();
}

function render(count) {
  const rounds = createRounds(count);
  document.getElementById('summary').textContent = `${count / 2} bräden · ${count - 1} ronder · ${count * (count - 1) / 2} möten`;
  const entries = Array.from({ length: count }, () => []);
  rounds.forEach(boards => boards.forEach(board => {
    for (const side of ['left', 'right']) {
      const seat = board[`${side}Seat`];
      entries[board[side] - 1].push({ seat, opponent: board[side === 'left' ? 'right' : 'left'] });
    }
  }));
  // A4 liggande: 190 mm höjd innanför marginalerna.
  // Måtten för 20 deltagare används på samtliga blanketter.
  const printCellSize = 182 / 20;
  let html = `<section class="berger-sheet" style="--round-count:${count - 1};--print-cell:${printCellSize}mm"><h2>Bergertabell · ${count} deltagare</h2><p class="print-key">Bokstav = egen plats · nummer = motståndare · bokstav till vänster = vit, till höger = svart</p><table class="berger"><colgroup><col class="number-col"><col class="name-col"><col class="elo-col">${'<col class="round-col">'.repeat(count - 1)}<col class="points-col"><col class="kvp-col"></colgroup><thead><tr><th scope="col">Nr</th><th scope="col">Namn</th><th scope="col">Elo</th>`;
  rounds.forEach((_, i) => { html += `<th scope="col">${i + 1}</th>`; });
  html += '<th scope="col">Poäng</th><th scope="col">KVP</th></tr></thead><tbody>';
  entries.forEach((cells, i) => {
    html += `<tr><th scope="row">${i + 1}</th><td class="blank name-cell"></td><td class="blank"></td>`;
    cells.forEach(({ seat, opponent }) => {
      const white = seat % 2 === 0;
      html += `<td class="round-cell" aria-label="${white ? 'Vit' : 'Svart'}, plats ${letter(seat)}, mot ${opponent}"><div class="square"><span class="entry ${white ? 'plays-white' : 'plays-black'}"><span class="place">${letter(seat)}</span><span class="opponent">${opponent}</span></span></div></td>`;
    });
    html += '<td class="blank"></td><td class="blank"></td></tr>';
  });
  html += '</tbody></table><p class="table-note">Kolumnerna visar ronderna. Spelare 1 stannar vid första brädet och byter färg varje rond.</p></section>';
  document.getElementById('rounds').innerHTML = html;
}

if (typeof document !== 'undefined') {
  const select = document.getElementById('count');
  for (let count = 4; count <= 20; count += 2) select.add(new Option(`${count} deltagare`, count, false, count === 10));
  select.addEventListener('change', () => render(Number(select.value)));
  document.getElementById('print').addEventListener('click', () => {
    document.body.classList.remove('print-tickets');
    window.print();
  });
  document.getElementById('print-tickets').addEventListener('click', () => {
    const groupInput = document.getElementById('group');
    if (!groupInput.value.trim()) {
      groupInput.setCustomValidity('Ange en gruppbeteckning, till exempel A.');
      groupInput.reportValidity();
      return;
    }
    printTickets(groupInput.value.trim());
  });
  document.getElementById('group').addEventListener('input', event => event.target.setCustomValidity(''));
  window.addEventListener('afterprint', () => document.body.classList.remove('print-tickets'));
  render(10);
}
if (typeof module !== 'undefined') module.exports = { createRounds };
