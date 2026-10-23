// ชุดทดสอบชั้นคำนวณ: node tests/run.js
// ใช้ค่าอ้างอิงที่รู้กันทั่วไป (ไม่ต้องพึ่งข้อมูลจากแอปอื่น)
const A = require('../js/astro.js');
const B = require('../js/bazi-core.js');
let pass = 0, fail = 0;
const eq = (name, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    if (!ok) console.log('✗', name, '\n   ได้ ', got, '\n   ควรได้', want);
};
const P = (r) => ['year', 'month', 'day', 'hour'].map((k) => r.pillars[k].zh).join(' ');
const calc = (y, m, d, h, mi, g = 'M', options = {}, extra = {}) => B.calculate(Object.assign({ year: y, month: m, day: d, hour: h, minute: mi, gender: g, tz: 7, longitude: 100.5, options }, extra));

// --- เวลาสารท (เวลาปักกิ่ง) ที่ประกาศโดยหอดูดาวจีน ---
const bj = (y, m, t) => { const p = A.fromJD(A.roundMinute(A.solarTermUT(y, m, t) + 8 / 24)); return `${p.day} ${p.hour}:${String(p.minute).padStart(2, '0')}`; };
eq('立春 2024', bj(2024, 2, 0), '4 16:27');
// 冬至 2024 จริง = 17:20:34 ค่าที่คำนวณได้คลาดไม่เกิน 1 นาที (ความแม่นของแบบจำลอง ~10 วินาที)
eq('冬至 2024 (±1 นาที)', ['21 17:20', '21 17:21'].includes(bj(2024, 12, 1)), true);
eq('夏至 2000', bj(2000, 6, 1), '21 9:48');
eq('春分 1990', bj(1990, 3, 1), '21 5:19');

// --- เสาวันที่รู้กันแน่นอน ---
eq('วัน 1949-10-01 = 甲子', calc(1949, 10, 1, 12, 0).pillars.day.zh, '甲子');
eq('วัน 2000-01-01 = 戊午', calc(2000, 1, 1, 12, 0).pillars.day.zh, '戊午');
eq('วัน 1900-02-20 = 甲子', calc(1900, 2, 20, 12, 0).pillars.day.zh, '甲子');

// --- เปลี่ยนปีที่ลิบชุง: 立春 2024 = 4 ก.พ. 15:27 เวลาไทย ---
const lc = { yearChange: 'lichun' };
eq('ก่อนลิบชุง 1 นาที', P(calc(2024, 2, 4, 15, 26, 'M', lc)), '癸卯 乙丑 戊戌 庚申');
eq('ตรงนาทีลิบชุง = ปีใหม่', P(calc(2024, 2, 4, 15, 27, 'M', lc)), '甲辰 丙寅 戊戌 庚申');

// --- เปลี่ยนปีที่ตังจี่ (ค่าตั้งต้น): 冬至 2024 ≈ 21 ธ.ค. 16:20 เวลาไทย ---
eq('ก่อนตังจี่', calc(2024, 12, 21, 16, 19).pillars.year.zh, '甲辰');
eq('หลังตังจี่ = ปีถัดไป', calc(2024, 12, 21, 16, 21).pillars.year.zh, '乙巳');
eq('เสาเดือนไม่ขึ้นกับวิธีเปลี่ยนปี', calc(2024, 12, 25, 10, 0).pillars.month.zh, '丙子');

// --- ยามจื้อ 23.00 น. ---
eq('23:30 วันเปลี่ยน 24.00 น. (วันเดิม ก้านยามของวันถัดไป)', [calc(2000, 1, 1, 23, 30).pillars.day.zh, calc(2000, 1, 1, 23, 30).pillars.hour.zh], ['戊午', '甲子']);
eq('23:30 วันเปลี่ยน 23.00 น. (เป็นวันถัดไป)', [calc(2000, 1, 1, 23, 30, 'M', { ziHour: 'at23' }).pillars.day.zh, calc(2000, 1, 1, 23, 30, 'M', { ziHour: 'at23' }).pillars.hour.zh], ['己未', '甲子']);
eq('00:30 = ยามจื้อของวันนั้น', calc(2000, 1, 2, 0, 30).pillars.hour.zh, '甲子');

// --- วัยจร: ชายปีหยางเดินหน้า หญิงปีหยางถอยหลัง ---
const m = calc(1984, 3, 10, 10, 0, 'M', lc), f = calc(1984, 3, 10, 10, 0, 'F', lc);
eq('ชาย 甲子 เดินหน้า', [m.luck.forward, m.luck.periods[0].pillar.zh], [true, '戊辰']);
eq('หญิง 甲子 ถอยหลัง', [f.luck.forward, f.luck.periods[0].pillar.zh], [false, '丙寅']);

// --- เวลาสุริยะ: กรุงเทพฯ ช้ากว่าเวลามาตรฐานราว 18 นาที ± สมการเวลา ---
const s = calc(2024, 4, 15, 12, 0, 'M', { trueSolarTime: true });
eq('ปรับเวลาสุริยะกรุงเทพฯ กลางเดือนเมษายน', s.solarShiftMinutes, -18);

// --- ชั้นวิเคราะห์ (ดวงตัวอย่าง) ---
const An = require('../js/analysis.js');
const an = (y, m, d, h, mi, g) => An.analyze(calc(y, m, d, h, mi, g));
const els = (l) => l.map((x) => x.th + (x.polarity === 'same' ? '+' : x.polarity === 'opposite' ? '-' : '')).sort().join(' ');
const a1 = an(2014, 8, 25, 9, 35, 'M'), a3 = an(1972, 2, 22, 12, 30, 'M'), a2 = an(1979, 7, 19, 0, 30, 'F');
eq('ดวงตัวอย่าง 1 = ดิถีแข็งแรง', [a1.pattern, a1.strength], [0, 1]);
eq('ดวงตัวอย่าง 1 ธาตุดี/ร้าย', [els(a1.favorable), els(a1.unfavorable)], ['ทอง น้ำ', 'ดิน ไฟ ไม้']);
eq('ดวงตัวอย่าง 3 = ดิถีอ่อนปานกลาง', [a3.pattern, a3.strength], [0, 2]);
eq('ดวงตัวอย่าง 3 ธาตุดี/ร้าย', [els(a3.favorable), els(a3.unfavorable)], ['ทอง น้ำ+', 'ดิน น้ำ- ไฟ ไม้']);
eq('ดวงตัวอย่าง 2 (8.16) = ดิถีอ่อน ใช้ไม้ไฟ', [a2.pattern, a2.strength, els(a2.favorable)], [0, 3, 'ไฟ ไม้']);

// --- ภาคี ชง เฮ้ง ไห่ ผั่ว ---
const I = require('../js/interactions.js');
eq('子酉 ผั่ว', I.find([{ key: 'a', label: 'a', stem: 0, branch: 0 }, { key: 'b', label: 'b', stem: 2, branch: 9 }]).map((x) => x.type).join(), 'break');
eq('寅巳申 ซำเฮ้ง', I.find([0, 1, 2].map((i) => ({ key: 'k' + i, label: 'k' + i, stem: i, branch: [2, 5, 8][i] }))).some((x) => x.type === 'punish3'), true);
const it = (arr) => arr.map(([s, b], i) => ({ key: 'k' + i, label: 'k' + i, stem: s, branch: b }));
const types = (l) => l.map((x) => x.type).sort().join(',');
eq('寅午戌 ไตรภาคี + 甲己 บนภาคี + 甲庚 บนปะทะ', types(I.find(it([[0, 2], [5, 6], [6, 10]]))), 'stemClash,stemCombo,trio');
eq('子午 ล่างชง', types(I.find(it([[0, 0], [2, 6]]))), 'clash');
eq('子卯 เฮ้ง', types(I.find(it([[0, 0], [2, 3]]))), 'punish');
eq('午午 เฮ้งตัวเอง', types(I.find(it([[0, 6], [2, 6]]))), 'selfPunish');
eq('ปีจรเริ่มที่ตังจี่ปีก่อน', (() => { const a = calc(2014, 8, 25, 9, 35).annual(2026, 2026)[0]; return [a.pillar.zh, a.start.year, a.start.month]; })(), ['丙午', 2025, 12]);

let a1Chart;
// --- คำทำนาย ---
const N = require('../js/narrative.js');
const rd = N.natal(a1Chart = calc(2014, 8, 25, 9, 35), An.analyze(a1Chart), I.natal(a1Chart));
eq('คำทำนายมี 11 หัวข้อ (รวมทิศบ้านและนักษัตร) และทุกย่อหน้ามีที่มา', [rd.length, rd.every((s) => s.blocks.every((b) => b.source))], [11, true]);

const lp0 = a1Chart.luck.periods[0].pillar;
const tr = N.transit(a1Chart, An.analyze(a1Chart), lp0, 'luck', I.withTransit(a1Chart, [{ key: 'luck', label: 'วัยจร', stem: lp0.stem, branch: lp0.branch }], 'luck'), 'luck');
eq('คำทำนายวัยจรมีภาพรวม เรื่องที่เด่น และคำแนะนำ', ['ภาพรวม', 'เรื่องที่เด่นขึ้น', 'คำแนะนำ'].every((t) => tr.some((b) => b.title === t)), true);

eq('ชื่อสิบเทพตามระบบอ้างอิง', [B.tenGod(0, 9).th, B.tenGod(0, 6).th, B.tenGod(0, 5).th], ['เสริมหลัก', 'พิฆาต', 'โชคลาภ']);

eq('วังคู่ครองแยกสิบเทพ 10 ตัว', (() => { const r = calc(1990, 1, 15, 10, 30); const b = N.natal(r, An.analyze(r), I.natal(r)).find((x) => x.id === 'stages').blocks[2]; return b.items[0][0].startsWith('คู่ครอง (ราศีล่าง 辰 เสริมรอง'); })(), true);

eq('หลักเดือนแยกราศีบน/ล่างตามสิบเทพ', (() => { const r = calc(1990, 1, 15, 10, 30); const b = N.natal(r, An.analyze(r), I.natal(r)).find((x) => x.id === 'stages').blocks[1]; return b.items[0][1].startsWith('มีระเบียบ') && b.items[1][1].startsWith('แม่คอยดูแล'); })(), true);

eq('หลักปีและหลักยามแยกตามสิบเทพ', (() => { const r = calc(1990, 1, 15, 10, 30); const bl = N.natal(r, An.analyze(r), I.natal(r)).find((x) => x.id === 'stages').blocks; return [bl[0].items[1][1].startsWith('แม่หรือผู้ใหญ่ฝ่ายหญิง'), bl[3].items[1][1].startsWith('ลูกหลานเข้มแข็ง')]; })(), [true, true]);

eq('ประโยคเฉพาะผู้ชายแสดงเฉพาะดวงผู้ชาย', ['M', 'F'].map((g) => { const r = calc(1990, 1, 15, 10, 30, g); return N.natal(r, An.analyze(r), I.natal(r)).find((x) => x.id === 'stages').blocks[3].items[1][1].includes('สำหรับผู้ชาย'); }), [true, false]);

eq('ปีจรแยกสิบเทพ (ปี 丙午 ดิถี 庚 ผู้หญิง)', (() => { const r = calc(1990, 1, 15, 10, 30, 'F'), y = r.annual(2026, 2026)[0]; const t = N.transit(r, An.analyze(r), y.pillar, 'year', [], 'year2').find((b) => b.title === 'เรื่องที่เด่นขึ้น'); return [t.items[0][0].startsWith('อำนาจ การแข่งขัน'), t.items[1][1].includes('สำหรับผู้หญิง')]; })(), [true, true]);

eq('เดือนจรปี 2026 (เปลี่ยนปีที่ลิบชุง) 庚寅..辛丑 12 เดือน', (() => { const r = calc(1990, 1, 15, 10, 30, 'M', { yearChange: 'lichun' }); const ms = r.monthly(2026); return [ms.length, ms[0].pillar.zh, ms[11].pillar.zh]; })(), [12, '庚寅', '辛丑']);

console.log(`\nผ่าน ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
