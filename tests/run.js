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

// --- เปลี่ยนปีที่ลิบชุน: 立春 2024 = 4 ก.พ. 15:27 เวลาไทย ---
const lc = { yearChange: 'lichun' };
eq('ก่อนลิบชุน 1 นาที', P(calc(2024, 2, 4, 15, 26, 'M', lc)), '癸卯 乙丑 戊戌 庚申');
eq('ตรงนาทีลิบชุน = ปีใหม่', P(calc(2024, 2, 4, 15, 27, 'M', lc)), '甲辰 丙寅 戊戌 庚申');

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

console.log(`\nผ่าน ${pass} / ${pass + fail}`);
process.exit(fail ? 1 : 0);
