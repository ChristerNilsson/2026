(() => {
	let colsCount = 6;
	const norm = s => s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
	const clean = s => norm(s.replace(/\s+\d{3,4}[A-Z]?$/, ""));
	const esc = s => s.replace(/[&<>"']/g, m => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m]));
	const rows = [...document.querySelectorAll("tr")];
	const title = norm(document.querySelector("h1,h2,h3,b")?.innerText || document.title || "Turnering");
	const params = new URLSearchParams(location.search);
	let r = params.get("round");
	if (!r) {
		let max = 0;
		document.body.innerText.replace(/Rond\s+(\d+)/gi, (_, n) => { max = Math.max(max, parseInt(n)); });
		r = max || "";
	}
	const rond = r ? "Rond " + r : "";
	const out = [];
	let started = false;
	for (const tr of rows) {
		const txt = norm(tr.innerText);
		if (/Bord\s+VIT(?:\s+ELO)?\s+SVART(?:\s+ELO)?\s+RESULTAT/i.test(txt)) {
			started = true;
			continue;
		}
		if (!started) continue;
		let bord, vit, svart;
		let m = txt.match(/^(\d+)\s+(.+?)\s+\d{3,4}[A-Z]?\s*-\s*(.+?)\s+\d{3,4}[A-Z]?\s+[01½]\s*-\s*[01½](?:\s*w\.o)?$/i);
		if (m) {
			bord = m[1]; vit = m[2]; svart = m[3];
		} else {
			m = txt.match(/^(\d+)\s+(.+?)\s+[01½]\s*-\s*[01½](?:\s*w\.o)?$/i);
			if (!m) continue;
			bord = m[1];
			const pair = m[2];
			const p = pair.split(/\s+-\s+/);
			vit = clean(p[0]);
			svart = clean(p.slice(1).join(" - "));
		}
		out.push({ namn: clean(vit), bf: bord + "W" });
		out.push({ namn: clean(svart), bf: bord + "B" });
	}
	out.sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
	function render() {
		const percol = Math.ceil(out.length / colsCount);
		let cols = "";
		for (let i = 0; i < colsCount; i++) {
			const part = out.slice(i * percol, (i + 1) * percol);
			cols += `<table>${part.map(x => `<tr><td class="name">${esc(x.namn)}</td><td class="bf">${esc(x.bf)}</td></tr>`).join("")}</table>`;
		}
		document.body.innerHTML = `<style>*{color:#000!important}body{font-family:sans-serif;margin:16px}.hdr{display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center;margin-bottom:12px}.left{text-align:left}.center{text-align:center}.right{text-align:right}.cols{display:flex;gap:12px;align-items:flex-start;justify-content:center}table{border-collapse:collapse}td{border:1px solid #999;padding:3px 6px;white-space:nowrap}.name{text-align:left}.bf{font-weight:bold;text-align:center}.info{font-size:12px;color:#444!important}</style><div class="hdr"><div class="left">${esc(rond)}</div><div class="center">${esc(title)}</div><div class="right info">Kolumner: ${colsCount} [+/-]</div></div><div class="cols">${cols}</div>`;
	}
	render();
	document.addEventListener("keydown", e => {
		if (e.key === "+") { colsCount++; render(); }
		if (e.key === "-" && colsCount > 1) { colsCount--; render(); }
	});
})()