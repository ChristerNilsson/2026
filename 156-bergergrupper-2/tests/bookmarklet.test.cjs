const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const url = vm.runInNewContext(fs.readFileSync('dist/bookmarklet.js','utf8') + '\nBOOKMARKLET_URL;');
const code = url.slice('javascript:'.length);
const bundle = fs.readFileSync('dist/bergergrupper.js','utf8');
new vm.Script(code); new vm.Script(bundle);

async function main() {
  let opened = 0, output = '', appended = '';
  const alerts = [];
  const child = {document:{body:{},head:{append(script){appended = script.textContent;}},createElement(){return {};},open(){},write(html){output=html;},close(){}},closed:false};
  let requested = '';
  const run = (hostname, popup = child, ok = true) => vm.runInNewContext(code, {
    location:{hostname,protocol:'https:',href:'https://' + hostname + '/ShowTournamentServlet?id=19022&round=3'},
    open(){opened++; return popup;},alert:message => alerts.push(message),
    fetch:async value => {requested=value; return {ok,status:404,text:async()=>bundle};},Date,
  });
  const settle = () => new Promise(resolve => setImmediate(resolve));
  run('example.com'); assert.equal(opened,0); assert.match(alerts.pop(),/member.schack.se/);
  run('member.schack.se',null); assert.match(alerts.pop(),/popup/);
  run('member.schack.se'); await settle();
  assert.match(requested,/raw\.githubusercontent\.com\/ChristerNilsson\/2026\/main\/156-bergergrupper-2\/dist\/bergergrupper\.js\?v=/);
  assert.equal(appended,bundle);
  assert.match(child.BERGER_BOOT.sourceUrl,/id=19022&round=3/);
  vm.runInNewContext(bundle,{window:child,document:child.document,URL,location:{}});
  assert.match(output,/"BERGER_LIVE":true/);
  assert.match(output,/"BERGER_ROUND":3/);
  assert.match(output,/"BERGER_SOURCE_URL":"https:\/\/member.schack.se/);
  assert.doesNotMatch(output,/<script[^>]+src=|<link[^>]+stylesheet/);
  assert.doesNotMatch(output,/__BERGER_CONFIG__/);
  const scripts = [...output.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,2); scripts.forEach(([,script])=>new vm.Script(script));
  run('member.schack.se',child,false); await settle();
  assert.match(child.document.body.textContent,/GitHub HTTP 404/);
  assert.equal(fs.readFileSync('dist/bergergrupper-bookmarklet.txt','utf8').trim(),url);
  assert.ok(fs.readFileSync('README.md','utf8').includes(url));
  console.log('Passed: GitHub loader, popup handling, source URL, bundle embedding, syntax, errors and README installation code.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
