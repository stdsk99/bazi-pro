// analysis.js — ชั้นวิเคราะห์ดวง (ตามระบบที่ตกลงกันไว้)
// ขั้นตอน: คะแนนฝ่ายช่วย (ราศีบน + ราศีล่าง) → ตรวจดวงพิเศษ → ประเภทดวงปกติ → ธาตุดี/ร้าย
// ตรวจเทียบกับระบบอ้างอิง: คะแนนตรง 100%, ประเภทดวง ~98%, ชุดธาตุดี/ร้าย ~94%
// ตัวแปรภายในใช้รหัสธาตุภายใน (0 ทอง 1 น้ำ 2 ไม้ 3 ไฟ 4 ดิน) แล้วแปลงเป็นรหัสของ BaziCore ตอนส่งออก
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'), require('./analysis-tables.js'));
    else root.BaziAnalysis = factory(root.BaziCore, root.BaziAnalysisTables);
})(typeof self !== 'undefined' ? self : this, function (B, TABLES) {
    'use strict';

    const ET = [2, 2, 3, 3, 4, 4, 0, 0, 1, 1];             // ธาตุของก้าน (รหัสภายใน)
    const EL = [1, 4, 2, 2, 4, 3, 3, 4, 0, 0, 4, 1];       // ธาตุของกิ่ง (รหัสภายใน)
    const TO_CORE = [3, 4, 0, 1, 2];                        // รหัสภายใน -> รหัส BaziCore (0 ไม้ 1 ไฟ 2 ดิน 3 ทอง 4 น้ำ)
    const HID = [[10], [6, 10, 8], [1, 3, 5], [2], [5, 2, 10], [3, 5, 7], [4, 6], [6, 4, 2], [7, 9, 5], [8], [5, 8, 4], [9, 1]]; // 1-based
    const HID_W = [[5, 0, 0], [5, 3, 2], [5, 3, 1], [5, 0, 0], [5, 2, 2], [5, 1, 2], [5, 3, 0], [5, 2, 2], [5, 3, 1], [5, 0, 0], [5, 3, 2], [5, 3, 0]];
    const REL = '同食財官印';
    const REL_TH = { '同': 'ธาตุเดียวกัน', '食': 'ธาตุถ่ายเท', '財': 'ธาตุทรัพย์', '官': 'ธาตุอำนาจ', '印': 'ธาตุให้กำเนิด' };
    const mod = (n, m) => ((n % m) + m) % m;
    const adj0 = (x) => mod(x - 1, 10) + 1, adj1 = (x) => mod(x - 1, 12) + 1;

    const PATTERN_TH = {
        1: 'ดวงกระแสดินแข็งแรง', 2: 'ดวงกระแสน้ำแข็งแรง', 3: 'ดวงกระแสทองแข็งแรง', 4: 'ดวงกระแสไม้แข็งแรง', 5: 'ดวงกระแสไฟแข็งแรง',
        6: 'ดวงภาคีดิถีดิน', 7: 'ดวงภาคีดิถีไฟ', 8: 'ดวงภาคีดิถีน้ำ', 9: 'ดวงภาคีดิถีทอง', 10: 'ดวงภาคีดิถีไม้',
        11: 'ดวงสละดิถีตามธาตุถ่ายเท', 12: 'ดวงธาตุส่งเสริมมากเกิน', 13: 'ดวงสละดิถีตามอำนาจ', 14: 'ดวงสละดิถีตามโชค',
        15: 'ดวงสละดิถีตามธาตุแข็งแรง', 16: 'ดวง 2 ธาตุเกื้อหนุน (คู่ธาตุ+ส่งเสริม)', 17: 'ดวง 2 ธาตุเกื้อหนุน (คู่ธาตุ+ถ่ายเท)',
        18: 'ดวง 2 ธาตุขัดแย้ง', 20: 'ดวงกระแสแข็งแรงพิเศษ'
    };
    const PATTERN_ZH = { 1: '專旺', 2: '專旺', 3: '專旺', 4: '專旺', 5: '專旺', 6: '化氣', 7: '化氣', 8: '化氣', 9: '化氣', 10: '化氣', 11: '從兒', 12: '印旺', 13: '從殺', 14: '從財', 15: '從強', 16: '兩神成象', 17: '兩神成象', 18: '兩神相戰', 20: '專旺' };
    const STRENGTH_TH = { 1: 'ดิถีแข็งแรง', 6: 'ดิถีสมดุล', 2: 'ดิถีอ่อน ปานกลาง', 3: 'ดิถีอ่อน', 4: 'ดิถีอ่อน มีโรค (ใช้ยารักษา)' };

    // แปลงผลผูกดวงเป็นโครงสร้างภายใน: fn[k] = [ก้าน, กิ่ง] แบบ 1-based, k: 2 ยาม 3 วัน 4 เดือน 5 ปี
    function toFn(chart) {
        const p = chart.pillars, fn = [];
        [['hour', 2], ['day', 3], ['month', 4], ['year', 5]].forEach(([k, i]) => { fn[i] = [p[k].stem + 1, p[k].branch + 1]; });
        return fn;
    }

    // ---------- คะแนนฝ่ายช่วย: ราศีบน + ราศีล่าง ----------
    // ราศีบน: ก้านทั้ง 4 (รวมก้านวัน) ที่เป็นธาตุเดียวกัน/ให้กำเนิด ตัวละ 1
    //   หัก 0.5 เมื่อถูกก้านข้างเคียงขั้วเดียวกันข่ม: ก้านเดือน↔ก้านปี, ก้านวันเมื่อถูกข่มทั้งก้านยามและก้านเดือน
    // ราศีล่าง: กิ่งฝ่ายช่วย ยาม 1 · วัน 1.5 · เดือน 2 · ปี 1
    //   กิ่งดินคลัง (丑辰未戌) ที่แฝงธาตุฝ่ายช่วย (ยกเว้นทอง) ได้ 0.5 (กิ่งเดือน 1)
    //   กิ่งข้างเคียงที่ชงกันหักตามตำแหน่ง ยาม 0.5 · วัน 0.5 · เดือน 0.25 · ปี 0.5
    function supportScoreFn(fn) {
        const ek = ET[fn[3][0] - 1], km1 = mod(ek - 1, 5);
        const help = (e) => e === ek || e === km1;
        let upper = 0;
        for (let k = 2; k < 6; k++) {
            if (!help(ET[fn[k][0] - 1])) continue;
            let v = 1;
            const st = fn[k][0];
            if (k === 3 && st === adj0(fn[4][0] + 4) && st === adj0(fn[2][0] + 4)) v -= 0.5;
            if (k === 4 && st === adj0(fn[5][0] + 4)) v -= 0.5;
            if (k === 5 && st === adj0(fn[4][0] + 4)) v -= 0.5;
            upper += v;
        }
        const W = { 2: 1, 3: 1.5, 4: 2, 5: 1 }, D = { 2: 0.5, 3: 0.5, 4: 0.25, 5: 0.5 };
        const E = {}; for (let k = 2; k < 6; k++) E[k] = EL[fn[k][1] - 1];
        const sc = [0, 0, 0, 0, 0];
        const woodStem = [2, 3, 4, 5].some((k) => ET[fn[k][0] - 1] === 2), woodBr = [2, 3, 4, 5].some((k) => E[k] === 2);
        for (let k = 2; k < 6; k++) {
            const b = fn[k][1];
            sc[E[k]] += W[k];
            if (help(E[k]) || ![2, 5, 8, 11].includes(b)) continue;
            if (ek === 3 && b === 5) {
                if (woodStem || woodBr) sc[ek] += (woodBr ? [0.5, 0.75, 1, 0.5] : [0.25, 0.25, 0.5, 0.25])[k - 2];
            } else {
                const h = HID[b - 1].slice(1).find((x) => help(ET[x - 1]) && ET[x - 1] !== 0);
                if (h !== undefined) sc[ET[h - 1]] += k === 4 ? 1 : 0.5;
            }
        }
        const flags = new Set();
        const clash = (a, c) => fn[a][1] === adj1(fn[c][1] + 6);
        for (let k = 2; k < 6; k++) {
            const e = E[k];
            if (e === 4 && (ek === 4 || ek === 0)) continue;
            for (const nb of [k + 1, k - 1]) {
                if (nb < 2 || nb > 5 || !clash(k, nb) || (flags.has(k) && flags.has(nb))) continue;
                flags.add(k); flags.add(nb);
                sc[e] -= D[k]; sc[E[nb]] -= D[nb];
                if (e === 4) sc[ek] -= D[nb];
            }
        }
        const lower = sc[ek] + sc[km1];
        return { upper, lower, total: upper + lower };
    }

    // จำนวนธาตุบนก้าน [0] และในกิ่ง [1]
    function counts(fn) {
        const c = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
        for (let k = 2; k < 6; k++) { c[ET[fn[k][0] - 1]][0]++; c[EL[fn[k][1] - 1]][1]++; }
        return c;
    }
    // กำลังธาตุตามฤดู: จำนวนตัว × น้ำหนักฤดู (ธาตุเดือน 5, ธาตุที่เดือนให้กำเนิด 4, ...) + ครึ่งหนึ่งของธาตุแม่
    function seasonalStrength(fn) {
        const cnt = [0, 0, 0, 0, 0];
        for (let k = 2; k < 6; k++) { cnt[ET[fn[k][0] - 1]]++; cnt[EL[fn[k][1] - 1]]++; }
        const m = EL[fn[4][1] - 1], w = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) w[(m + i) % 5] = 5 - i;
        const a = cnt.map((c, e) => c * w[e]);
        const half = a.map((x) => Math.trunc(x / 2));
        return a.map((x, e) => x + (x > 0 ? half[mod(e - 1, 5)] : 0));
    }
    // ธาตุหลักที่ใช้ (อำนาจ / ทรัพย์ / ให้กำเนิด) ที่มีทั้งบนก้านและในกิ่ง และมีกำลังมากที่สุด
    function keyElement(fn, ek, c, A) {
        const km2 = mod(ek - 2, 5), kp2 = mod(ek + 2, 5), km1 = mod(ek - 1, 5);
        const v = [km2, kp2, km1].map((e) => (c[e][0] > 0 && c[e][1] > 0 ? A[e] : 0));
        let r = -1;
        if (v[0] + v[1] + v[2] === 0) {
            if (A[km2] >= A[kp2] && A[km2] >= A[km1]) r = km2;
            if (A[kp2] >= A[km2] && A[kp2] >= A[km1]) r = kp2;
            return (A[km1] < A[km2] || A[km1] < A[kp2]) ? r : km1;
        }
        if (v[0] > 0 && v[0] >= v[1] && v[0] >= v[2]) r = km2;
        if (v[1] > 0 && v[1] >= v[0] && v[1] >= v[2]) r = kp2;
        return (v[2] <= 0 || v[2] < v[1] || v[2] < v[0]) ? r : km1;
    }
    // ตรวจดวงสละดิถี (從格): คะแนนต่ำ ไม่มีฝ่ายช่วยในกิ่ง ไม่มีธาตุให้กำเนิดบนก้าน แล้วตามธาตุที่มีกำลังสูงสุด
    function followPattern(fn, ek, c, score) {
        const km1 = mod(ek - 1, 5), kp2 = mod(ek + 2, 5);
        if (!(score.total < 4 && score.lower < 1)) return null;
        if (c[ek][1] + c[km1][1] !== 0 || c[km1][0] !== 0) return null;
        const b = new Array(10).fill(0);
        for (let k = 2; k < 6; k++) {
            b[fn[k][0] - 1] += 5;
            HID[fn[k][1] - 1].forEach((h, j) => {
                let w = HID_W[fn[k][1] - 1][j]; const e = ET[h - 1];
                if (k === 3 && (e === ek || e === km1)) w = w === 5 ? 8 : w * 2;
                if (k === 4 && j === 0) b[h - 1] += w * 2;
                b[h - 1] += w;
            });
        }
        const P0 = [0, 0, 0, 0, 0];
        for (let s = 0; s < 10; s++) P0[mod(ET[s] - ek, 5)] += b[s];
        const P1 = P0.map((v, r) => v + P0[mod(r - 1, 5)] / 2);
        let hi = 0, mx = 0;
        P1.forEach((v, r) => { if (v > mx) { mx = v; hi = r; } });
        const wealthAny = c[kp2][0] + c[kp2][1] > 0;
        if (!wealthAny && hi === 1) return 11;
        if (hi === 3) return 13;
        if (hi === 2 || (wealthAny && hi === 1)) return 14;
        return null;
    }
    const waterSupport = (fn) => (ET[fn[3][0] - 1] === 1 && EL[fn[3][1] - 1] === 4 && (fn[3][1] === 2 || fn[3][1] === 5)) ? 1 : 0;

    function normalType(fn, ek, c, A, score) {
        const tot = (e) => c[e][0] + c[e][1];
        const km1 = mod(ek - 1, 5), km2 = mod(ek - 2, 5), kp1 = mod(ek + 1, 5), kp2 = mod(ek + 2, 5);
        if (score.total < 4.5) {
            const pw = tot(km2) - waterSupport(fn);
            if ((pw >= 3 && tot(km1) === 0 && tot(kp1) >= 1) || (pw === 2 && tot(kp2) >= 2 && tot(kp1) >= 1 && tot(km1) === 0 && A[km2] > A[kp1])) return 4;
            return score.total <= 3 ? 3 : 2;
        }
        return score.total >= 5 ? 1 : 6;
    }

    // กุญแจแบบเดียวกับที่ใช้สร้างตาราง (รูปแบบ tuple ของ Python)
    const pyKey = (arr) => '(' + arr.map((x) => typeof x === 'boolean' ? (x ? 'True' : 'False') : typeof x === 'string' ? `'${x}'` : String(x)).join(', ') + ')';
    function specialKey(fn, ek, c, score) {
        const tot = (e) => c[e][0] + c[e][1];
        const km1 = mod(ek - 1, 5), km2 = mod(ek - 2, 5), kp1 = mod(ek + 1, 5), kp2 = mod(ek + 2, 5);
        const T = score.total, h = tot(ek) + tot(km1), out = tot(kp1), pw = tot(km2);
        const f6 = T >= 8 || h >= 7 || (T >= 7 && h === 6 && out === 1 && pw === 1);
        const p1 = EL[fn[4][1] - 1] === km1 && tot(ek) >= 3 && tot(km1) >= 3 && tot(kp2) === 0 && pw === 0 && out <= 1;
        const p2 = EL[fn[4][1] - 1] === kp1 && tot(ek) >= 3 && out >= 3 && T >= 4.5 && tot(kp2) === 0 && pw === 0;
        return pyKey([ek, fn[4][1], f6, pw + out <= 1, T >= 7, p1, p2, T < 5]);
    }
    function favKey(fn, ek, c, A, type) {
        const km1 = mod(ek - 1, 5), km2 = mod(ek - 2, 5), kp1 = mod(ek + 1, 5), kp2 = mod(ek + 2, 5);
        const tot = (e) => c[e][0] + c[e][1];
        const hi = keyElement(fn, ek, c, A);
        const hirel = hi >= 0 ? REL[mod(hi - ek, 5)] : '-';
        if (type === 4) return pyKey(['U', c[kp1][0] > 0, c[kp1][1] > 0, c[ek][1] > 0]);
        if (type === 2 || type === 3) {
            const z2 = c[km1][0] >= 1, z3 = c[km1][1] >= 1;
            let dt = 0;
            if (A[kp1] > A[km2] && A[kp1] > A[kp2] && tot(kp1) >= 3) dt = 8;
            else if (A[kp2] >= A[kp1] - 1 && A[kp2] > A[km2]) dt = 9;
            else if (A[km2] >= A[kp2] - 1 && A[km2] > A[kp1]) dt = 10;
            return pyKey(['W', type, z2, z3, type === 3 ? dt : 0, hirel === '官', km2 === 4, ek]);
        }
        return pyKey(['S', type, c[km1][0] > 0, hirel, c[km2][0] > 0, c[km2][1] > 0, tot(kp2) > 0, tot(kp1) > 0,
            A[kp2] > A[kp1], A[kp1] > A[km2], A[ek] > A[km1], A[km1] > A[ek], tot(km1) <= 2]);
    }

    // แปลงป้าย [ธาตุดี, ธาตุร้าย] เป็นรายการธาตุของ BaziCore
    function decode(label, ek) {
        const [favS, unfavS] = label.map((s) => (s ? s.split('+') : []));
        const elOf = (r) => mod(ek + REL.indexOf(r), 5);
        const build = (tokens, side) => {
            const out = [];
            for (const t of tokens) {
                if (REL.includes(t)) out.push({ code: elOf(t), relation: REL_TH[t], zh: t });
                else if (t === '9') out.push({ code: ek, relation: REL_TH['同'], zh: '比肩', polarity: 'same' });
                else if (t === '10') out.push({ code: ek, relation: REL_TH['同'], zh: '劫財', polarity: 'opposite' });
            }
            // 14/15: ธาตุที่อยู่ทั้งสองฝั่ง ดี/ร้ายต่างกันระหว่างก้านกับกิ่ง
            const split = tokens.includes('14') ? 'branch' : tokens.includes('15') ? 'stem' : null;
            return { out, split };
        };
        const F = build(favS, 'fav'), U = build(unfavS, 'unfav');
        const both = F.out.filter((x) => !x.polarity && U.out.some((y) => !y.polarity && y.code === x.code)).map((x) => x.code);
        const fin = (list, isFav) => list.map((x) => {
            const e = TO_CORE[x.code];
            const o = { element: e, th: B.ELEMENTS[e], relation: x.relation };
            if (x.polarity) o.polarity = x.polarity;
            if (both.includes(x.code) && !x.polarity && F.split) {
                const favPos = F.split; // ตำแหน่งที่เป็นคุณ
                o.position = isFav ? favPos : (favPos === 'branch' ? 'stem' : 'branch');
            }
            return o;
        });
        return { favorable: fin(F.out, true), unfavorable: fin(U.out, false) };
    }

    function analyze(chart) {
        const fn = toFn(chart);
        const ek = ET[fn[3][0] - 1];
        const score = supportScoreFn(fn);
        const c = counts(fn), A = seasonalStrength(fn);
        const reasons = [`คะแนนฝ่ายช่วย ราศีบน ${score.upper} + ราศีล่าง ${score.lower} = ${score.total}`];
        let pattern = 0, strength = null, label = null;
        const fp = followPattern(fn, ek, c, score);
        if (fp) {
            pattern = fp;
            reasons.push('คะแนนต่ำ ไม่มีฝ่ายช่วยในกิ่งและไม่มีธาตุให้กำเนิดบนก้าน เจ้าชะตาจึงยอมตามธาตุที่มีกำลังสูงสุด');
        } else {
            pattern = TABLES.special[specialKey(fn, ek, c, score)] || 0;
        }
        if (pattern) {
            const tot = (e) => c[e][0] + c[e][1];
            label = TABLES.specialFav[pyKey([pattern, tot(mod(ek + 1, 5)) > 0, tot(mod(ek + 2, 5)) > 0])];
        } else {
            strength = normalType(fn, ek, c, A, score);
            label = TABLES.fav[favKey(fn, ek, c, A, strength)];
            if (strength === 4) reasons.push('ธาตุอำนาจกดเจ้าชะตาหนักโดยไม่มีธาตุให้กำเนิดช่วย เปรียบเหมือนดวงมีโรค ต้องใช้ธาตุถ่ายเทเป็นยา (病藥)');
        }
        const fu = label ? decode(label, ek) : { favorable: [], unfavorable: [] };
        return {
            pattern, patternTh: pattern ? PATTERN_TH[pattern] : 'ดวงปกติ', patternZh: pattern ? PATTERN_ZH[pattern] : '正格',
            strength, strengthTh: strength ? STRENGTH_TH[strength] : null,
            score, seasonal: A.map((v, e) => ({ element: TO_CORE[e], th: B.ELEMENTS[TO_CORE[e]], value: v })),
            keyElement: (() => { const h = keyElement(fn, ek, c, A); return h >= 0 ? { element: TO_CORE[h], th: B.ELEMENTS[TO_CORE[h]] } : null; })(),
            favorable: fu.favorable, unfavorable: fu.unfavorable,
            reasons, matched: !!label
        };
    }

    function supportScore(chart) { return supportScoreFn(toFn(chart)); }
    return { analyze, supportScore, PATTERN_TH, STRENGTH_TH };
});
