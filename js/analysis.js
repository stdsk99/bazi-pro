// analysis.js — ชั้นวิเคราะห์ดวง: คะแนนฝ่ายช่วย → การแปรธาตุ → ลักษณะดวง → กำลังดิถี → ธาตุดี/ร้าย/กลาง
// ตรวจเทียบกับระบบอ้างอิงครบทุกผังที่ผูกได้ (518,400 แบบ) ตรงกันทั้งหมด — ดู tools/refcheck/
// ตัวแปรภายในใช้รหัสธาตุภายใน (0 ทอง 1 น้ำ 2 ไม้ 3 ไฟ 4 ดิน) แล้วแปลงเป็นรหัสของ BaziCore ตอนส่งออก
// fn[k] = [ก้าน 1–10, กิ่ง 1–12] k: 2 ยาม 3 วัน 4 เดือน 5 ปี
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'));
    else root.BaziAnalysis = factory(root.BaziCore);
})(typeof self !== 'undefined' ? self : this, function (B) {
    'use strict';

    const ET = [2, 2, 3, 3, 4, 4, 0, 0, 1, 1];             // ธาตุของก้าน (รหัสภายใน)
    const EL = [1, 4, 2, 2, 4, 3, 3, 4, 0, 0, 4, 1];       // ธาตุของกิ่ง (รหัสภายใน)
    const TO_CORE = [3, 4, 0, 1, 2];                        // รหัสภายใน -> รหัส BaziCore (0 ไม้ 1 ไฟ 2 ดิน 3 ทอง 4 น้ำ)
    const EL_TH = ['ทอง', 'น้ำ', 'ไม้', 'ไฟ', 'ดิน'];
    // ก้านแฝง (1-based) และน้ำหนักตามลำดับ
    const HID = [[10], [6, 8, 10], [1, 3, 5], [2], [5, 10, 2], [3, 5, 7], [4, 6], [6, 2, 4], [7, 5, 9], [8], [5, 4, 8], [9, 1]];
    const HID_W = [[5, 0, 0], [5, 3, 2], [5, 3, 1], [5, 0, 0], [5, 2, 2], [5, 1, 2], [5, 3, 0], [5, 2, 2], [5, 3, 1], [5, 0, 0], [5, 3, 2], [5, 3, 0]];
    const REL = '同食財官印';
    const REL_TH = { '同': 'คู่ธาตุ', '食': 'ธาตุถ่ายเท', '財': 'ธาตุโชคลาภ', '官': 'ธาตุอำนาจ', '印': 'ธาตุส่งเสริม' };
    const mod = (n, m) => ((n % m) + m) % m;
    const E = (x) => mod(x, 5), adj0 = (x) => mod(x - 1, 10) + 1, adj1 = (x) => mod(x - 1, 12) + 1;
    const mother = (e) => E(e - 1), child = (e) => E(e + 1), ctrl = (e) => E(e - 2);
    const clashOf = (b) => adj1(b + 6);

    const PATTERN_TH = {
        1: 'ดวงกระแสดินแข็งแรง', 2: 'ดวงกระแสน้ำแข็งแรง', 3: 'ดวงกระแสทองแข็งแรง', 4: 'ดวงกระแสไม้แข็งแรง', 5: 'ดวงกระแสไฟแข็งแรง',
        6: 'ดวงภาคีดิถีดิน', 7: 'ดวงภาคีดิถีไฟ', 8: 'ดวงภาคีดิถีน้ำ', 9: 'ดวงภาคีดิถีทอง', 10: 'ดวงภาคีดิถีไม้',
        11: 'ดวงสละดิถีตามธาตุถ่ายเท', 12: 'ดวงธาตุส่งเสริมมากเกิน', 13: 'ดวงสละดิถีตามอำนาจ', 14: 'ดวงสละดิถีตามโชค',
        15: 'ดวงสละดิถีตามธาตุแข็งแรง', 16: 'ดวง 2 ธาตุเกื้อหนุน (คู่ธาตุ+ส่งเสริม)', 17: 'ดวง 2 ธาตุเกื้อหนุน (คู่ธาตุ+ถ่ายเท)',
        18: 'ดวง 2 ธาตุขัดแย้ง', 20: 'ดวงกระแสแข็งแรงพิเศษ'
    };
    const PATTERN_ZH = { 1: '專旺', 2: '專旺', 3: '專旺', 4: '專旺', 5: '專旺', 6: '化氣', 7: '化氣', 8: '化氣', 9: '化氣', 10: '化氣', 11: '從兒', 12: '印旺', 13: '從殺', 14: '從財', 15: '從強', 16: '兩神成象', 17: '兩神成象', 18: '兩神相戰', 20: '專旺' };
    const STRENGTH_TH = { 1: 'ดิถีแข็งแรง', 6: 'ดิถีสมดุล', 2: 'ดิถีอ่อน ปานกลาง', 3: 'ดิถีอ่อน', 4: 'ดิถีอ่อน มีโรค (ใช้ยารักษา)' };

    // แปลงผลผูกดวงเป็นโครงสร้างภายใน
    function toFn(chart) {
        const p = chart.pillars, fn = [];
        [['hour', 2], ['day', 3], ['month', 4], ['year', 5]].forEach(([k, i]) => { fn[i] = [p[k].stem + 1, p[k].branch + 1]; });
        return fn;
    }
    const rawEle = (fn) => { const r = []; for (let k = 2; k < 6; k++) r[k] = [ET[fn[k][0] - 1], EL[fn[k][1] - 1]]; return r; };

    // ---------- 1) คะแนนฝ่ายช่วย ----------
    // ราศีบน: ก้านธาตุเดียวกัน/ให้กำเนิดดิถี ตัวละ 1 · หัก 0.5 เมื่อถูกก้านข้างเคียงขั้วเดียวกันข่ม
    // ราศีล่าง: กิ่งยาม 1 วัน 1.5 เดือน 2 ปี 1 · หักเมื่อกิ่งข้างเคียงชงกัน · เพิ่มเมื่อกิ่งคลังแฝงรากของดิถี
    // โบนัส +2 เมื่อกิ่งครบรวมทิศหรือรวมสามของธาตุดิถี (เพดาน 9.9)
    const SEASON = [[3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 1, 2]], TRIO = [[12, 4, 8], [3, 7, 11], [6, 10, 2], [9, 1, 5]], GROUP_EL = [2, 3, 0, 1];
    function supportScoreFn(fn) {
        const ek = ET[fn[3][0] - 1], km1 = E(ek - 1), km2 = E(ek - 2), kp2 = E(ek + 2);
        const S = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
        const top = (k) => ET[fn[k][0] - 1], low = (k) => EL[fn[k][1] - 1];
        const cs = {}, cb = {};
        for (let k = 2; k < 6; k++) {
            const e = top(k); S[e][0] += 1;
            if (k === 3 && !cs[3] && fn[3][0] === adj0(fn[4][0] + 4) && fn[3][0] === adj0(fn[2][0] + 4)) { cs[3] = 1; S[e][0] -= 0.5; }
            if (k === 4 && fn[4][0] === adj0(fn[5][0] + 4) && !cs[4]) { cs[4] = 1; S[e][0] -= 0.5; }
            if (k === 5 && fn[5][0] === adj0(fn[4][0] + 4) && !cs[5]) { cs[5] = 1; S[e][0] -= 0.5; }
        }
        const D = [0, 0, 0.5, 0.5, 0.25, 0.5];
        for (let k = 2; k < 6; k++) {
            const e = low(k), b = fn[k][1];
            S[e][1] += k === 4 ? 2 : k === 3 ? 1.5 : 1;
            if ((e !== 4 || (ek !== 4 && ek !== 0)) && k < 5 && b === clashOf(fn[k + 1][1]) && (!cb[k] || !cb[k + 1])) {
                cb[k] = cb[k + 1] = 1; S[e][1] -= D[k]; S[low(k + 1)][1] -= D[k + 1];
                if (e === 4) S[ek][1] -= D[k + 1];
            }
            if ((ek === 2 && [2, 5, 8].includes(b)) || (ek === 3 && [8, 11].includes(b)) || (ek === 1 && [2, 5].includes(b))) S[ek][1] += k === 4 ? 1 : 0.5;
        }
        const e4 = top(4), e5 = top(5), samePol = fn[4][0] % 2 === fn[5][0] % 2;
        if (samePol && !cs[4] && !cs[5] && ((e4 === ek && e5 === km2) || (e5 === ek && e4 === km2) || (e4 === km1 && e5 === kp2) || (e5 === km1 && e4 === kp2))) {
            cs[4] = cs[5] = 1;
            if (e4 !== ek && e4 !== km1) S[e5][0] -= 0.5; else S[e4][0] -= 0.5;
        }
        if (ek === 3) {
            let lv = -1;
            for (let k = 2; k < 6; k++) { if (top(k) === 2) lv = Math.max(0, lv); if (low(k) === 2) lv = 1; }
            if (lv >= 0) for (let k = 2; k < 6; k++) if (fn[k][1] === 5) S[ek][1] += [[0.25, 0.25, 0.5, 0.25], [0.5, 0.75, 1, 0.5]][lv][k - 2];
        }
        const upper = S[ek][0] + S[km1][0], lower = S[ek][1] + S[km1][1];
        const brs = [2, 3, 4, 5].map((k) => fn[k][1]);
        let bonus = 0;
        for (let s = 0; s < 4; s++) if (GROUP_EL[s] === ek && (SEASON[s].every((x) => brs.includes(x)) || TRIO[s].every((x) => brs.includes(x)))) bonus += 2;
        return { upper, lower, bonus, total: Math.min(9.9, upper + lower + bonus) };
    }

    // ---------- 2) การแปรธาตุ ----------
    // ธาตุที่ข่ม target ถูกทำให้หมดแรงหรือไม่ (ถูกข่มจากข้างเคียง หรือรวมกับข้างเคียง)
    const HALF = [[5, 9], [10, 0], [7, 0], [8, 12], [1, 0], [10, 0], [3, 11], [4, 0], [1, 0], [6, 2], [7, 0], [4, 0]];
    function neutralized(fn, A, k, side, target) {
        if (A[k][side] !== ctrl(target)) return true;
        if (k === 2 && side === 0) { const x = ctrl(A[2][0]); return A[2][1] === x || A[3][0] === x || fn[3][0] === adj0(fn[2][0] + 5); }
        if (k === 2 && side === 1) { const x = ctrl(A[2][1]); return A[2][0] === x || A[3][1] === x || fn[3][1] === adj0(fn[2][1] + 6) || HALF[fn[2][1] - 1].includes(fn[3][1]); }
        if (k === 3 && side === 1) {
            const x = ctrl(A[3][1]), y = adj0(fn[3][1] + 6);
            return A[3][0] === x || A[2][1] === x || A[4][1] === x || fn[2][1] === y || fn[4][1] === y || HALF[fn[3][1] - 1].some((h) => h && (fn[2][1] === h || fn[4][1] === h));
        }
        if (k === 4 && side === 0) { const x = ctrl(A[4][0]), y = adj0(fn[4][0] + 5); return A[3][0] === x || A[5][0] === x || A[4][1] === x || fn[3][0] === y || fn[5][0] === y; }
        if (k === 5 && side === 0) { const x = ctrl(A[5][0]); return A[4][0] === x || A[5][1] === x || fn[4][0] === adj0(fn[5][0] + 5); }
        if (k === 5 && side === 1) { const x = ctrl(A[5][1]); return A[5][0] === x || A[4][1] === x || fn[4][1] === adj0(fn[5][1] + 6) || HALF[fn[3][1] - 1].some((h) => h && fn[4][1] === h); }
        return false;
    }
    const SEASON_EL = [2, 3, 0, 1], TRIO_EL = [2, 3, 0, 1];
    const SIX_EL = [4, 4, 2, 3, 0, 1, 3, 3, 1, 0, 3, 2];
    const sixOf = (b) => adj1(15 - b), trioNext = (b) => adj1(b + 4), cardinal = (b) => b % 3 === 1;
    const isSeasonSet = (a, b, c) => a !== b && b !== c && a !== c && SEASON.some((q) => q.includes(a) && q.includes(b) && q.includes(c));
    const isTrioSet = (a, b, c) => [[a, b, c], [b, a, c], [c, a, b]].some(([x, y, z]) => (y === trioNext(x) && z === adj1(x + 8)) || (z === trioNext(x) && y === adj1(x + 8)));
    const eqk = (a, b, c) => a !== b || a === c;
    const HY = (a, b) => (a === 2 && b === 5) || (a === 5 && b === 2);
    const POS_TH = { 2: 'ยาม', 3: 'วัน', 4: 'เดือน', 5: 'ปี' };

    function transform(fn) {
        const raw = rawEle(fn), act = []; for (let k = 2; k < 6; k++) act[k] = raw[k].slice();
        const notes = [];
        const set = (k, sd, T, why) => { if (act[k][sd] !== T) notes.push({ k, side: sd, from: act[k][sd], to: T, why }); act[k][sd] = T; };
        const ek = raw[3][0], km1 = E(ek - 1), km2 = E(ek - 2), kp2 = E(ek + 2);
        const b = (k) => fn[k][1], s = (k) => fn[k][0];
        const C = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
        for (let k = 2; k < 6; k++) { C[raw[k][0]][0]++; C[raw[k][1]][1]++; }
        const tot = (e) => C[e][0] + C[e][1];
        const lone = (e) => tot(e) + tot(mother(e)) === 1;      // ธาตุนี้มีตัวเดียวและไม่มีธาตุแม่
        const neut = (k, sd, T) => neutralized(fn, act, k, sd, T);
        // รวมทิศ / รวมสาม ของกิ่ง 3 ตัว (ตัวที่ 4 คือ o)
        const TRIPLES = [[[2, 3, 4], 5], [[2, 4, 5], 3], [[2, 3, 5], 4], [[3, 4, 5], 2]];
        const otherOk = (t, o, e, T) => tot(e) >= 4 && t.every((p) => !(act[p][1] === child(e) && act[p][1] !== T && Math.abs(p - o) === 1 && !HY(o, p)));
        const groupOk = (t, o, T) => t.every((p) => act[p][1] >= 0) && otherOk(t, o, act[o][0], T) && otherOk(t, o, act[o][1], T);
        let combined = false;
        for (const [t, o] of TRIPLES) {
            if (!isSeasonSet(b(t[0]), b(t[1]), b(t[2]))) continue;
            const T = SEASON_EL[Math.floor((adj1(b(t[0]) - 2) - 1) / 3)];
            if (!groupOk(t, o, T) || !t.every((p) => lone(act[p][1]))) continue;
            t.forEach((p) => set(p, 1, T, 'รวมทิศ'));
            const wu = (k) => s(k) === 5;
            if (b(o) === 5 && T === 1 && ((o === 2 && !wu(2) && !wu(3)) || (o === 3 && (!wu(3) || (!wu(2) && !wu(4)))) || (o === 4 && !wu(4) && !wu(3) && !wu(5)) || (o === 5 && !wu(5) && !wu(4)))) set(o, 1, T, 'รวมทิศ');
            if (b(o) === 11 && T === 3 && act[o][0] === T) set(o, 1, T, 'รวมทิศ');
            if (b(o) === 2 && T === 0 && act[o][0] === T) set(o, 1, T, 'รวมทิศ');
            if (b(o) === 8 && T === 2 && act[o][0] === T) set(o, 1, T, 'รวมทิศ');
            combined = true;
        }
        if (!combined) {
            for (const [t, o] of TRIPLES) {
                if (!isTrioSet(b(t[0]), b(t[1]), b(t[2]))) continue;
                const T = TRIO_EL[3 - (b(t[0]) - 1) % 4];
                if (!groupOk(t, o, T) || !t.every((p) => lone(act[p][1]))) continue;
                t.forEach((p) => set(p, 1, T, 'รวมสาม'));
                combined = true;
            }
        }
        // ภาคีครึ่งและภาคี 6 ของกิ่งที่อยู่ติดกัน
        const free = (p, q, T) => [act[p][0], act[q][0]].every((x) => [act[p][1], act[q][1]].every((y) => eqk(x, y, T) && eqk(x, mother(y), T)));
        const noPartner = (a, c) => b(a) !== sixOf(b(c)) && b(c) !== sixOf(b(a)) && ((b(a) !== trioNext(b(c)) && b(c) !== trioNext(b(a))) || (!cardinal(b(a)) && !cardinal(b(c))));
        const pair = (lo, T, why) => {
            if (lo === 4) {
                if (raw[4][1] === T && free(4, 5, T) && neut(3, 0, T) && neut(3, 1, T) && neut(4, 0, T) && neut(5, 0, T) && noPartner(3, 4) && lone(act[5][1])) set(5, 1, T, why);
            } else if (lo === 3) {
                if (raw[4][1] === T && free(3, 4, T) && neut(2, 0, T) && neut(2, 1, T) && neut(3, 0, T) && neut(4, 0, T) && neut(5, 0, T) && neut(5, 1, T) &&
                    noPartner(5, 4) && act[2][1] !== mother(act[3][1]) && lone(act[3][1])) set(3, 1, T, why);
            } else if ((act[4][1] === T || act[4][1] === mother(T)) && free(2, 3, T) && neut(2, 0, T) && neut(3, 0, T) && neut(4, 0, T) &&
                [act[2][0], act[3][0], act[4][0], act[4][1]].includes(T) && act[4][0] !== act[3][1] && act[4][0] !== mother(act[3][1]) && lone(act[2][1]) && lone(act[3][1])) {
                set(2, 1, T, why); set(3, 1, T, why);
            }
        };
        if (!combined) {
            const trioEl = (x) => TRIO_EL[3 - (x - 1) % 4];
            for (let k = 2; k < 5; k++) if (b(k) === trioNext(b(k + 1)) && (cardinal(b(k)) || cardinal(b(k + 1))) && act[k][1] >= 0) pair(k, trioEl(b(k)), 'ภาคีครึ่ง');
            for (let k = 3; k < 6; k++) if (b(k) === trioNext(b(k - 1)) && (cardinal(b(k)) || cardinal(b(k - 1))) && act[k][1] >= 0) pair(k - 1, trioEl(b(k)), 'ภาคีครึ่ง');
            for (let k = 2; k < 5; k++) if (b(k + 1) === sixOf(b(k)) && act[k][1] >= 0) pair(k, SIX_EL[b(k) - 1], 'ภาคี 6');
            for (let k = 3; k < 6; k++) if (b(k - 1) === sixOf(b(k)) && act[k][1] >= 0) pair(k - 1, SIX_EL[b(k) - 1], 'ภาคี 6');
        }
        // ก้านเดือนรวมกับก้านปี
        let stemDone = false;
        if (act[4][0] >= 0 && act[5][0] >= 0 && s(4) === adj0(s(5) + 5)) {
            const T = (s(5) + 3) % 5, mT = mother(T), cT = ctrl(T);
            const ms = [mother(act[4][0]), mother(act[5][0])], X = [act[3][0], act[3][1], act[4][1], act[5][1]];
            if ((act[4][1] === T || act[4][1] === mT) && act[3][0] !== cT && act[3][1] !== cT && act[5][1] !== cT &&
                [act[3][0], act[3][1], act[4][1], act[5][1], act[4][0], act[5][0]].includes(T) &&
                ms.every((m) => X.every((x) => x !== m || x === T || x === mT)) && lone(act[4][0]) && lone(act[5][0])) {
                set(4, 0, T, 'ก้านรวม'); set(5, 0, T, 'ก้านรวม'); stemDone = true;
            }
        }
        if (!stemDone && (s(4) === adj0(s(5) + 5) || s(5) === adj0(s(4) + 5))) {
            const dayHour = s(3) === adj0(s(2) + 5);
            const flags = (k) => {
                const v = act[k][0], inV = (x) => x === v || x === mother(v);
                return { all: inV(act[3][1]) && inV(act[4][1]) && inV(act[5][1]), none: !inV(act[3][1]) && !inV(act[4][1]) && !inV(act[5][1]), dayIn: inV(act[3][0]) };
            };
            const f4 = flags(4), f5 = flags(5);
            const g0 = f4.dayIn && dayHour && f4.all, g1 = (!f4.dayIn || dayHour) && f4.none;
            const g2 = f5.dayIn && !dayHour && f5.all, g3 = (!f5.dayIn || dayHour) && f5.none;
            if (g0 && g3 && lone(act[5][0])) set(5, 0, act[4][0], 'ก้านรวม');
            if (g2 && g1 && lone(act[4][0])) set(4, 0, act[5][0], 'ก้านรวม');
        }
        // ธาตุโดดที่ไม่มีแม่/ลูกอยู่ข้างเคียงและถูกข่ม ไม่นับ
        const wetEarth = () => [2, 5].some((t) =>
            (act[2][1] === 4 && b(2) === t && b(3) !== clashOf(t)) || (act[3][1] === 4 && b(3) === t && b(2) !== clashOf(t) && b(4) !== clashOf(t)) ||
            (act[4][1] === 4 && b(4) === t && b(3) !== clashOf(t) && b(5) !== clashOf(t)) || (act[5][1] === 4 && b(5) === t && b(4) !== clashOf(t)));
        const at = (p) => act[p[0]][p[1]];
        const count8 = (e) => { let n = 0; for (let k = 2; k < 6; k++) { if (act[k][0] === e) n++; if (act[k][1] === e) n++; } return n; };
        const isolate = (list, noChen, nFriend, nCtrl) => {
            for (const nb of list) {
                const e = at(nb[0]);
                if ((e === 1 && !wetEarth()) || count8(e) !== 1) continue;
                if (noChen && [2, 3, 4, 5].some((k) => b(k) === 5)) continue;
                if (nb.slice(1, 1 + nFriend).some((p) => at(p) === mother(e) || at(p) === child(e))) continue;
                if (nb.slice(1, 1 + nCtrl).some((p) => at(p) === ctrl(e))) set(nb[0][0], nb[0][1], -1, 'ธาตุโดดถูกข่ม');
            }
        };
        isolate([[[5, 0], [4, 0], [5, 1], [4, 1]], [[5, 1], [4, 1], [5, 0], [4, 0]], [[2, 0], [3, 0], [2, 1], [3, 1]], [[2, 1], [3, 1], [2, 0], [3, 0]]], true, 3, 2);
        isolate([[[3, 1], [2, 1], [3, 0], [4, 1], [2, 0], [4, 0]], [[4, 0], [3, 0], [4, 1], [5, 0], [3, 1], [5, 1]], [[4, 1], [3, 1], [4, 0], [5, 1], [3, 0], [5, 0]]], false, 5, 4);
        // ธาตุส่งเสริมตัวเดียวบนก้าน ถูกธาตุโชคลาภขวาง (ดิถีไม่มีคู่ธาตุ) ไม่นับ
        let s1 = 0, b1 = 0, ekn = 0;
        for (let k = 2; k < 6; k++) { if (act[k][0] === km1) s1++; if (act[k][1] === km1) b1++; if (act[k][0] === ek) ekn++; if (act[k][1] === ek) ekn++; }
        if (s1 === 1 && b1 === 0 && ekn === 1) {
            const no = (ps) => ps.every(([k, sd]) => act[k][sd] !== km2), any = (ps) => ps.some(([k, sd]) => act[k][sd] === kp2);
            if (act[2][0] === km1 && no([[2, 1], [3, 0], [3, 1]]) && any([[2, 1], [3, 0], [3, 1]])) set(2, 0, -1, 'ธาตุส่งเสริมถูกขวาง');
            if (act[4][0] === km1 && no([[4, 1], [3, 0], [3, 1], [5, 0], [5, 1]]) && any([[2, 1], [3, 0], [3, 1], [5, 0], [5, 1]])) set(4, 0, -1, 'ธาตุส่งเสริมถูกขวาง');
            if (act[5][0] === km1 && no([[5, 1], [4, 0], [4, 1]]) && any([[5, 1], [4, 0], [4, 1]])) set(5, 0, -1, 'ธาตุส่งเสริมถูกขวาง');
        }
        // เสา 壬辰 / 癸丑 ที่ไม่ถูกชง คืนธาตุก้าน
        for (const [st, br, enemy] of [[9, 5, 11], [10, 2, 8]]) {
            if (s(2) === st && b(2) === br && b(3) !== enemy && act[2][0] === -1) set(2, 0, raw[2][0], 'คืนธาตุ');
            if (s(4) === st && b(4) === br && b(3) !== enemy && b(5) !== enemy && act[4][0] === -1) set(4, 0, raw[4][0], 'คืนธาตุ');
            if (s(5) === st && b(5) === br && b(4) !== enemy && act[5][0] === -1) set(5, 0, raw[5][0], 'คืนธาตุ');
        }
        // คืนธาตุที่ถูกตัด ถ้าธาตุนั้นยังมีกำลังพอ
        const { A } = countsFn(fn, raw, act);
        const support = (e) => { let n = 0; for (let k = 2; k < 6; k++) if ([raw[k][0], raw[k][1]].some((x) => x === e || x === mother(e))) n++; return n > 1; };
        for (let k = 2; k < 6; k++) for (const sd of [0, 1]) {
            if (act[k][sd] !== -1) continue;
            const e = raw[k][sd];
            if (A[E(2 - act[3][0] + e)] >= 3 || support(e)) set(k, sd, e, 'คืนธาตุ');
        }
        // บันทึกเฉพาะตำแหน่งที่ธาตุสุดท้ายต่างจากเดิม
        const changed = [];
        for (let k = 2; k < 6; k++) for (const sd of [0, 1]) if (act[k][sd] !== raw[k][sd]) {
            const last = notes.filter((n) => n.k === k && n.side === sd && n.to === act[k][sd]).pop();
            changed.push({ k, side: sd, from: raw[k][sd], to: act[k][sd], why: last ? last.why : '' });
        }
        return { act, changed };
    }

    // ---------- 3) นับธาตุ กำลังตามฤดู กำลังก้านแฝง ----------
    function countsFn(fn, raw, act) {
        const c = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], cnt = [0, 0, 0, 0, 0];
        for (let k = 2; k < 6; k++) for (const s of [0, 1]) {
            const a = act[k][s];
            if (a >= 0) c[a][s]++;
            cnt[a >= 0 ? a : raw[k][s]]++;
        }
        const m = act[4][1] >= 0 ? act[4][1] : raw[4][1], w = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) w[(m + i) % 5] = 5 - i;
        const a = cnt.map((x, e) => x * w[e]);
        const A = a.map((x, e) => x + (x > 0 ? Math.trunc(a[E(e - 1)] / 2) : 0));
        return { c, A };
    }
    // กำลังก้านแฝง แยกตามความสัมพันธ์กับดิถี (0 คู่ 1 ถ่ายเท 2 โชค 3 อำนาจ 4 ส่งเสริม)
    function hiddenPower(fn, ek) {
        const km1 = E(ek - 1), b = new Array(10).fill(0);
        for (let k = 2; k < 6; k++) {
            b[fn[k][0] - 1] += 5;
            HID[fn[k][1] - 1].forEach((h, j) => {
                let wt = HID_W[fn[k][1] - 1][j]; const e = ET[h - 1];
                if (k === 3 && (e === ek || e === km1)) wt = wt === 5 ? 8 : wt * 2;
                b[h - 1] += (k === 4 && j === 0) ? wt * 2 : wt;
            });
        }
        const P0 = [0, 0, 0, 0, 0];
        for (let s = 0; s < 10; s++) P0[E(ET[s] - ek)] += b[s];
        const P1 = P0.map((v, r) => v + P0[E(r - 1)] / 2);
        let hi = 0, mx = 0; P1.forEach((v, r) => { if (v > mx) { mx = v; hi = r; } });
        return { P1, hi };
    }
    // ธาตุหลักที่ใช้ (อำนาจ / ทรัพย์ / ให้กำเนิด) ที่มีทั้งบนก้านและในกิ่ง และมีกำลังมากที่สุด
    function keyElement(ek, c, A) {
        const km2 = E(ek - 2), kp2 = E(ek + 2), km1 = E(ek - 1);
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

    // ---------- 4) ลักษณะดวง ----------
    const ROOT = { 3: [8, 11], 1: [5, 2], 2: [8, 5] };                 // กิ่งคลังที่แฝงรากของดิถีไฟ/น้ำ/ไม้
    const ROOT_PILLAR = { 1: [[5, 5], [6, 2]], 2: [[8, 8], [7, 5]] };
    const CLASHERS = { 2: [3], 3: [2, 4], 4: [3, 5], 5: [4] };
    // ดิถียอมสละได้หรือไม่: ไม่มีฝ่ายช่วยในกิ่ง ไม่มีธาตุส่งเสริมบนก้าน คะแนนต่ำ และไม่มีรากแฝงที่ยังใช้ได้
    function canFollow(x) {
        const { fn, ek, c, sc, act } = x, km1 = E(ek - 1);
        if (c[ek][1] + c[km1][1] !== 0 || c[km1][0] !== 0 || sc.total >= 4 || sc.lower >= 1) return false;
        if (c[ek][0] + c[ek][1] === 1) return true;
        const dm = act[3][0];
        if (dm === 1 && (c[1][1] || c[0][1])) return false;
        if (dm === 2 && (c[2][1] || c[1][1])) return false;
        const sitBad = { 1: 4, 2: 0 }[dm];
        if (sitBad !== undefined && [2, 4, 5].some((k) => act[k][0] === dm && act[k][1] === sitBad)) return true;
        const roots = ROOT[dm];
        if (roots) for (let k = 2; k < 6; k++) {
            if (!roots.includes(fn[k][1])) continue;
            const by = dm === 1 && k === 3 ? [2, 4, 5] : CLASHERS[k];
            if (!by.some((q) => fn[k][1] === clashOf(fn[q][1]))) return false;
        }
        const rp = ROOT_PILLAR[dm];
        if (rp && [2, 4, 5].some((k) => rp.some(([s, b]) => fn[k][0] === s && fn[k][1] === b))) return false;
        return true;
    }
    // ธาตุที่ต้านดิถี (อำนาจ + ถ่ายเท) มีน้อย หรือที่มีอยู่ถูกทำให้หมดแรง
    function fewOpponents(x) {
        const { fn, ek, c, raw, act } = x, km2 = E(ek - 2), kp1 = E(ek + 1);
        const t = c[km2][0] + c[km2][1] + c[kp1][0] + c[kp1][1];
        if (x.over || t <= 1) return true;
        if (t !== 2) return false;
        for (let k = 2; k < 6; k++) for (const s of [0, 1]) {
            if (raw[k][s] === km2 && neutralized(fn, act, k, s, ek)) return true;
            if (raw[k][s] === kp1 && neutralized(fn, act, k, s, km2)) return true;
            if ((raw[k][s] === km2 || raw[k][s] === kp1) && act[k][s] === -1) return true;
        }
        return false;
    }
    function patternOf(x, opt) {
        const { fn, ek, c, sc, raw, act } = x;
        const km1 = E(ek - 1), km2 = E(ek - 2), kp1 = E(ek + 1), kp2 = E(ek + 2);
        const tot = (e) => c[e][0] + c[e][1];
        const T = sc.total, mEl = raw[4][1], mb = fn[4][1], dm = act[3][0];
        if (mEl === km1 && tot(ek) >= 3 && tot(km1) >= 3 && tot(kp2) === 0 && tot(km2) === 0 && tot(kp1) <= 1) return { p: 16, why: 'เกิดเดือนธาตุส่งเสริม คู่ธาตุและธาตุส่งเสริมมีอย่างละ 3 ตัวขึ้นไป ไม่มีธาตุโชคลาภและธาตุอำนาจ' };
        if (mEl === kp1 && tot(ek) >= 3 && tot(kp1) >= 3 && T >= 4.5 && tot(kp2) === 0 && tot(km2) === 0 && tot(km1) === 0) return { p: 17, why: 'เกิดเดือนธาตุถ่ายเท คู่ธาตุและธาตุถ่ายเทมีอย่างละ 3 ตัวขึ้นไป ไม่มีธาตุอื่น' };
        if (tot(km1) >= 6) return { p: 12, why: 'ธาตุส่งเสริมมี 6 ตัวขึ้นไป' };
        const strong = T >= 8 || tot(ek) + tot(km1) >= 7 || (T >= 7 && tot(ek) + tot(km1) === 6 && tot(kp1) === 1 && tot(km2) === 1);
        if (fewOpponents(x)) {
            const why = 'ฝ่ายช่วยมีกำลังมาก ธาตุอำนาจและธาตุถ่ายเทมีน้อยหรือหมดแรง และเกิดในฤดูที่หนุนดิถี';
            if (dm === 4 && (strong || x.over)) return { p: 1, why };
            if (dm === 1 && ((([12, 1, 9, 10].includes(mb) || opt.waterEarly) && strong) || x.over)) return { p: 2, why };
            if (dm === 0 && (([9, 10, 2, 5, 8, 11].includes(mb) && strong) || x.over)) return { p: 3, why };
            if (dm === 2 && (([3, 4, 12, 8, 1].includes(mb) && strong) || x.over)) return { p: 4, why };
            if (dm === 3) {
                let s6 = strong;
                if (c[3][1] === 4 && c[3][0] === 2) s6 = !(c[0][0] === 1 && c[1][0] === 1) && c[0][0] !== 2;
                if (([6, 7, 8, 3, 11, 4].includes(mb) && s6) || x.over) return { p: 5, why };
            }
        }
        if (canFollow(x)) {
            const hi = x.power.hi, wealth = [2, 3, 4, 5].some((k) => raw[k][0] === kp2 || raw[k][1] === kp2);
            const why = 'คะแนนต่ำ ไม่มีฝ่ายช่วยในราศีล่าง ไม่มีธาตุส่งเสริมบนราศีบน และไม่มีรากแฝงที่ใช้ได้ ดิถีจึงยอมตามธาตุที่มีกำลังสูงสุด';
            if (!wealth && hi === 1) return { p: 11, why };
            if (hi === 3) return { p: 13, why };
            if (hi === 2 || (wealth && hi === 1)) return { p: 14, why };
        }
        if (T < 5) for (const d of [0, 2]) {
            const a = E(ek + d), b = E(a - 2);
            if (tot(b) === 4 && tot(a) === 4) return { p: 18, why: `ธาตุ${EL_TH[a]}และธาตุ${EL_TH[b]}ที่ข่มกันมีอย่างละ 4 ตัว` };
        }
        return { p: 0 };
    }

    // ---------- 5) ธาตุดี (A) ร้าย (B) กลาง (C) ----------
    // รหัสพิเศษ: 9 คู่ธาตุขั้วเดียวกับดิถี 10 คู่ธาตุขั้วตรงข้าม 14 (ธาตุก่อนหน้า) เฉพาะราศีล่าง 15 เฉพาะราศีบน
    //   16–27 เฉพาะกิ่งนั้น 28–37 เฉพาะก้านนั้น 38 บางตัว · 5 ดินแห้ง (มะแม จอ) 6 ดินเปียก (ฉลู มะโรง)
    //   7 ไม้ถ้ามากับไฟ 8 ทองถ้ามากับน้ำ 11 น้ำถ้ามากับไม้ 12 ไฟถ้ามากับไม้ 13 ดินถ้ามากับทอง
    function specialLists(pattern, x) {
        const ek = x.ek, km1 = E(ek - 1), km2 = E(ek - 2), kp1 = E(ek + 1), kp2 = E(ek + 2);
        const tot = (e) => x.c[e][0] + x.c[e][1], mb = x.fn[4][1];
        switch (pattern) {
            case 1: {
                const wood = tot(2) > 0;
                if (tot(0) > 0) return wood ? { A: [3, 0, 4], B: [2, 11], C: [1] } : { A: [0, 4], B: [2, 3, 11], C: [1] };
                if (mb === 5) return { A: [3, 4, 0], B: [2, 11], C: [1] };
                if (mb === 8 || mb === 11) {
                    if (tot(3) >= 2 && tot(1) === 0) return wood ? { A: [3, 4, 0, 1], B: [2, 11], C: [] } : { A: [4, 0, 1], B: [3, 2, 11], C: [] };
                    return wood ? { A: [3, 4, 0], B: [2, 11], C: [1] } : { A: [4, 0, 3], B: [2, 11], C: [1] };
                }
                if (mb === 2 || mb === 6 || mb === 7) return { A: [3, 4, 0], B: [2, 1], C: [] };
                if (mb !== 1 && mb !== 12) return wood ? { A: [3, 4, 0], B: [2, 1], C: [] } : { A: [4, 3, 0], B: [2, 1], C: [] };
                return wood ? { A: [3, 0, 4, 1], B: [2, 11], C: [] } : { A: [0, 4, 1], B: [2, 11], C: [3] };
            }
            case 2: return { A: [1, 0, 2], B: [5], C: [6, 3] };
            case 3: return { A: [0, 1, 4], B: [3, 7], C: [2] };
            case 4: return { A: [2, 1, 3], B: [0], C: [13] };
            case 5: return { A: [2, 3, 4], B: [1, 8], C: [0] };
            case 11: return { A: [kp1, ek, kp2], B: [km1, km2], C: [] };
            case 12: return { A: [ek, kp1, kp2], B: [km1, km2], C: [] };
            case 13: return tot(kp1) > 0 ? { A: [km2, kp2, kp1], B: [ek, km1], C: [] } : { A: [km2, kp2], B: [kp1, ek, km1], C: [] };
            case 14: return { A: [kp2, kp1, km2], B: [ek, km1], C: [] };
            case 16: return tot(kp1) === 0 ? { A: [ek, km1], B: [kp2, km2, kp1], C: [] } : { A: [ek, km1, kp1], B: [kp2, km2], C: [] };
            case 17: return { A: [ek, kp1], B: [km2, km1, kp2], C: [] };
            case 18: for (const d of [0, 2]) {
                const a = E(ek + d), b = E(a - 2);
                if (tot(b) === 4 && tot(a) === 4) return { A: [E(b + 1), E(b + 2)], B: [b, E(b - 1)], C: [E(b - 2)] };
            }
        }
        return { A: [], B: [], C: [] };
    }
    function weakMetal(x) {
        const km1 = E(x.ek - 1);
        if (!(x.raw[3][0] === 0 && x.c[km1][1] >= 1 && x.c[km1][0] === 0)) return false;
        for (let k = 2; k < 6; k++) if (x.raw[k][0] === 1 || x.raw[k][1] === 1 || x.fn[k][1] === 2 || x.fn[k][1] === 5) return false;
        return true;
    }
    function normalLists(x) {
        const ek = x.ek, km1 = E(ek - 1), km2 = E(ek - 2), kp1 = E(ek + 1), kp2 = E(ek + 2);
        const c = x.c, A = x.A, hi = x.hi, tot = (e) => c[e][0] + c[e][1];
        const p = { type: 0, A: [], B: [], C: [], addTemp: 0, notes: [] };
        if (x.T < 4.5) {
            const stemRes = c[km1][0] >= 1, branchRes = c[km1][1] >= 1;
            if (x.T > 3) {
                p.type = 2;
                if (branchRes && !stemRes) {
                    if (weakMetal(x)) { p.A = [km1, 9]; p.B = [kp2, kp1, km2, 10]; }
                    else { p.A = [km1, 9, km2, 14]; p.B = [kp2, kp1, km2, 15, 10]; }
                } else if (stemRes) { p.A = [km1, 9, km2]; p.B = [kp2, kp1, 10]; }
                else { p.A = [km1, 9]; p.B = [kp2, kp1, km2, 10]; }
            } else {
                p.type = 3;
                let dt = 0;
                if (A[kp1] > A[km2] && A[kp1] > A[kp2] && tot(kp1) >= 3) dt = 8;
                else if (A[kp2] >= A[kp1] - 1 && A[kp2] > A[km2]) dt = 9;
                else if (A[km2] >= A[kp2] - 1 && A[km2] > A[kp1]) dt = 10;
                if (branchRes && !stemRes) {
                    if (weakMetal(x)) { p.A = [km1, ek]; p.B = [kp2, kp1, km2]; }
                    else if (dt !== 10) {
                        p.A = [km1, ek, km2, 14]; p.B = [kp2, kp1, km2, 15];
                        if (km2 === 4) { p.A = [km1, ek, 17, 20]; p.B = [kp2, kp1, km2]; }
                    } else { p.A = [km1, ek, km2, 14]; p.B = [kp1, kp2, km2, 15]; }
                } else if (!stemRes) {
                    if (dt === 8) { p.A = [km1, ek]; p.B = [kp1, kp2, km2]; }
                    else if (dt === 9) { p.A = [ek, km1]; p.B = [kp2, kp1, km2]; }
                    else { p.A = [km1, ek]; p.B = [km2, kp2, kp1]; }
                } else if (hi === km2) { p.A = [km1, ek]; p.B = [kp2, kp1]; p.C = [km2]; }
                else { p.A = [km1, ek, km2]; p.B = [kp2, kp1]; }
            }
        } else {
            p.type = x.T >= 5 ? 1 : 6;
            const t1 = p.type === 1;
            if (c[km1][0] > 0) {
                if (hi === km2) { p.A = [kp2, kp1, km2]; p.B = [ek, km1]; }
                else { p.A = [kp2, kp1]; p.B = [ek, km1, km2]; }
            } else if (hi === km2) {
                if (c[km2][0] === 0 && c[km2][1] > 0) { p.A = [km2, kp2, kp1]; p.B = [ek, km1]; }
                else if (tot(kp2) > 0) { p.A = t1 ? [km2, kp2, km1] : [kp2, km2, km1]; p.B = [ek]; p.C = [kp1]; }
                else { p.A = t1 ? [km2, kp2] : [kp2, km2]; p.B = [kp1, ek]; }
            } else if (hi === kp2) { p.A = [kp2, kp1, km2]; p.B = [ek, km1]; }
            else if (hi === kp1) { p.A = t1 ? [kp1, km2, kp2] : [kp2, kp1, km2]; p.B = [km1, ek]; }
            else if (c[km2][0] >= 1) {
                if (t1) {
                    if (hi === km1 && c[km2][0] === 1 && (c[km2][1] === 1 || c[kp2][1] === 1) && A[kp2] + A[km1] < A[km2]) p.A = [km2, kp2, kp1, 38];
                    else p.A = A[kp2] > A[kp1] ? [kp2, km2, kp1, 38] : [kp1, km2, kp2, 38];
                } else p.A = [kp2, km2, kp1, 38];
                p.B = [ek, km1];
            } else if ((tot(kp1) <= 0 || tot(km2) !== 0) && A[kp1] <= A[km2]) {
                if (tot(km2) > 0 || A[ek] > A[km1]) { p.A = t1 ? [km2, kp2, kp1, 38] : [kp2, km2, kp1, 38]; p.B = [ek, km1]; }
                else { p.A = [kp2, kp1, km2]; p.B = [ek, km1]; }
            } else { p.A = t1 ? [kp1, kp2, km2] : [kp2, kp1, km2]; p.B = [km1, ek]; }
            // ธาตุส่งเสริมมีไม่เกิน 2 ตัว ยังใช้เป็นธาตุดีได้
            if (tot(km1) <= 2) {
                let i = p.B.lastIndexOf(km1);
                if (i >= 0) { p.A.push(km1); p.B.splice(i, 1); }
                else { i = p.C.lastIndexOf(km1); if (i >= 0) { p.A.push(km1); p.C.splice(i, 1); } }
            }
        }
        // ปรับอุณหภูมิ (調候) สำหรับดิถีดิน ทอง ไม้: เกิดฤดูหนาวต้องใช้ไฟ เกิดฤดูร้อนต้องใช้น้ำ
        if (ek === 4 || ek === 0 || ek === 2) {
            const act = x.act, fn = x.fn;
            let needFire = act[4][1] === 1 && act[3][0] !== 3;
            if (fn[4][1] === 2) { let n = tot(3); for (let k = 2; k < 6; k++) if (fn[k][1] === 8 || fn[k][1] === 11) n++; if (n < 2) needFire = true; }
            let needWater = act[4][1] === 3 && act[3][0] !== 1;
            if (fn[4][1] === 8) { let n = tot(1); for (let k = 2; k < 6; k++) if (fn[k][1] === 2 || fn[k][1] === 5) n++; if (n < 2) needWater = true; }
            const adjust = (el, pairBranches) => {
                const has = p.A.includes(el) || ctrl(p.A[0]) === el;
                let cnt = 0, nb = 0;
                for (let k = 2; k < 6; k++) { if (act[k][0] === el) cnt++; if (act[k][1] === el) cnt++; if (pairBranches.includes(fn[k][1])) nb++; }
                const lvl = cnt >= 2 || (cnt === 1 && nb >= 2) ? 2 : (has ? 1 : 0);
                if (lvl === 0) { p.A.push(el); p.addTemp = 1; p.notes.push(`เกิดฤดู${el === 3 ? 'หนาว' : 'ร้อน'} ดวงขาด${EL_TH[el]} จึงเพิ่ม${EL_TH[el]}เป็นธาตุดีเพื่อปรับอุณหภูมิ`); }
                if (lvl === 0 || (lvl === 2 && tot(el) <= 2)) {
                    const i = p.B.indexOf(el);
                    if (i >= 0) { p.B.splice(i, 1); if (p.addTemp === 0) p.addTemp = el === 3 ? 2 : 3; if (lvl === 2) p.notes.push(`เกิดฤดู${el === 3 ? 'หนาว' : 'ร้อน'} ${EL_TH[el]}ที่มีอยู่ช่วยปรับอุณหภูมิ จึงไม่นับเป็นธาตุร้าย`); }
                }
            };
            if (needFire) adjust(3, [8, 11]);
            if (needWater) adjust(1, [2]);
        }
        // ดวงอ่อนมีโรค (病藥): ธาตุอำนาจกดหนักโดยไม่มีธาตุส่งเสริม ใช้ธาตุถ่ายเทเป็นยา (ใช้คะแนนก่อนโบนัส)
        if (x.S < 4.5) {
            const ws = x.act[3][0] === 1 && x.act[3][1] === 4 && (x.fn[3][1] === 2 || x.fn[3][1] === 5) ? 1 : 0;
            const pw = tot(km2) - ws;
            if ((pw >= 3 && tot(km1) === 0 && tot(kp1) >= 1) || (pw === 2 && tot(kp2) >= 2 && tot(kp1) >= 1 && tot(km1) === 0 && A[km2] > A[kp1])) {
                p.type = 4; p.addTemp = 0; p.notes = []; p.C = [];
                if (c[kp1][0] === 0 && c[kp1][1] >= 1) { p.A = [kp1, ek, km1, 15]; p.B = [km2, kp2, km1, 14]; }
                else if (c[kp1][0] >= 1 && c[kp1][1] === 0) { p.A = [kp1, ek, km1, 14]; p.B = [km2, kp2, km1, 15]; }
                else if (tot(kp1) === 0 && c[ek][1] >= 1) { p.A = [kp1, ek, km1]; p.B = [km2, kp2]; }
                else { p.A = [kp1, ek]; p.B = [km1, km2, kp2]; }
            }
        }
        return p;
    }
    // จัดรายการขั้นสุดท้าย: ตัดธาตุซ้ำระหว่างดี/ร้าย เติมธาตุกลาง จำกัดธาตุดีหลัก 3 ตัว
    function finalize(x, pattern, p) {
        const ek = x.ek, kp1 = E(ek + 1), kp2 = E(ek + 2);
        let A = p.A.slice(), Bl = p.B.slice(), C = p.C.slice();
        const addTemp = p.addTemp || 0;
        for (let i = A.length - 1; i > 0; i--) if (A[i] < 5 && A[i - 1] >= 5 && A[i - 1] !== 9 && A[i - 1] !== 10 && (addTemp <= 0 || i !== A.length - 1)) [A[i - 1], A[i]] = [A[i], A[i - 1]];
        for (let i = Bl.length - 1; i > 0; i--) if (Bl[i] < 5 && Bl[i - 1] >= 5 && A[i - 1] !== 9 && A[i - 1] !== 10) [Bl[i - 1], Bl[i]] = [Bl[i], Bl[i - 1]];
        let cut = -1, has9 = false;
        for (const a of A) {
            for (let j = 0; j < Bl.length; j++) if (a === Bl[j]) {
                if (j < Bl.length - 1 && (Bl[j + 1] === 14 || Bl[j + 1] === 15)) { cut = -1; continue; }
                cut = j;
            }
            if (a === 9) has9 = true;
        }
        if (cut >= 0) Bl.splice(cut, 1);
        const CMAP = { 8: 0, 11: 1, 7: 2, 12: 3, 13: 4 };
        for (let e = 0; e < 5; e++) if (!(A.includes(e) || Bl.includes(e) || C.some((v) => v === e || CMAP[v] === e) || (has9 && e === ek))) C.push(e);
        const isPos = (v) => v >= 16 && v <= 37, posEl = (v) => v <= 27 ? EL[v - 16] : ET[v - 28];
        const pull = (L) => {
            for (let g = 0; g < 10 && L.length > 0 && isPos(L[L.length - 1]); g++) {
                const last = L.length - 1, base = posEl(L[last]);
                let moved = false, stop = false;
                for (let i = 0; i < L.length - 2; i++) {
                    if (L[i] !== base) continue;
                    let off = 0;
                    if (L[i + 1] === 14 || L[i + 1] === 15) { if (i + 2 === last) { stop = true; break; } off = 1; }
                    const v = L[last]; L.splice(last, 1); L.splice(i + 1 + off, 0, v); moved = true; break;
                }
                if (!moved || stop) break;
            }
        };
        pull(A); pull(Bl);
        const lead = (L, ok) => {
            for (let i = 1; i < L.length; i++) {
                if (!isPos(L[i])) continue;
                const base = posEl(L[i]);
                if (ok && L[i - 1] !== base && !((L[i - 1] === 14 || L[i - 1] === 15) && L[i - 2] === base)) L.splice(i, 0, base);
                break;
            }
        };
        lead(A, pattern !== 3); lead(Bl, true); lead(C, true);
        if (C.length === 1 && isPos(C[0])) C.unshift(posEl(C[0]));
        if (A.length === 4 && !A.some((v) => v > 5)) { if (!C.includes(A[3])) C.push(A[3]); A = A.slice(0, 3); }
        if (A.length === 5 && A[4] === 38 && !A.slice(0, 4).some((v) => v > 5)) { if (!C.includes(A[3])) C.push(A[3]); A = A.slice(0, 3); }
        // ดิถีแข็งแรง ธาตุดีตัวแรกเป็นธาตุถ่ายเท: ยกธาตุโชคลาภขึ้นเป็นลำดับที่ 2
        if (p.type === 1 && pattern === 0 && A[0] === kp1) {
            let atI = 0; for (let i = 1; i < A.length; i++) if (A[i] === kp2) atI = i;
            if (atI > 1) { const src = A.slice(); for (let i = 1; i < A.length - 1 && A[i] !== kp2; i++) A[i + 1] = src[i]; A[1] = kp2; }
        }
        const dedupe = (L) => L.filter((v, i) => L.indexOf(v) === i);
        return { A: dedupe(A), B: dedupe(Bl), C: dedupe(C) };
    }

    // ---------- 6) แปลงรายการรหัสเป็นรายการธาตุสำหรับแสดงผล ----------
    // item: { element (BaziCore), th, relation, polarity?, position?, branches? (เฉพาะกิ่ง), stems? (เฉพาะก้าน), when? (ถ้ามากับธาตุ), some? }
    const COND = { 7: [2, 3], 8: [0, 1], 11: [1, 2], 12: [3, 2], 13: [4, 0] };
    function items(list, ek) {
        const out = [];
        const mk = (e, extra) => Object.assign({ element: TO_CORE[e], th: EL_TH[e], relation: REL_TH[REL[E(e - ek)]] }, extra || {});
        for (const t of list) {
            const prev = out[out.length - 1];
            if (t <= 4) out.push(mk(t));
            else if (t === 9) out.push(mk(ek, { polarity: 'same' }));
            else if (t === 10) out.push(mk(ek, { polarity: 'opposite' }));
            else if ((t === 14 || t === 15) && prev) prev.position = t === 14 ? 'branch' : 'stem';
            else if (t >= 16 && t <= 27 && prev) (prev.branches = prev.branches || []).push(t - 16);
            else if (t >= 28 && t <= 37 && prev) (prev.stems = prev.stems || []).push(t - 28);
            else if (t === 38 && prev) prev.some = true;
            else if (t === 5) out.push(mk(4, { branches: [7, 10] }));
            else if (t === 6) out.push(mk(4, { branches: [1, 4] }));
            else if (COND[t]) out.push(mk(COND[t][0], { when: TO_CORE[COND[t][1]], whenTh: EL_TH[COND[t][1]] }));
        }
        return out;
    }
    // ข้อความกำกับธาตุที่มีเงื่อนไข
    function itemNote(x) {
        const n = [];
        if (x.position) n.push(x.position === 'stem' ? 'เฉพาะราศีบน' : 'เฉพาะราศีล่าง');
        if (x.branches) n.push('เฉพาะ' + x.branches.map((b) => B.ANIMALS_TH[b]).join(' '));
        if (x.stems) n.push('เฉพาะ' + x.stems.map((s) => B.STEMS[s] + ' ' + B.STEMS_TH[s]).join(' '));
        if (x.when != null) n.push('ถ้ามากับ' + x.whenTh);
        if (x.some) n.push('บางตัว');
        return n.join(' · ');
    }
    // ธาตุรายการนี้ใช้กับก้าน/กิ่งที่กำหนดหรือไม่
    // ctx: { stem?, branch?, pos: 'stem'|'branch', dmStem, with?: [ธาตุ BaziCore ที่มาด้วยกัน] }
    function applies(x, ctx) {
        if (x.polarity && ctx.stem != null && (x.polarity === 'same') !== ((ctx.stem % 2) === (ctx.dmStem % 2))) return false;
        if (x.position && ctx.pos && x.position !== ctx.pos) return false;
        if (x.branches && ctx.pos === 'branch' && ctx.branch != null && !x.branches.includes(ctx.branch)) return false;
        if (x.branches && ctx.pos === 'stem') return false;
        if (x.stems && ctx.pos === 'stem' && ctx.stem != null && !x.stems.includes(ctx.stem)) return false;
        if (x.stems && ctx.pos === 'branch') return false;
        if (x.when != null && ctx.with && !ctx.with.includes(x.when)) return false;
        return true;
    }

    // ---------- วิเคราะห์ ----------
    // opt.waterEarly: ดิถีน้ำ เกิดช่วง 12 วันแรกของเดือนมะโรง (เม.ย.) หรือเดือนฉลู (ม.ค.)
    function analyzeFn(fn, opt = {}) {
        const raw = rawEle(fn), ek = raw[3][0];
        const tr = opt.act ? { act: opt.act, changed: [] } : transform(fn);
        const act = tr.act;
        const sc = supportScoreFn(fn);
        const { c, A } = countsFn(fn, raw, act);
        const x = { fn, ek, raw, act, c, A, sc, T: sc.total, S: sc.upper + sc.lower, over: sc.total >= 8, power: hiddenPower(fn, ek) };
        x.hi = keyElement(ek, c, A);
        const pt = patternOf(x, opt);
        const lists = pt.p ? Object.assign({ type: 0, addTemp: 0, notes: [] }, specialLists(pt.p, x)) : normalLists(x);
        const fin = finalize(x, pt.p, lists);
        return { pattern: pt.p, patternWhy: pt.why, type: lists.type, A: fin.A, B: fin.B, C: fin.C, notes: lists.notes, changed: tr.changed, x };
    }
    function waterEarlyOf(chart) {
        const t = chart.monthTerm && chart.monthTerm.start, d = chart.calcTime, mb = chart.pillars.month.branch;
        if (!t || !d || B.STEM_ELEMENT[chart.pillars.day.stem] !== 4) return false;
        if (!((mb === 4 && d.month === 4) || (mb === 1 && d.month === 1))) return false;
        return t.month === d.month && d.day - t.day <= 12;
    }
    function analyze(chart) {
        const fn = toFn(chart);
        const r = analyzeFn(fn, { waterEarly: waterEarlyOf(chart) });
        const { x } = r, sc = x.sc;
        const reasons = [`คะแนนฝ่ายช่วย ราศีบน ${sc.upper} + ราศีล่าง ${sc.lower}${sc.bonus ? ` + กิ่งครบชุดของธาตุดิถี ${sc.bonus}` : ''} = ${sc.total}`];
        for (const ch of r.changed) {
            const where = `${ch.side ? 'กิ่ง' : 'ก้าน'}${POS_TH[ch.k]}`;
            reasons.push(ch.to < 0 ? `${where} (${EL_TH[ch.from]}) ไม่นับ เพราะ${ch.why === 'ธาตุส่งเสริมถูกขวาง' ? 'เป็นธาตุส่งเสริมตัวเดียวที่ถูกธาตุโชคลาภขวาง' : 'เป็นธาตุโดดที่ถูกข่มและไม่มีธาตุหนุน'}`
                : `${where} แปรจาก${EL_TH[ch.from]}เป็น${EL_TH[ch.to]} (${ch.why})`);
        }
        if (r.patternWhy) reasons.push(r.patternWhy);
        if (r.type === 4) reasons.push('ธาตุอำนาจกดดิถีหนักโดยไม่มีธาตุส่งเสริมช่วย เปรียบเหมือนดวงมีโรค ต้องใช้ธาตุถ่ายเทเป็นยา (病藥)');
        r.notes.forEach((n) => reasons.push(n));
        const pattern = r.pattern, strength = pattern ? null : r.type;
        const hi = x.hi;
        return {
            pattern, patternTh: pattern ? PATTERN_TH[pattern] : 'ดวงปกติ', patternZh: pattern ? PATTERN_ZH[pattern] : '正格',
            strength, strengthTh: strength ? STRENGTH_TH[strength] : null,
            score: sc, seasonal: x.A.map((v, e) => ({ element: TO_CORE[e], th: B.ELEMENTS[TO_CORE[e]], value: v })),
            keyElement: hi >= 0 ? { element: TO_CORE[hi], th: B.ELEMENTS[TO_CORE[hi]] } : null,
            favorable: items(r.A, x.ek), unfavorable: items(r.B, x.ek), neutral: items(r.C, x.ek),
            transformed: r.changed.map((ch) => ({ pillar: ['', '', 'hour', 'day', 'month', 'year'][ch.k], part: ch.side ? 'branch' : 'stem', from: TO_CORE[ch.from], to: ch.to < 0 ? null : TO_CORE[ch.to], why: ch.why })),
            reasons, matched: true
        };
    }

    function supportScore(chart) { return supportScoreFn(toFn(chart)); }
    return { analyze, analyzeFn, supportScore, applies, itemNote, transform, waterEarlyOf, toFn, PATTERN_TH, STRENGTH_TH };
});
