// ตรวจเทียบชั้นวิเคราะห์ (js/analysis.js) กับผลของระบบอ้างอิงที่บันทึกไว้
//   node tools/refcheck/check.js            ทุกผังที่ผูกได้ 518,400 แบบ + วันเกิดจริง 150,000 ราย
//   node tools/refcheck/check.js --step 50  สุ่มตรวจทุก ๆ 50 แถว (เร็ว ใช้ในชุดทดสอบ)
// เทียบ: ลักษณะดวง, กำลังดิถี (ดวงปกติ), ชุดธาตุดีและธาตุร้าย (รวมเงื่อนไขเฉพาะบน/ล่าง/กิ่ง/ขั้ว)
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const B = require('../../js/bazi-core.js');
const An = require('../../js/analysis.js');

const ET = [2, 2, 3, 3, 4, 4, 0, 0, 1, 1];
// แปลงรายการรหัสเป็นชุดที่เทียบกันได้ (ไม่ขึ้นกับลำดับ แต่รหัสกำกับติดกับธาตุก่อนหน้า)
function canon(arr, ek) {
    const out = [];
    for (const t of arr) {
        if (t <= 4) out.push(String(t));
        else if (t === 9) out.push(ek + ':same');
        else if (t === 10) out.push(ek + ':opp');
        else if (t === 14) out[out.length - 1] += '@b';
        else if (t === 15) out[out.length - 1] += '@t';
        else if (t >= 16 && t <= 37) out[out.length - 1] += '@' + t;
        else out.push('x' + t);
    }
    return out.sort().join(',');
}
const num = (s) => s === '' || s == null ? [] : s.split(',').map(Number);
const load = (f) => zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'data', f))).toString('utf8').split('\n').filter((l) => l && l[0] !== '#');

function same(o, ek, pop, type, A, Bl) {
    return String(o.pattern) === pop && (o.pattern !== 0 || String(o.type) === type) && canon(o.A, ek) === canon(num(A), ek) && canon(o.B, ek) === canon(num(Bl), ek);
}
function fnOf(key) { const v = key.split(' ').map(Number), fn = []; for (let k = 2; k < 6; k++) fn[k] = [v[(k - 2) * 2], v[(k - 2) * 2 + 1]]; return fn; }

function run(step = 1, log = console.log) {
    const res = {};
    // 1) ทุกผังที่ผูกได้ (วันเกิดสมมติ 12 เม.ย. 2000 ตามที่ใช้สร้างข้อมูล: ดิถีน้ำเดือนมะโรงนับเป็นช่วงต้นเดือน)
    let n = 0, ok = 0; const bad = [];
    load('ref-all.tsv.gz').forEach((line, i) => {
        if (i % step) return;
        const [key, pop, type, , A, Bl] = line.split('\t'), fn = fnOf(key);
        const o = An.analyzeFn(fn, { waterEarly: ET[fn[3][0] - 1] === 1 && fn[4][1] === 5 });
        n++; if (same(o, o.x.ek, pop, type, A, Bl)) ok++; else if (bad.length < 10) bad.push(key);
    });
    res.all = { n, ok, bad };
    // 2) วันเกิดจริง (ผูกดวงด้วย BaziCore ค่าตั้งต้น เวลาไทย ลองจิจูด 100.5)
    n = 0; ok = 0; const bad2 = [];
    load('ref-dates.tsv.gz').forEach((line, i) => {
        if (i % step) return;
        const [birth, , pop, type, , A, Bl] = line.split('\t');
        const [y, m, d, h, mi] = birth.split(' ').map(Number);
        const c = B.calculate({ year: y, month: m, day: d, hour: h, minute: mi, gender: 'M', tz: 7, longitude: 100.5 });
        const o = An.analyzeFn(An.toFn(c), { waterEarly: An.waterEarlyOf(c) }); // ทางเดียวกับ analyze() ในแอป
        n++; if (same(o, o.x.ek, pop, type, A, Bl)) ok++; else if (bad2.length < 10) bad2.push(birth);
    });
    res.dates = { n, ok, bad: bad2 };
    if (log) {
        const pct = (r) => (100 * r.ok / r.n).toFixed(3) + '%';
        log(`ทุกผังที่ผูกได้: ${res.all.ok}/${res.all.n} ตรงกัน (${pct(res.all)})`);
        log(`วันเกิดจริง: ${res.dates.ok}/${res.dates.n} ตรงกัน (${pct(res.dates)})`);
        [...res.all.bad, ...res.dates.bad].forEach((b) => log('  ไม่ตรง:', b));
    }
    return res;
}
module.exports = { run, canon };
if (require.main === module) {
    const i = process.argv.indexOf('--step');
    run(i > 0 ? +process.argv[i + 1] : 1);
}
