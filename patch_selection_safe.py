import os, re, sys

ROOT = "."
EXTS = (".ts",".tsx",".js",".jsx")
files = []
for base,_,fs in os.walk(ROOT):
    for f in fs:
        if f.endswith(EXTS):
            p = os.path.join(base,f)
            # пропустим node_modules/.next/dist/out
            if any(seg in p for seg in ("/node_modules/","/.next/","/dist/","/out/")):
                continue
            files.append(p)

def inject_helpers(src:str)->str:
    if "function safeGetRange(" in src:
        return src
    m = re.search(r'(^import[^\n]*\n(?:import[^\n]*\n)*)', src, re.M)
    helpers = """
// === SAFE SELECTION HELPERS (auto-injected) ===
function __fallbackRange(): Range {
  const r = document.createRange();
  const root = (document.body || document.documentElement);
  // если в корне нет текстовых узлов, схлопываем в root
  try { r.setStart(root, 0); } catch { }
  try { r.collapse(true); } catch { }
  return r;
}
function safeGetRange(): Range {
  const sel = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection() : null;
  if (!sel || sel.rangeCount === 0) return __fallbackRange();
  try { return sel.getRangeAt(0); } catch { return __fallbackRange(); }
}
function safeGetRangeFrom(sel: Selection | null): Range {
  if (!sel || sel.rangeCount === 0) return __fallbackRange();
  try { return sel.getRangeAt(0); } catch { return __fallbackRange(); }
}
// === END SAFE SELECTION HELPERS ===
"""
    return (src[:m.end()] + helpers + src[m.end():]) if m else (helpers + src)

def patch_src(src:str)->str:
    # 1) document.getSelection().getRangeAt(0) / window.getSelection().getRangeAt(0)
    src = re.sub(r'(?:window|document)\.getSelection\(\)\.getRangeAt\(0\)', '/*SAFE*/(safeGetRange())', src)

    # 2) <var>.getRangeAt(0) -> safeGetRangeFrom(<var>)
    # (переменная-Selection: sel.getRangeAt(0) / selection.getRangeAt(0))
    src = re.sub(r'(\b[A-Za-z_]\w*)\.getRangeAt\(0\)', r'/*SAFE*/(safeGetRangeFrom(\1))', src)

    # 3) Частый случай: const range = /*SAFE*/(safeGetRange())
    src = re.sub(r'const\s+(\w+)\s*=\s*\/\*SAFE\*\/\(safeGetRange\(\)\)\s*;',
                 r'const \1 = safeGetRange();', src)

    src = re.sub(r'const\s+(\w+)\s*=\s*\/\*SAFE\*\/\(safeGetRangeFrom\((\w+)\)\)\s*;',
                 r'const \1 = safeGetRangeFrom(\2);', src)

    return src

patched = []
for p in files:
    with open(p, "r", encoding="utf-8", errors="ignore") as f:
        s = f.read()
    if ".getRangeAt(0)" not in s:
        continue
    s2 = inject_helpers(s)
    s2 = patch_src(s2)
    if s2 != s:
        with open(p, "w", encoding="utf-8") as f:
            f.write(s2)
        patched.append(p)

print("Patched files:" if patched else "No direct getRangeAt(0) usages found.")
for p in patched:
    print(" -", p)
