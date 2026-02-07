from pathlib import Path
import importlib.util
import time

def load_module_from_path(path: Path):
	module_name = "_mod_" + "_".join(path.with_suffix("").parts)
	spec = importlib.util.spec_from_file_location(module_name, path)
	mod = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(mod)
	return mod

root = Path("root")
for script in root.rglob("index.py"):
	start = time.time()
	script_dir = script.parent
	out_file = f"{script_dir / "index.html"}"
	mod = load_module_from_path(script)
	res = mod.worker()
	with open(out_file, "w", encoding="utf-8") as g:
		g.write(res)
	print(script_dir,f"{ (time.time() - start) : .3f} s")
