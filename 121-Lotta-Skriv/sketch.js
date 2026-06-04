(() => {
  "use strict";

  const DEFAULT_GROUP_SIZE = 4;
  const DEFAULT_PLAYER_COUNT = 48;
  const VALID_RESULTS = new Set(["1", "0", "r"]);
  const RESULT_LABELS = { "1": "1 - 0", "0": "0 - 1", r: "½ - ½" };
  const SCORE = { "1": [1, 0], "0": [0, 1], r: [0.5, 0.5] };
  const params = new URLSearchParams(location.search);
  const tournament = params.get("turnering") || "Bergerturnering";
  const groupSize = Number(params.get("n") || DEFAULT_GROUP_SIZE);

  const fail = (message) => {
    document.body.innerHTML = "";
    const error = document.createElement("p");
    error.className = "fatal";
    error.textContent = message;
    document.body.append(error);
    throw new Error(message);
  };

  const parsePlayer = (value, index) => {
    const match = value.trim().match(/^(\d{4})\s+(.+)$/);
    if (!match) fail(`Spelare ${index + 1} måste börja med ett fyrsiffrigt Elo-tal.`);
    return { elo: Number(match[1]), name: match[2].trim(), order: index };
  };

  const suppliedPlayers = (params.get("players") || "")
    .split("_")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(parsePlayer)
    .sort((a, b) => b.elo - a.elo || a.order - b.order);

  const players = suppliedPlayers.length
    ? suppliedPlayers
    : Array.from({ length: DEFAULT_PLAYER_COUNT }, (_, index) => ({
        elo: DEFAULT_PLAYER_COUNT - index,
        name: `Spelare ${index + 1}`,
        order: index,
      }));

  if (!Number.isInteger(groupSize) || groupSize < 4 || groupSize % 2 !== 0) {
    fail("Parametern n måste vara ett jämnt heltal som är minst 4.");
  }
  if (players.length % groupSize !== 0) {
    fail(`Antalet spelare (${players.length}) måste vara jämnt delbart med n (${groupSize}).`);
  }
  if (typeof window.berger !== "function") {
    fail("Bergerlottningen kunde inte laddas från berger_4.js.");
  }

  const groupName = (index) => {
    let name = "";
    let value = index;
    do {
      name = String.fromCharCode(65 + (value % 26)) + name;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);
    return name;
  };

  const debugBergerSchedule = (size) => {
    const rounds = window.berger(size);
    console.log(`Berger schedule for ${size} players:`);
    rounds.forEach((pairs, round) => {
      console.log(`R${round + 1}: ${pairs.map(([a, b]) => `(${a}, ${b})`).join(", ")}`);
    });
    return rounds;
  };

  const schedule = window.berger(groupSize).map((round) => round.map(([white, black]) => [white - 1, black - 1]));
  if (params.get("debug") === "berger") {
    debugBergerSchedule(groupSize);
  }

  const groups = Array.from({ length: players.length / groupSize }, (_, groupIndex) => ({
    name: groupName(groupIndex),
    players: players.slice(groupIndex * groupSize, (groupIndex + 1) * groupSize).map((player, playerIndex) => ({
      id: playerIndex + 1,
      name: player.name,
      elo: player.elo,
    })),
  }));

  const boardCount = players.length / 2;
  const roundCount = groupSize - 1;
  const boardsByRound = schedule.map((round) => {
    let board = 1;
    return groups.flatMap((group) =>
      round.map(([whiteIndex, blackIndex]) => ({
        board: board++,
        group: group.name,
        white: group.players[whiteIndex],
        black: group.players[blackIndex],
      })),
    );
  });

  const readRound = (round) => {
    const value = params.get(`r${round + 1}`) || "";
    return Array.from({ length: boardCount }, (_, index) => (VALID_RESULTS.has(value[index]) ? value[index] : "."));
  };

  const results = Array.from({ length: roundCount }, (_, round) => readRound(round));
  const inputState = results.map((round) => round.map((result) => (result === "." ? "" : "pending")));
  let selectedRound = 0;
  let selectedBoard = 0;

  const writeRound = (round) => {
    const name = `r${round + 1}`;
    const value = results[round].join("").replace(/\.+$/, "");
    if (value) params.set(name, value);
    else params.delete(name);
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  };

  const resultForPlayer = (round, group, player) => {
    const boards = boardsByRound[round];
    const boardIndex = boards.findIndex(
      (board) => board.group === group.name && (board.white === player || board.black === player),
    );
    const board = boards[boardIndex];
    const result = results[round][boardIndex];
    if (!board) return { label: "", points: 0, opponent: null, complete: false };
    const isWhite = board.white === player;
    const opponent = isWhite ? board.black : board.white;
    if (result === ".") return { label: "", points: 0, opponent, complete: false };
    const points = SCORE[result][isWhite ? 0 : 1];
    const marker = result === "r" ? "=" : String(points);
    return { label: `${opponent.id}${isWhite ? "w" : "b"}${marker}`, points, opponent, complete: true };
  };

  const compareTieBreaks = (a, b, tied) => {
    const canUseHeadToHead = tied.every((standing) =>
      tied.every(
        (opponent) =>
          standing === opponent ||
          standing.rounds.some((round) => round.opponent === opponent.player && round.complete),
      ),
    );
    if (canUseHeadToHead) {
      const headToHead = (standing) =>
        standing.rounds
          .filter((round) => tied.some((opponent) => opponent.player === round.opponent))
          .reduce((sum, round) => sum + round.points, 0);
      const difference = headToHead(b) - headToHead(a);
      if (difference) return difference;
    }
    return b.sonnebornBerger - a.sonnebornBerger || b.wins - a.wins || a.id - b.id;
  };

  const sortedGroupStandings = (group) => {
    const groupStandings = group.players.map((player) => {
      const rounds = Array.from({ length: roundCount }, (_, round) => resultForPlayer(round, group, player));
      return {
        group: group.name,
        id: player.id,
        name: player.name,
        elo: player.elo,
        player,
        rounds,
        points: rounds.reduce((sum, result) => sum + result.points, 0),
        wins: rounds.filter((result) => result.points === 1).length,
        sonnebornBerger: 0,
      };
    });
    const byPlayer = new Map(groupStandings.map((standing) => [standing.player, standing]));
    groupStandings.forEach((standing) => {
      standing.sonnebornBerger = standing.rounds.reduce(
        (sum, round) => sum + (round.opponent ? round.points * byPlayer.get(round.opponent).points : 0),
        0,
      );
    });
    return groupStandings.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const tied = groupStandings.filter((standing) => standing.points === a.points);
      return compareTieBreaks(a, b, tied);
    });
  };

  const standings = () => groups.flatMap(sortedGroupStandings);

  const appendCell = (row, value, className = "") => {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) cell.className = className;
    row.append(cell);
  };

  const appendHeader = (table, labels) => {
    const row = document.createElement("tr");
    labels.forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      row.append(cell);
    });
    table.append(row);
  };

  const renderBoards = (container) => {
    const heading = document.createElement("h2");
    heading.textContent = `${tournament} - Rond ${selectedRound + 1}`;
    container.append(heading);
    const table = document.createElement("table");
    table.className = "boards";
    appendHeader(table, ["Grupp", "Bord", "Vit", "Resultat", "Svart"]);
    boardsByRound[selectedRound].forEach((board, index) => {
      const row = document.createElement("tr");
      if (index === selectedBoard) row.classList.add("selected");
      if (inputState[selectedRound][index] === "mismatch") row.classList.add("mismatch");
      if (inputState[selectedRound][index] === "pending") row.classList.add("pending");
      appendCell(row, board.group, "center");
      appendCell(row, board.board, "center");
      appendCell(row, board.white.name);
      appendCell(row, RESULT_LABELS[results[selectedRound][index]] || "-", "center result");
      appendCell(row, board.black.name);
      table.append(row);
    });
    container.append(table);
  };

  const renderStandings = (container) => {
    const heading = document.createElement("h2");
    heading.textContent = `${tournament} - Ställning`;
    container.append(heading);
    const table = document.createElement("table");
    table.className = "standings";
    appendHeader(table, [
      "Grupp",
      "Id",
      "Namn",
      "Elo",
      ...Array.from({ length: roundCount }, (_, index) => index + 1),
      "Poäng",
    ]);
    standings().forEach((standing) => {
      const row = document.createElement("tr");
      appendCell(row, standing.group, "center");
      appendCell(row, standing.id, "center");
      appendCell(row, standing.name);
      appendCell(row, standing.elo, "center");
      standing.rounds.forEach((round) => appendCell(row, round.label, "center"));
      appendCell(row, String(standing.points), "center");
      table.append(row);
    });
    container.append(table);
  };

  const render = () => {
    document.body.innerHTML = `
      <style>
        *{box-sizing:border-box}body{margin:0;padding:16px;color:#111;background:#fff;font:14px/1.35 Arial,sans-serif}
        h1{margin:0 0 4px;font-size:22px}h2{margin:18px 0 6px;font-size:17px}
        .help{margin:0 0 10px;color:#555}table{border-collapse:collapse;margin-bottom:16px}
        th,td{border:1px solid #999;padding:3px 7px;text-align:left}.center{text-align:center}.result{min-width:64px}
        .selected{outline:3px solid #1677ff;outline-offset:-3px}.pending{background:#fff1b8}.mismatch{background:#ffb3b3}
        .fatal{color:#900;font-weight:bold}
        @media print{.help{display:none}.selected{outline:0}}
      </style>
    `;
    const title = document.createElement("h1");
    title.textContent = tournament;
    document.body.append(title);
    const help = document.createElement("p");
    help.className = "help";
    help.textContent = "← → rond • ↑ ↓ bord • 1 vit vinst • 0 vit förlust • space/r remi • Delete radera";
    document.body.append(help);
    renderBoards(document.body);
    renderStandings(document.body);
  };

  const advanceBoard = () => {
    selectedBoard = (selectedBoard + 1) % boardCount;
  };

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === "ArrowLeft") selectedRound = (selectedRound + roundCount - 1) % roundCount;
    else if (event.key === "ArrowRight") selectedRound = (selectedRound + 1) % roundCount;
    else if (event.key === "ArrowUp") selectedBoard = (selectedBoard + boardCount - 1) % boardCount;
    else if (event.key === "ArrowDown") selectedBoard = (selectedBoard + 1) % boardCount;
    else if (event.key === "Delete") {
      results[selectedRound][selectedBoard] = ".";
      inputState[selectedRound][selectedBoard] = "";
      writeRound(selectedRound);
      advanceBoard();
    } else if (VALID_RESULTS.has(event.key.toLowerCase()) || event.key === " ") {
      const value = event.key === " " ? "r" : event.key.toLowerCase();
      const stored = results[selectedRound][selectedBoard];
      const state = inputState[selectedRound][selectedBoard];
      if (stored === ".") {
        results[selectedRound][selectedBoard] = value;
        inputState[selectedRound][selectedBoard] = "pending";
        writeRound(selectedRound);
        advanceBoard();
      } else if (state === "pending") {
        inputState[selectedRound][selectedBoard] = stored === value ? "confirmed" : "mismatch";
        advanceBoard();
      } else advanceBoard();
    } else return;
    event.preventDefault();
    render();
  });

  render();
})();
