(function () {
  "use strict";

  var EMPTY = ".";
  var DIAGONAL = "\u2022";
  var ROUND_SYMBOLS = "123456789abcdefghijklmnopqrstuvwxyz";

  function cleanText(node) {
    return (node ? node.textContent : "").replace(/\s+/g, " ").trim();
  }

  function firstInteger(value) {
    var match = String(value || "").replace(/\u00a0/g, " ").match(/\d+/);
    return match ? parseInt(match[0], 10) : NaN;
  }

  function findResultTable() {
    return Array.prototype.slice.call(document.querySelectorAll("table")).find(function (table) {
      var firstRow = table.rows[0];
      var header = cleanText(firstRow).toUpperCase();
      return header.indexOf("NAMN") !== -1 && header.indexOf("RANKING") !== -1;
    });
  }

  function readColumns(table) {
    var headerCells = Array.prototype.slice.call(table.rows[0].cells);
    var nameIndex = -1;
    var ratingIndex = -1;
    var roundIndexes = [];

    headerCells.forEach(function (cell, index) {
      var value = cleanText(cell).toUpperCase();
      if (value === "NAMN") nameIndex = index;
      if (value.indexOf("RANKING") === 0) ratingIndex = index;
    });

    headerCells.forEach(function (cell, index) {
      if (index > ratingIndex && /^\d+$/.test(cleanText(cell))) {
        roundIndexes.push(index);
      }
    });

    if (nameIndex < 0 || ratingIndex < 0 || roundIndexes.length === 0) {
      throw new Error("Kunde inte hitta NAMN, RANKING och rondkolumner.");
    }

    return {
      startIndex: Math.max(0, nameIndex - 2),
      nameIndex: nameIndex,
      ratingIndex: ratingIndex,
      roundIndexes: roundIndexes
    };
  }

  function readPlayers(table, columns) {
    return Array.prototype.slice.call(table.rows, 1).map(function (row) {
      var cells = Array.prototype.slice.call(row.cells);
      var startNo = firstInteger(cleanText(cells[columns.startIndex]));
      var name = cleanText(cells[columns.nameIndex]);
      var rating = firstInteger(cleanText(cells[columns.ratingIndex])) || 0;
      var rounds = columns.roundIndexes.map(function (cellIndex, index) {
        var cell = cells[cellIndex];
        var opponent = cell ? cell.querySelector('[class^="CP_"]') : null;
        return {
          round: index + 1,
          opponentStartNo: firstInteger(cleanText(opponent))
        };
      });

      return {
        startNo: startNo,
        name: name,
        rating: rating,
        rounds: rounds
      };
    }).filter(function (player) {
      return player.name && Number.isFinite(player.startNo);
    });
  }

  function makeMatrix(players) {
    var sorted = players.slice().sort(function (a, b) {
      return b.rating - a.rating || a.startNo - b.startNo || a.name.localeCompare(b.name);
    });
    var indexByStartNo = new Map();
    var matrix = sorted.map(function (_, row) {
      return sorted.map(function (_, col) {
        return row === col ? DIAGONAL : EMPTY;
      });
    });

    sorted.forEach(function (player, index) {
      indexByStartNo.set(player.startNo, index);
    });

    players.forEach(function (player) {
      var row = indexByStartNo.get(player.startNo);
      player.rounds.forEach(function (entry) {
        var col = indexByStartNo.get(entry.opponentStartNo);
        if (row === undefined || col === undefined) return;
        matrix[row][col] = roundSymbol(entry.round);
        matrix[col][row] = roundSymbol(entry.round);
      });
    });

    return {
      players: sorted,
      matrix: matrix
    };
  }

  function padLeft(value, width) {
    value = String(value);
    while (value.length < width) value = " " + value;
    return value;
  }

  function padRight(value, width) {
    value = String(value);
    while (value.length < width) value += " ";
    return value;
  }

  function roundSymbol(round) {
    return ROUND_SYMBOLS[round - 1] || "?";
  }

  function formatMatrix(result) {
    var players = result.players;
    var matrix = result.matrix;
    var cellWidth = 1;
    var rowNoWidth = String(players.length).length;
    var ratingWidth = Math.max(4, players.reduce(function (width, player) {
      return Math.max(width, String(player.rating || "").length);
    }, 0));
    var matrixWidth = players.length * cellWidth + Math.max(0, players.length - 1);
    var prefixWidth = rowNoWidth + 1 + ratingWidth;
    var lines = [];

    lines.push(
      Array(prefixWidth + 1).join(" ") + " " +
      players.map(function (_, index) {
        return padLeft((index + 1) % 10, cellWidth);
      }).join(" ")
    );

    players.forEach(function (player, index) {
      lines.push(
        padLeft(index + 1, rowNoWidth) + " " +
        padLeft(player.rating || "", ratingWidth) + " " +
        padRight(matrix[index].map(function (value) {
          return padLeft(value, cellWidth);
        }).join(" "), matrixWidth) +
        "  " + player.name
      );
    });

    return lines.join("\n");
  }

  function showMatrix(content) {
    var old = document.getElementById("round-matrix-bookmarklet");
    if (old) old.remove();

    var wrapper = document.createElement("div");
    wrapper.id = "round-matrix-bookmarklet";
    wrapper.innerHTML = '<pre class="rmb-output"></pre>';

    var style = document.createElement("style");
    style.textContent =
      "#round-matrix-bookmarklet{position:fixed;inset:0;z-index:2147483647;background:#fff;color:#111;overflow:auto}" +
      "#round-matrix-bookmarklet .rmb-output{margin:0;padding:12px;white-space:pre;font:13px Consolas,'Courier New',monospace;line-height:1.35}";

    wrapper.querySelector(".rmb-output").textContent = content;
    wrapper.appendChild(style);
    document.body.appendChild(wrapper);
  }

  try {
    var table = findResultTable();
    if (!table) throw new Error("Kunde inte hitta resultat-tabellen.");
    var players = readPlayers(table, readColumns(table));
    if (players.length === 0) throw new Error("Kunde inte l\u00e4sa deltagare.");
    showMatrix(formatMatrix(makeMatrix(players)));
  } catch (error) {
    alert("Rondmatris: " + error.message);
  }
}());
