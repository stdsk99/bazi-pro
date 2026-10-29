// all structurally valid charts: hour day month year (1-based stem branch)
const out = [];
for (let y = 0; y < 60; y++) { const ys = y % 10, yb = y % 12;
  for (let m = 0; m < 12; m++) { const mb = (m + 2) % 12, ms = ((ys % 5) * 2 + 2 + m) % 10;
    for (let d = 0; d < 60; d++) { const ds = d % 10, db = d % 12;
      for (let hb = 0; hb < 12; hb++) { const hs = ((ds % 5) * 2 + hb) % 10;
        out.push([hs + 1, hb + 1, ds + 1, db + 1, ms + 1, mb + 1, ys + 1, yb + 1].join(' ')); } } } }
process.stdout.write(out.join('\n') + '\n');
