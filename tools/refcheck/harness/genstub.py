import re, sys, os, collections
# ใช้: python3 genstub.py javap.txt stub_dir REF_PKG_PATH (เช่น com/example/app)
PKG = sys.argv[3].rstrip('/') + '/'
src = open(sys.argv[1]).read().split('\n')
out = sys.argv[2]
EXT = re.compile(r'^(android|dalvik)/')
classes = collections.defaultdict(lambda: {'iface': False, 'methods': set(), 'fields': set(), 'super': None})
thai_super = {}
thai_methods = collections.defaultdict(set)
cur = None
hdr = re.compile(r'^(?:public |private |protected |final |abstract |static |synchronized )*(class|interface|enum) (\S+)(?: extends (\S+))?(?: implements (.*))? \{')
mdecl = re.compile(r'^  (?:[\w$<>\[\]., ]+ )?([\w$<>]+)\((.*)\)( throws .*)?;$')
ref = re.compile(r'(invokestatic|invokevirtual|invokespecial|invokeinterface|getstatic|putstatic|getfield|putfield|new|checkcast|anewarray|instanceof|ldc)\s.*// (Method|InterfaceMethod|Field|class) (\S+?)(?:\.("?[\w$<>]+"?):(\S+))?$')
pending = []
for line in src:
    m = hdr.match(line)
    if m:
        cur = m.group(2).replace('.', '/')
        sup = m.group(3)
        if sup: thai_super[cur] = sup.replace('.', '/')
        for s in [sup] if sup and m.group(1) != 'interface' else []:
            s = s.replace('.', '/')
            if EXT.match(s): classes[s]
        ifs = (m.group(4) or '')
        if m.group(1) == 'interface' and sup: ifs = sup + ',' + ifs
        for i in ifs.split(','):
            i = i.strip().replace('.', '/')
            if i and EXT.match(i): classes[i]['iface'] = True
        continue
    md = re.match(r'^  .*?([\w$]+)\(([^)]*)\)', line)
    if md and cur and not line.startswith('    '):
        thai_methods[cur].add(md.group(1))
    r = ref.search(line)
    if r:
        op, kind, owner, name, desc = r.groups()
        if owner.startswith('"['): continue
        owner = owner.strip('"')
        if owner.startswith('['): continue
        pending.append((op, kind, owner, name, desc))
# record descriptor-referenced classes too
def types_in(desc):
    return re.findall(r'L([^;]+);', desc or '')
for op, kind, owner, name, desc in pending:
    for t in types_in(desc):
        if EXT.match(t): classes[t]
    if kind == 'class':
        o = re.sub(r'^\[+L?|;$', '', owner)
        if EXT.match(o): classes[o]
        continue
    tgt = owner
    if not EXT.match(owner):
        if not owner.startswith(PKG): continue
        if name and name.strip('"') == '<init>': continue
        if name and name.strip('"') in thai_methods.get(owner, ()) : continue
        # inherited from android base: walk up
        o = owner; seen = 0
        while o in thai_super and not EXT.match(thai_super[o]) and seen < 20:
            if name and name.strip('"') in thai_methods.get(thai_super[o], ()): o = None; break
            o = thai_super[o]; seen += 1
        if not o or o not in thai_super: continue
        tgt = thai_super[o]
        if not EXT.match(tgt): continue
        if kind == 'Field': continue
    c = classes[tgt]
    if kind == 'InterfaceMethod': c['iface'] = True
    if kind in ('Method', 'InterfaceMethod'):
        c['methods'].add((name.strip('"'), desc, op == 'invokestatic'))
    elif kind == 'Field':
        c['fields'].add((name, desc, op in ('getstatic', 'putstatic')))

def jt(d, i=0):
    c = d[i]
    P = {'I': 'int', 'J': 'long', 'Z': 'boolean', 'B': 'byte', 'C': 'char', 'S': 'short', 'F': 'float', 'D': 'double', 'V': 'void'}
    if c in P: return P[c], i + 1
    if c == '[':
        t, j = jt(d, i + 1); return t + '[]', j
    j = d.index(';', i)
    return d[i + 1:j].replace('/', '.').replace('$', '.'), j + 1
def parse(desc):
    i = 1; args = []
    while desc[i] != ')':
        t, i = jt(desc, i); args.append(t)
    r, _ = jt(desc, i + 1)
    return args, r
def dflt(t):
    if t == 'void': return ''
    if t == 'boolean': return 'false'
    if t in ('int', 'long', 'byte', 'char', 'short', 'float', 'double'): return '(%s)0' % t
    return 'null'
# group nested
tops = collections.defaultdict(list)
for n in list(classes):
    parts = n.split('$')
    for k in range(1, len(parts)):
        classes['$'.join(parts[:k])]
for n in classes:
    tops[n.split('$')[0]].append(n)
def body(n, depth):
    c = classes[n]
    simple = n.split('/')[-1].split('$')[-1]
    ind = '    ' * depth
    kw = 'interface' if c['iface'] else 'class'
    mods = 'public ' + ('static ' if depth else '')
    sup = ''
    if n == 'android/app/Activity': sup = ' extends android.content.Context'
    s = [ind + mods + kw + ' ' + simple + sup + ' {']
    if not c['iface']:
        s.append(ind + '    public ' + simple + '() {}')
    seenm = set()
    for name, desc, st in sorted(c['fields']):
        t, _ = jt(desc)
        s.append(ind + '    public %s%s %s;' % ('static ' if st or c['iface'] else '', t, name))
    for name, desc, st in sorted(c['methods']):
        args, r = parse(desc)
        key = (name, tuple(args))
        if key in seenm: continue
        seenm.add(key)
        ps = ', '.join('%s a%d' % (t, i) for i, t in enumerate(args))
        if name == '<init>':
            if args and not c['iface']: s.append(ind + '    public %s(%s) {}' % (simple, ps))
            continue
        if name == '<clinit>': continue
        if c['iface'] and not st:
            s.append(ind + '    %s %s(%s);' % (r, name, ps))
        else:
            ret = dflt(r)
            s.append(ind + '    public %s%s %s(%s) { %s }' % ('static ' if st else '', r, name, ps, ('return %s;' % ret) if ret else ''))
    for m in sorted(classes):
        if m.startswith(n + '$') and '$' not in m[len(n) + 1:]:
            s += body(m, depth + 1)
    s.append(ind + '}')
    return s
for t in tops:
    pkg, simple = t.rsplit('/', 1)
    d = os.path.join(out, pkg)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, simple + '.java'), 'w').write('package %s;\n' % pkg.replace('/', '.') + '\n'.join(body(t, 0)) + '\n')
print(len(classes), 'classes', len(tops), 'files')
