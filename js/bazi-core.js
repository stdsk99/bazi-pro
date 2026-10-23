// bazi-core.js — ชั้นคำนวณดวงจีน (八字) : 6 เสา + วัยจร (大运)
// ค่าตั้งต้นตามระบบที่ตกลงกันไว้
// ต้องโหลด astro.js ก่อน (เบราว์เซอร์) หรือ require ใน Node
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./astro.js'));
    else root.BaziCore = factory(root.BaziAstro);
})(typeof self !== 'undefined' ? self : this, function (A) {
    'use strict';

    // ---------- ข้อมูลพื้นฐาน ----------
    const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const STEMS_TH = ['กะ', 'อิก', 'เปี้ย', 'เตง', 'โบ่ว', 'กี้', 'แก', 'ซิง', 'ยิ้ม', 'กุ่ย'];
    const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const BRANCHES_TH = ['จื้อ', 'ทิ่ว', 'อี๊ง', 'เบ้า', 'ซิ้ง', 'จี๋', 'โง่ว', 'บี่', 'ซิน', 'อิ้ว', 'สุก', 'ไห'];
    const ANIMALS_TH = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน'];
    const ELEMENTS = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];
    const STEM_ELEMENT = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
    const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
    // ราศีแฝง 藏干 (ตัวแรก = ปราณหลัก)
    const HIDDEN_STEMS = [[9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 4, 6], [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]];
    // ชื่อสารท ลำดับตามเดือนเกรกอเรียน: [节, 中气]
    const TERMS = [
        ['小寒', 'เสี่ยวฮั้ง'], ['大寒', 'ไต่ฮั้ง'], ['立春', 'ลิบชุง'], ['雨水', 'อู๋จุ้ย'], ['惊蛰', 'เก๋งเต็ก'], ['春分', 'ชุงฮุง'],
        ['清明', 'เช็งเม้ง'], ['谷雨', 'ก๊อกฮู้'], ['立夏', 'ลิบแฮ่'], ['小满', 'เสียวมั่ว'], ['芒种', 'หมั่งเจ้ง'], ['夏至', 'แฮ่จี่'],
        ['小暑', 'เสียวสู้'], ['大暑', 'ไต่สู้'], ['立秋', 'ลิบชิว'], ['处暑', 'ชู้สู้'], ['白露', 'แปะโหล่ว'], ['秋分', 'ชิวฮุง'],
        ['寒露', 'ฮั่งโหล่ว'], ['霜降', 'ซึงกั่ง'], ['立冬', 'ลิบตัง'], ['小雪', 'เสียวเสาะ'], ['大雪', 'ไต่เสาะ'], ['冬至', 'ตังจี่']
    ];
    const termName = (m, type) => { const t = TERMS[(m - 1) * 2 + type]; return { zh: t[0], th: t[1] }; };

    // สิบเทพ 十神 เทียบกับธาตุประจำตัว (ก้านวัน)
    const TEN_GODS = {
        '比肩': 'เพื่อนร่วมธาตุ', '劫财': 'คู่แข่งร่วมธาตุ', '食神': 'ผลงาน ความสุข', '伤官': 'ความคิด การแสดงออก',
        '偏财': 'ลาภ ทรัพย์จร', '正财': 'ทรัพย์ประจำ', '七杀': 'แรงกดดัน อำนาจ', '正官': 'ตำแหน่ง ระเบียบ',
        '偏印': 'ความรู้เฉพาะทาง', '正印': 'ผู้อุปถัมภ์ การเรียน'
    };
    function tenGod(dayStem, stem) {
        const a = STEM_ELEMENT[dayStem], b = STEM_ELEMENT[stem], same = (dayStem % 2) === (stem % 2);
        const rel = (b - a + 5) % 5; // 0 เดียวกัน, 1 เราให้กำเนิด, 2 เราข่ม, 3 ข่มเรา, 4 ให้กำเนิดเรา
        const code = [['比肩', '劫财'], ['食神', '伤官'], ['偏财', '正财'], ['七杀', '正官'], ['偏印', '正印']][rel][same ? 0 : 1];
        return { code, th: TEN_GODS[code] };
    }

    // ---------- ตัวเลือก (ค่าตั้งต้นตามระบบที่ตกลงกันไว้) ----------
    const DEFAULT_OPTIONS = {
        yearChange: 'winterSolstice', // 'lichun' 立春 ~4 ก.พ. | 'winterSolstice' 冬至 ~22 ธ.ค. (ค่าตั้งต้น) | 'summerSolstice' 夏至
        monthSystem: 'standard',      // 'standard' เปลี่ยนเดือนที่ 节 | 'zhongqi' เปลี่ยนเดือนที่ 中气 และยามเริ่มชั่วโมงคู่
        ziHour: 'midnight',           // 'midnight' วันเปลี่ยน 24.00 น. (ค่าตั้งต้น) | 'at23' วันเปลี่ยน 23.00 น.
        trueSolarTime: false,         // true = ใช้เวลาสุริยะปรากฏ (ลองจิจูด + สมการเวลา)
        luckMethod: 'standard',       // 'standard' นับจากวันเปลี่ยนปี (ค่าตั้งต้น) | 'academic' นับจากวันเกิด ตามตำรา | 'proportional' สัดส่วนช่วงเดือน นับละเอียดเป็นวัน
        southern: false,              // ซีกโลกใต้: กิ่งเดือนเลื่อน 6
        pregnancyMonths: 9            // ใช้คำนวณหลักปฏิสนธิ
    };
    const YC_INDEX = { lichun: 0, winterSolstice: 1, summerSolstice: 2 };
    const YC_MONTH = [2, 12, 6];
    const ADofY = 365.242191;

    const mod = (n, m) => ((n % m) + m) % m;
    const adjInt = (d) => { const i = Math.trunc(d); return d > i + 0.5 ? i + 1 : i; }; // ปัดเกินครึ่งขึ้น
    const modX = (d, m) => mod(d, m);

    function makePillar(stem, branch) {
        return {
            stem, branch,
            zh: STEMS[stem] + BRANCHES[branch],
            th: STEMS_TH[stem] + BRANCHES_TH[branch],
            stemElement: ELEMENTS[STEM_ELEMENT[stem]], stemYang: stem % 2 === 0,
            branchElement: ELEMENTS[BRANCH_ELEMENT[branch]], branchYang: branch % 2 === 0,
            animal: ANIMALS_TH[branch],
            hidden: HIDDEN_STEMS[branch].map((s) => ({ stem: s, zh: STEMS[s], th: STEMS_TH[s], element: ELEMENTS[STEM_ELEMENT[s]] }))
        };
    }

    // ---------- คำนวณ ----------
    // input: { year, month, day, hour, minute, gender: 'M'|'F', tz: 7, longitude: 100.5, options }
    function calculate(input) {
        const o = Object.assign({}, DEFAULT_OPTIONS, input.options || {});
        // ระบบเปลี่ยนเดือนที่ 中气 บังคับเปลี่ยนปีที่ตังจี่และวันเปลี่ยน 24.00 น.
        if (o.monthSystem === 'zhongqi') {
            o.ziHour = 'midnight';
            if (!o.southern || o.yearChange === 'lichun') o.yearChange = 'winterSolstice';
        }
        const tz = input.tz != null ? input.tz : 7;
        const lng = input.longitude != null ? input.longitude : 100.5;
        const yct = YC_INDEX[o.yearChange];
        const monthType = o.monthSystem === 'zhongqi' ? 1 : 0;
        const warnings = [];

        // กรอบเวลาที่ใช้คำนวณ: เวลามาตรฐานท้องถิ่น หรือเวลาสุริยะ
        // ทุกเวลาภายในเก็บเป็น "นาทีเต็ม" (จำนวนเต็ม) เพื่อให้เทียบเวลาที่ตรงนาทีเดียวกันได้แม่นยำ
        const toMin = (jd) => Math.round((jd + 0.5) * 1440);
        const fromMin = (mn) => A.fromJD(mn / 1440 - 0.5);
        const local = A.toJD(input.year, input.month, input.day, input.hour, input.minute || 0);
        let t = toMin(local), solarShiftMin = 0;
        if (o.trueSolarTime) {
            const lngSec = Math.trunc((lng - tz * 15) * 240);
            const p = A.fromJD(local + lngSec / 86400);
            const eotSec = Math.trunc(A.equationOfTime(A.toJD(p.year, p.month, p.day, 12)) * 60);
            solarShiftMin = Math.floor((lngSec + eotSec) / 60);
            t += solarShiftMin;
        }
        // เวลาสารทในกรอบเดียวกัน (ปัดเป็นนาที)
        const term = (y, m, type) => {
            const bj = toMin(A.solarTermUT(y, m, type) + 8 / 24);
            return o.trueSolarTime ? bj + adjInt((lng - 120) * 4) : bj + Math.round((tz - 8) * 60);
        };
        const sd = fromMin(t); // วันเวลาในกรอบคำนวณ

        // --- เสาปี ---
        const yearStart = (Y) => yct === 0 ? term(Y, 2, 0) : yct === 1 ? term(Y - 1, 12, 1) : term(Y, 6, 1);
        let Y = sd.year + 1;
        while (t < yearStart(Y)) Y--;
        const yIdx = mod(Y - 4, 60);
        const yearP = makePillar(yIdx % 10, yIdx % 12);

        // --- เสาเดือน ---
        let my = sd.year, mm = sd.month;
        if (t < term(my, mm, monthType)) { mm--; if (mm === 0) { mm = 12; my--; } }
        const mSerial = my * 12 + mm - (1984 * 12 + 2);
        let mBranch = mod(2 + mSerial, 12);
        if (o.southern) mBranch = mod(mBranch + 6, 12);
        const monthP = makePillar(mod(2 + mSerial, 10), mBranch);
        const monthTermStart = term(my, mm, monthType);
        const nm = mm === 12 ? [my + 1, 1] : [my, mm + 1];
        const monthTermNext = term(nm[0], nm[1], monthType);

        // --- เสาวัน ---
        let dayJD = A.toJD(sd.year, sd.month, sd.day);
        if (o.monthSystem === 'standard' && o.ziHour === 'at23' && sd.hour === 23) dayJD += 1;
        const dIdx = mod(Math.floor(dayJD + 0.5) - 11, 60);
        const dayP = makePillar(dIdx % 10, dIdx % 12);

        // --- เสายาม ---
        let hBranch, hStem;
        if (o.monthSystem === 'standard') {
            hBranch = Math.floor((sd.hour + 1) / 2) % 12;
            hStem = mod(dayP.stem * 2 + hBranch + (sd.hour === 23 && o.ziHour === 'midnight' ? 2 : 0), 10);
        } else {
            hBranch = Math.min(Math.floor(sd.hour / 2), 11);
            hStem = mod(dayP.stem * 2 + hBranch, 10);
        }
        const hourP = makePillar(hStem, hBranch);

        // --- หลักปฏิสนธิ 胎元 และหลักลัคนา 命宫 ---
        const pm = 9 - o.pregnancyMonths;
        const conceptionP = makePillar(mod(monthP.stem + 1 + pm, 10), mod(monthP.branch + 3 + pm, 12));
        const beforeMid = t < term(sd.year, sd.month, 1);
        const lpBranch1 = mod((beforeMid ? 7 : 6) - sd.month - (hBranch + 1) - 1, 12) + 1; // 1..12
        const lpStem1 = mod((yearP.stem + 1) * 2 + lpBranch1 - 2 - 1, 10) + 1;
        const lifePalaceP = makePillar(lpStem1 - 1, lpBranch1 - 1);

        // --- วัยจร 大运 ---
        const male = (input.gender || 'M') === 'M';
        const forward = ((male ? 0 : 1) + ((yearP.stem + 1) % 2)) === 1;
        const prevM = sd.month === 1 ? [sd.year - 1, 12] : [sd.year, sd.month - 1];
        const nextM = sd.month === 12 ? [sd.year + 1, 1] : [sd.year, sd.month + 1];
        const T1 = term(prevM[0], prevM[1], monthType), T2 = term(sd.year, sd.month, monthType), T3 = term(nextM[0], nextM[1], monthType);
        let d2, d3;
        if (forward) { if (t < T2) { d2 = T2 - t; d3 = T2 - T1; } else { d2 = T3 - t; d3 = T3 - T2; } }
        else { if (T2 < t) { d2 = t - T2; d3 = T3 - T2; } else { d2 = t - T1; d3 = T2 - T1; } }
        d2 /= 1440; d3 /= 1440; // เป็นวัน
        const ycOfBirthYear = yct === 0 ? term(sd.year, 2, 0) : yct === 1 ? term(sd.year - 1, 12, 1) : term(sd.year, 6, 1);
        let takeAge, takeMonth = -1, takeDay = -1;
        if (o.luckMethod !== 'proportional') {
            let yrs = Math.trunc(d2 / 3), mos = Math.trunc((d2 - yrs * 3) * 4);
            if (o.luckMethod === 'academic') {
                mos += Math.trunc(modX((t - ycOfBirthYear) / 1440, ADofY) / (ADofY / 12));
                if (mos > 12) { yrs++; mos = mod(mos - 1, 12) + 1; }
            }
            takeAge = yrs + 1; takeMonth = mos;
        } else {
            const d4 = d2 * 10 / d3;
            let yrs = Math.trunc(d4);
            let d6 = (t - ycOfBirthYear) / 1440 + (d4 - yrs) * ADofY;
            if (d6 > ADofY) { yrs++; d6 -= ADofY; }
            takeAge = yrs + 1; takeDay = Math.trunc(d6);
        }
        const ycType = yct === 0 ? 0 : 1, ycMonth = YC_MONTH[yct];
        const luckStart = (k) => {
            let Yk = sd.year + takeAge + 10 * k - 1 - (yct % 2);
            if (o.luckMethod !== 'proportional') {
                let M = ycMonth + takeMonth;
                if (M > 12) { M -= 12; Yk++; }
                return term(Yk, M, ycType);
            }
            return term(Yk, ycMonth, ycType) + takeDay * 1440;
        };
        const dir = forward ? 1 : -1;
        const luck = [];
        for (let k = 0; k < 10; k++) {
            const s = luckStart(k), e = luckStart(k + 1), st = fromMin(s);
            const p = makePillar(mod(monthP.stem + dir * (k + 1), 10), mod(monthP.branch + dir * (k + 1), 12));
            p.tenGod = tenGod(dayP.stem, p.stem);
            luck.push({ index: k + 1, pillar: p, start: st, end: fromMin(e), ageAtStart: ageBetween(sd, st) });
        }

        // --- คำเตือนเวลาใกล้รอยต่อ ---
        const near = (a, b, mins) => Math.abs(a - b) < mins;
        if (near(t, monthTermStart, 120) || near(t, monthTermNext, 120)) warnings.push('เกิดใกล้เวลาเปลี่ยนเดือน (ภายใน 2 ชั่วโมงของสารท) เสาเดือนอาจเปลี่ยนถ้าเวลาเกิดคลาดเคลื่อน');
        if (near(t, yearStart(Y), 120) || near(t, yearStart(Y + 1), 120)) warnings.push('เกิดใกล้เวลาเปลี่ยนปี เสาปีอาจเปลี่ยนถ้าเวลาเกิดคลาดเคลื่อน');
        const minOfDay = sd.hour * 60 + sd.minute;
        const hourEdge = o.monthSystem === 'standard' ? (minOfDay + 60) % 120 : minOfDay % 120;
        if (hourEdge < 10 || hourEdge > 110) warnings.push('เกิดใกล้เวลาเปลี่ยนยาม (ภายใน 10 นาที) เสายามอาจเปลี่ยนถ้าเวลาเกิดคลาดเคลื่อน');
        if (o.monthSystem === 'standard' && sd.hour === 23) warnings.push('เกิดยามจื้อช่วง 23.00–24.00 น. ผลเสาวันขึ้นกับตัวเลือก "วันเปลี่ยน 23.00/24.00 น."');
        if (input.year < 1920 && tz === 7) warnings.push('ก่อน 1 เม.ย. 2463 (ค.ศ. 1920) ประเทศไทยใช้เวลามาตรฐานกรุงเทพฯ UTC+6:42 ไม่ใช่ UTC+7');

        const pillars = { conception: conceptionP, lifePalace: lifePalaceP, hour: hourP, day: dayP, month: monthP, year: yearP };
        for (const k of Object.keys(pillars)) if (k !== 'day') pillars[k].tenGod = tenGod(dayP.stem, pillars[k].stem);
        pillars.day.tenGod = { code: '日主', th: 'ตัวเจ้าชะตา' };
        const counts = [0, 0, 0, 0, 0];
        for (const k of ['year', 'month', 'day', 'hour']) { counts[STEM_ELEMENT[pillars[k].stem]]++; counts[BRANCH_ELEMENT[pillars[k].branch]]++; }

        return {
            input: Object.assign({}, input, { tz, longitude: lng }),
            options: o,
            calcTime: sd, solarShiftMinutes: solarShiftMin,
            pillars,
            dayMaster: { stem: dayP.stem, zh: STEMS[dayP.stem], th: STEMS_TH[dayP.stem], element: ELEMENTS[STEM_ELEMENT[dayP.stem]], yang: dayP.stem % 2 === 0 },
            elementCount: ELEMENTS.map((e, i) => ({ element: e, count: counts[i] })),
            monthTerm: { start: Object.assign(termName(mm, monthType), fromMin(monthTermStart)), next: Object.assign(termName(nm[1], monthType), fromMin(monthTermNext)) },
            luck: { forward, takeAge, takeMonth, takeDay, periods: luck },
            // ปีจร: ปีที่ Y เริ่มที่จุดเปลี่ยนปีตามตัวเลือก (ตังจี่ของปี Y−1 เป็นค่าตั้งต้น)
            annual: (fromY, toY) => {
                const out = [];
                for (let y = fromY; y <= toY; y++) {
                    const i = mod(y - 4, 60), ap = makePillar(i % 10, i % 12);
                    ap.tenGod = tenGod(dayP.stem, ap.stem);
                    out.push({ year: y, pillar: ap, start: fromMin(yearStart(y)), end: fromMin(yearStart(y + 1)), age: y - Y });
                }
                return out;
            },
            warnings
        };
    }

    function ageBetween(x, y) {
        let yrs = y.year - x.year, mos = y.month - x.month;
        if (y.day < x.day) mos--;
        if (mos < 0) { yrs--; mos += 12; }
        return { years: yrs, months: mos };
    }

    return { calculate, tenGod, DEFAULT_OPTIONS, STEMS, STEMS_TH, BRANCHES, BRANCHES_TH, ANIMALS_TH, ELEMENTS, STEM_ELEMENT, BRANCH_ELEMENT, HIDDEN_STEMS, TERMS };
});
