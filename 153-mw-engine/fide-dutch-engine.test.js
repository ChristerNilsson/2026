"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {nextPairing,selfTest} = require("./fide-dutch-engine.js");

console.log(selfTest());
const tournament = {
  totalRounds:3,
  players:Array.from({length:8},(_,i) => ({id:`P${i+1}`,name:`Player ${i+1}`,elo:2400-i*100})),
  rounds:[]
};
const original = JSON.stringify(tournament);
const first = nextPairing(tournament);
assert.equal(JSON.stringify(tournament),original);
assert.equal(first.pairings.length,4);
assert.deepEqual(first.pairings.map(p => [p.whiteId,p.blackId]),nextPairing(tournament).pairings.map(p => [p.whiteId,p.blackId]));
const seen = new Set();
for (let r=1;r<=3;r++) {
  const round = nextPairing(tournament);
  assert.equal(round.roundNumber,r);
  assert.equal(new Set(round.pairings.flatMap(p => [p.whiteId,p.blackId])).size,8);
  for (const p of round.pairings) {
    const key = [p.whiteId,p.blackId].sort().join("/");
    assert.ok(!seen.has(key),"Repeated opponent");
    seen.add(key);
    p.result = "1-0";
  }
  tournament.players = round.players;
  tournament.rounds.push({roundNumber:r,pairings:round.pairings});
}
assert.throws(() => nextPairing(tournament),/complete/);
const odd = nextPairing({players:first.players.slice(0,5)});
assert.equal(odd.pairings.filter(p => p.kind === "pab").length,1);
assert.equal(odd.pairings.find(p => p.kind === "pab").pabId,"P5");
const absent = nextPairing({players:first.players.map(p => ({...p,nextRoundStatus:"unplayed-draw"}))});
assert.equal(absent.pairings.length,8);
assert.ok(absent.pairings.every(p => p.kind === "unplayed" && p.awardedPoints === .5));
assert.throws(() => nextPairing({players:[first.players[0],first.players[0]]}),/duplicate/);
assert.throws(() => nextPairing({players:first.players,rounds:[{pairings:[{whiteId:"P1",blackId:"P2",result:"*"}]}]}),/result/);
assert.throws(() => nextPairing({players:first.players,rounds:[{pairings:[{whiteId:"P1",blackId:"unknown",result:"1-0"}]}]}),/unknown/);
const browser = vm.createContext({performance});
vm.runInContext(fs.readFileSync("./fide-dutch-engine.js","utf8"),browser);
assert.equal(browser.FideDutchEngine.nextPairing({players:first.players}).pairings.length,4);
console.log("API tests passed (three rounds, byes, absences, validation, immutability, browser).");
