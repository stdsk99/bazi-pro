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

const Cm = require('../js/compat.js');
eq('ดวงคู่: 戊 กับ 癸 เป็นบนภาคี และดาวคู่ครองตรงกัน', (() => { const x = Cm.compare(calc(1985, 3, 10, 14, 0, 'M'), calc(1987, 11, 20, 22, 0, 'F')); return [x.items.find((i) => i.id === 'dm').pts, x.items.find((i) => i.id === 'star').pts, x.items.length, x.total >= 0 && x.total <= 100]; })(), [20, 15, 6, true]);

// --- ดวงที่บันทึก (localStorage จำลอง) ---
const mem = {}; const fakeLS = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
const S = require('../js/store.js')(fakeLS);
S.save({ name: 'ฉัน', date: '1990-01-15', time: '10:30', g: 'M' }, { mine: true });
S.save({ name: 'แม่', date: '1965-04-12', time: '06:15', g: 'F' });
const up = S.save({ name: 'คุณแม่', date: '1965-04-12', time: '06:15', g: 'F' });
eq('บันทึกดวง: ซ้ำ = อัปเดต และมีดวงของฉันดวงเดียว', [S.list().length, up.created, S.list()[1].name, S.mine().name], [2, false, 'คุณแม่', 'ฉัน']);
const ex = S.exportText(); S.remove(S.list()[1].id); const im = S.importText(ex);
eq('สำรองแล้วนำเข้า: กู้ดวงที่ลบคืนได้ ไม่ซ้ำ', [im.added, im.updated, S.list().length, S.list().filter((o) => o.mine).length], [1, 1, 2, 1]);
eq('นำเข้าไฟล์เสีย', S.importText('xx').ok, false);

eq('ดวงคู่มีคำทำนายทุกด้าน และจังหวะเวลา 10 ปี', (() => { const x = Cm.compare(calc(1990, 1, 15, 10, 30, 'M'), calc(1992, 6, 3, 8, 0, 'F'), { fromYear: 2026 }); return [x.items.every((i) => i.pred), x.timing.to - x.timing.from, x.timing.caution.some((c) => c[0].includes('2030'))]; })(), [true, 9, true]);

eq('ด้านที่เด่น/ต้องระวัง (ดวงตัวอย่าง)', (() => { const r = calc(1990, 1, 15, 10, 30); const h = N.highlights(r, An.analyze(r), I.natal(r)); return [h.bars.length, h.strong[0].title.includes('ความรู้และผู้อุปถัมภ์'), h.caution.some((c) => c.title.includes('เพื่อนและคู่แข่งมากเกินไป'))]; })(), [5, true, true]);

const Yr = require('../js/yearly.js');
eq('สรุปปี 2026 (ปีมะเมีย เกิดปีมะเมีย = ปีนักษัตรตัวเองแบบเฮ้งตัวเอง) และปี 2030 ชงวังคู่ครอง', (() => { const r = calc(1990, 1, 15, 10, 30); const a = Yr.summary(r, An.analyze(r), 2026), b = Yr.summary(r, An.analyze(r), 2030); return [a.topics.length, a.months.months.length, a.months.best.length >= 1, a.taisui[0].hits[0].name.startsWith('ปีนักษัตรตัวเอง'), b.taisui[0].hits.some((h) => h.by === 'ดิถี'), b.topics.find((t) => t.id === 'love').tone]; })(), [4, 12, true, true, true, -1]);

eq('ด้านที่สวนกับภาพรวมมีคำอธิบาย (เดือน 庚子 ปี 2026: ภาพรวมต้องระวัง แต่ความรักเด่นเพราะครึ่งภาคีกับวังคู่ครอง)', (() => { const r = calc(1990, 1, 15, 10, 30), an = An.analyze(r); const m = r.monthly(2026).find((x) => x.pillar.zh === '庚子'); const t = Yr.topics(r, an, m.pillar, 'month'); const love = t.find((x) => x.id === 'love'); return [love.level, /^ภาพรวมเดือนนี้ต้องระวัง/.test(love.note || ''), /ครึ่งภาคีกับวังคู่ครอง/.test(love.note || ''), t.filter((x) => x.note).every((x) => x.tone !== 0)]; })(), ['เด่น', true, true, true]);

eq('ดวงรายวัน: 1 ม.ค. 2000 = 戊午 · ชงวังคู่ครองเมื่อราศีล่างของวันชงราศีล่างของดิถี · 7 วันต่อเนื่อง', (() => { const r = calc(1990, 1, 15, 10, 30), an = An.analyze(r); const d = Yr.day(r, an, 2000, 1, 1, false); const wk = Yr.week(r, an, 2026, 12, 29, null); const db = r.pillars.day.branch; const cl = wk.filter((x) => (x.pillar.branch + 6) % 12 === db).every((x) => x.clashDay && /ชงวังคู่ครอง/.test(x.avoid[0])); return [d.pillar.zh, d.dow, wk.length, wk.map((x) => x.date.day).join(','), wk[3].date.year, cl, wk.every((x) => x.topics.length === 4)]; })(), ['戊午', 'เสาร์', 7, '29,30,31,1,2,3,4', 2027, true, true]);

eq('ยามจร: เสายามของแต่ละชั่วโมงตรงกับเสายามของผังที่คำนวณเวลานั้น ทุกระบบยาม', (() => { let bad = 0; for (const o of [{}, { ziHour: 'at23' }, { monthSystem: 'zhongqi' }]) for (let h = 0; h < 24; h++) { const c = calc(2026, 10, 26, h, 30, 'M', Object.assign({ trueSolarTime: false }, o)); const hs = c.hourly(2026, 10, 26); const x = hs.find((z) => h >= z.from && h < z.to); if (x.pillar.zh !== c.pillars.hour.zh) bad++; } const r = calc(1990, 1, 15, 10, 30); return [bad, r.hourly(2026, 10, 26).length, Yr.hours(r, An.analyze(r), 2026, 10, 26)[12].label]; })(), [0, 13, 'ยามชวดปลาย']);
const Au = require('../js/auspicious.js');
eq('หาฤกษ์: ไม่เกิน 5 อันดับ เรียงคะแนน ไม่มีวันชงวังคู่ครอง ยามแนะนำอยู่ในช่วง 05–21 และฤกษ์แต่งงานตัดวันที่ชงดวงคู่', (() => { const r = calc(1990, 1, 15, 10, 30), p2 = calc(1992, 6, 3, 8, 0, 'F'); const me = { chart: r, an: An.analyze(r), name: 'ก' }, her = { chart: p2, an: An.analyze(p2), name: 'ข' };
  const a = Au.find([me], 'contract', { year: 2026, month: 11, day: 1 }, { year: 2027, month: 3, day: 31 });
  const w = Au.find([me, her], 'wedding', { year: 2026, month: 11, day: 1 }, { year: 2027, month: 1, day: 31 });
  const noClash = (x, c) => (x.pillar.branch + 6) % 12 !== c.pillars.day.branch;
  return [a.days, a.capped, a.ranked.length, a.ranked.every((x, i, L) => !i || L[i - 1].score >= x.score), a.ranked.every((x) => noClash(x, r)), a.ranked.every((x) => x.hours.every((h) => h.from >= 5 && h.to <= 21)), w.ranked.every((x) => x.per.length === 2 && noClash(x, r) && noClash(x, p2) && (x.pillar.branch + 6) % 12 !== p2.pillars.year.branch)]; })(), [92, true, 5, true, true, true, true]);

const Ss = require('../js/shensha.js'), Pl = require('../js/plain.js');
eq('ดาวพิเศษ: 庚 ดิถี ผู้อุปถัมภ์ที่ 丑未 · ปีเกิด 午 ดอกท้อที่ 卯 ม้าที่ 申 · ดวง 1990 มีผู้อุปถัมภ์ที่เสาเดือน 丑', (() => { const r = calc(1990, 1, 15, 10, 30); return [Ss.hits(r, 1).map((x) => x.id).includes('guiren'), Ss.hits(r, 3).some((x) => x.id === 'taohua' && x.by.includes('ปีเกิด')), Ss.hits(r, 8).some((x) => x.id === 'yima'), Ss.natal(r).map((x) => x.id + '@' + x.at.join()).join()]; })(), [true, true, true, 'guiren@เสาเดือน']);
eq('โหมดทั่วไป: วัน 甲戌 (27 ต.ค. 2026) หัวเรื่องเงินจร ชงวังคู่ครองขึ้นป้ายและเลี่ยงเซ็นสัญญา · ทุกเสาจร 60 แบบมีหัวเรื่อง 3/3 ข้อและ 4 ด้าน', (() => { const r = calc(1990, 1, 15, 10, 30), an = An.analyze(r); const R = Pl.reading(r, an, r.daily(2026, 10, 27).pillar, 'day');
  let ok = true; for (let i = 0; i < 60; i++) for (const k of ['luck', 'year', 'month', 'day']) { const q = r.daily(2026, 1, 1 + i).pillar; const x = Pl.reading(r, an, q, k); if (!x.title || x.do.length < 2 || x.avoid.length < 1 || x.aspects.length !== 4 || x.aspects.some((a) => a.bars < 1 || a.bars > 5 || !a.text)) ok = false; }
  return [R.title, R.chips.some((c) => c.t.includes('ชงวังคู่ครอง')), R.avoid[0], Pl.level3(2)[0], Pl.level3(0)[0], Pl.level3(-1)[0], ok]; })(), ['วันเงินจรเข้า โอกาสใหม่มาไว', true, 'เซ็นสัญญาหรือตัดสินใจเรื่องใหญ่', 'ดี', 'กลาง', 'ควรระวัง', true]);

const Al = require('../js/almanac.js');
eq('ปฏิทิน: กงหวั่ง 甲子→戌亥 庚辰→申酉 · เทพประจำวัน 27 ต.ค. 2026 (甲戌 ในเดือน 戌) = 建 และ 28 ต.ค. = 除 · หาฤกษ์ไม่มีวันต้องห้าม', (() => { const r = calc(1990, 1, 15, 10, 30), an = An.analyze(r);
  const k = (st, br) => Al.kong({ stem: st, branch: br }).map((b) => B.BRANCHES[b]).join('');
  const a = Au.find([{ chart: r, an, name: 'ก' }], 'business', { year: 2026, month: 11, day: 1 }, { year: 2027, month: 1, day: 31 });
  return [k(0, 0), k(6, 4), Al.officer(r, 2026, 10, 27).zh, Al.officer(r, 2026, 10, 28).zh, a.ranked.every((x) => !['破', '闭'].includes(x.officer.zh)), a.excludedOfficer > 0, Al.natalKong(r).branches.map((b) => B.BRANCHES[b]).join('')]; })(), ['戌亥', '申酉', '建', '除', true, true, '申酉']);

const DPm = require('../js/daypillar.js');
eq('เสาวัน 60 แบบครบ มีข้อความทุกช่อง และภาพ SVG', [DPm.list().length, DPm.list().every((k) => { const d = DPm.get(k); return d.img && d.tag && d.self && d.strong && d.care && d.tip && DPm.card(k).startsWith('<svg'); }), new Set(DPm.list().map((k) => DPm.get(k).img)).size], [60, true, 60]);

console.log(`\nผ่าน ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
