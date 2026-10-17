const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {context} = require('./app.test.cjs');
const parseDocument = require('./fixture-document.cjs');
async function main() {
  const c = context(false,{window:{BERGER_LIVE:false,BERGER_VIEW:'standings'}});
  c.source = parseDocument(readFileSync('tests/fixtures/w1.html','utf8'));
  vm.runInContext(`
    availableGroups = discoverGroups(source); configureGroups('W1-',7);
    const rows = parseStandings(source,'A');
    assert.equal(rows.length,6);
    assert.equal(rows[0].name,'Stephan Wagner');
    assert.equal(rows[0].points,4);
    assert.equal(rows[0].played,5);
    assert.equal(rows[0].elo,2276);
    assert.equal(rows[0].club,'Upsala ASS');
    assert.equal(rows[0].tie,'8.00');
    assert.throws(()=>parseStandings(source,'B'),/Fel turnerings-ID/);
    assert.equal(parsePoints('½'),.5);
    assert.equal(parsePoints('3½'),3.5);
    assert.equal(parsePoints('3,5'),3.5);
    assert.equal(parsePoints('0.0'),0);
    assert.throws(()=>parsePoints('okänt'),/Ogiltig poäng/);
    games = [
      {...rows[0],group:'B',points:20,pointsText:'20',sourceOrder:0},
      {...rows[0],name:'Later tie',points:9.5,pointsText:'9½',sourceOrder:2},
      {...rows[0],name:'Ten',points:10,pointsText:'10',sourceOrder:3},
      {...rows[0],name:'Earlier tie',points:9.5,pointsText:'9.5',sourceOrder:1}
    ];
    const sorted = currentGames();
    assert.equal(sorted[0].name,'Ten','Sort by numeric points descending');
    assert.equal(sorted[1].name,'Earlier tie','Preserve official source order for ties');
    assert.equal(sorted[2].name,'Later tie');
    assert.equal(sorted[3].group,'B','Group takes priority over points');
    render();
    const first = $('games').children[0].children;
    assert.equal(first.length,8);
    assert.equal(first[2].textContent,'Ten');
    assert.equal(first[6].textContent,'10');
    assert.equal(first[6].className,'points');
    assert.ok(!first.some(cell=>cell.className==='paper-result'));
  `,c);
  c.source = parseDocument(readFileSync('tests/fixtures/v6.html','utf8'));
  vm.runInContext(`
    availableGroups = discoverGroups(source); configureGroups('V6_',13);
    const v6 = parseStandings(source,'A');
    assert.equal(v6.length,4);
    assert.equal(v6[0].name,'Patrik Nilsson Hask');
    assert.equal(v6[0].points,2.5);
  `,c);
  const html = readFileSync('dist/standings.html','utf8');
  assert.doesNotMatch(html,/id="(?:round|previous|next)"/);
  assert.match(html,/bergergrupper-standings/);
  assert.match(html,/>Poäng<\/th>/);
  const loader = vm.runInNewContext(readFileSync('dist/standings-bookmarklet.js','utf8')+'\nBOOKMARKLET_URL;');
  assert.match(loader,/\/bergergrupper-standings\.js\?v=/);
  new vm.Script(loader.slice('javascript:'.length));
  let output = '';
  vm.runInNewContext(readFileSync('dist/bergergrupper-standings.js','utf8'),{
    window:{BERGER_BOOT:{sourceUrl:'https://member.schack.se/ShowTournamentServlet?id=18815'}},URL,
    document:{open(){},write(html){output=html;},close(){}}
  });
  assert.match(output,/"BERGER_VIEW":"standings"/);
  assert.doesNotMatch(output,/<script[^>]+src=|<link[^>]+stylesheet/);
  const scripts = [...output.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,2); scripts.forEach(([,script])=>new vm.Script(script));
  assert.equal(readFileSync('dist/bergergrupper-standings-bookmarklet.txt','utf8').trim(),loader);
  assert.ok(readFileSync('README.md','utf8').includes(loader));
  console.log('Passed: real W1/V6 standings, numeric score parsing/sorting, official tie order, standings columns and independent GitHub bookmarklet.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
