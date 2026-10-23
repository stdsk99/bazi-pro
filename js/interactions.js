// interactions.js — ความสัมพันธ์ระหว่างราศีบนและราศีล่าง: ภาคี ชง เฮ้ง ไห่ ผั่ว (ศัพท์ตามระบบอ้างอิง)
// รหัสก้าน 0..9 = 甲..癸, กิ่ง 0..11 = 子..亥, ธาตุ 0 ไม้ 1 ไฟ 2 ดิน 3 ทอง 4 น้ำ (เหมือน BaziCore)
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'));
    else root.BaziInteractions = factory(root.BaziCore);
})(typeof self !== 'undefined' ? self : this, function (B) {
    'use strict';

    const EL = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];
    // ชนิดความสัมพันธ์: kind ใช้จัดสี (+ ส่งเสริม/รวม, − ขัดแย้ง)
    const TYPES = {
        stemCombo: { zh: '天干合', th: 'บนภาคี', kind: '+' },
        stemClash: { zh: '天干冲', th: 'บนปะทะ', kind: '−' },
        trio: { zh: '三合', th: 'ไตรภาคี', kind: '+' },
        season: { zh: '三會', th: 'ภาคีไตรทิศ', kind: '+' },
        halfTrio: { zh: '半合', th: 'ล่างครึ่งภาคี', kind: '+' },
        pair: { zh: '六合', th: 'ล่างภาคีคู่', kind: '+' },
        clash: { zh: '六冲', th: 'ล่างชง', kind: '−' },
        punish3: { zh: '三刑', th: 'ซำเฮ้ง', kind: '−' },
        punish: { zh: '刑', th: 'เฮ้ง', kind: '−' },
        selfPunish: { zh: '自刑', th: 'เฮ้งตัวเอง', kind: '−' },
        harm: { zh: '六害', th: 'ไห่', kind: '−' },
        break: { zh: '破', th: 'ผั่ว', kind: '−' }
    };

    const STEM_COMBO = [[0, 5, 2], [1, 6, 3], [2, 7, 4], [3, 8, 0], [4, 9, 1]]; // 甲己土 乙庚金 丙辛水 丁壬木 戊癸火
    const STEM_CLASH = [[0, 6], [1, 7], [2, 8], [3, 9]];                           // 甲庚 乙辛 丙壬 丁癸
    const TRIO = [[[8, 0, 4], 4], [[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3]]; // 申子辰水 亥卯未木 寅午戌火 巳酉丑金 (ตัวกลางคือ index 1)
    const SEASON = [[[2, 3, 4], 0], [[5, 6, 7], 1], [[8, 9, 10], 3], [[11, 0, 1], 4]];
    const PAIR = [[0, 1, 2], [2, 11, 0], [3, 10, 1], [4, 9, 3], [5, 8, 4], [6, 7, 1]]; // 子丑土 寅亥木 卯戌火 辰酉金 巳申水 午未火
    const HARM = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
    const PUNISH3 = [[2, 5, 8], [1, 10, 7]];                                        // 寅巳申 丑戌未
    const SELF = [4, 6, 9, 11];                                                     // 辰午酉亥
    const BREAK = [[0, 9], [3, 6], [4, 1], [7, 10], [2, 11], [5, 8]];               // 子酉 卯午 辰丑 未戌 寅亥 巳申

    const same2 = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);

    // items: [{ key, label, stem, branch }] · focus: key ที่ต้องมีส่วนร่วม (เช่น วัยจร/ปีจร) หรือ null = ทุกคู่
    function find(items, focus) {
        const out = [];
        const add = (type, members, element, note) => {
            if (focus && !members.some((m) => m.key === focus)) return;
            out.push(Object.assign({ type, members: members.map((m) => ({ key: m.key, label: m.label })), element: element == null ? null : element, elementTh: element == null ? null : EL[element], note: note || null }, TYPES[type]));
        };
        const n = items.length;
        // ก้าน
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = items[i], b = items[j];
            for (const [x, y, e] of STEM_COMBO) if (same2(a.stem, b.stem, x, y)) add('stemCombo', [a, b], e, `${B.STEMS[a.stem]}${B.STEMS[b.stem]} รวมเป็นธาตุ${EL[e]}`);
            for (const [x, y] of STEM_CLASH) if (same2(a.stem, b.stem, x, y)) add('stemClash', [a, b], null, `${B.STEMS[a.stem]}${B.STEMS[b.stem]}`);
        }
        // กิ่ง: กลุ่มสามตัว (ภาคีครบแล้วไม่นับครึ่งภาคีซ้ำในกลุ่มเดียวกัน)
        const fullTrio = new Set();
        const pick = (bset) => bset.map((b) => items.filter((m) => m.branch === b));
        for (const [set, e] of TRIO) {
            const g = pick(set);
            if (g.every((x) => x.length)) { add('trio', g.map((x) => x[0]), e, `${set.map((b) => B.BRANCHES[b]).join('')} รวมเป็นธาตุ${EL[e]}`); fullTrio.add(set.join()); }
        }
        for (const [set, e] of SEASON) {
            const g = pick(set);
            if (g.every((x) => x.length)) add('season', g.map((x) => x[0]), e, `${set.map((b) => B.BRANCHES[b]).join('')} รวมเป็นธาตุ${EL[e]}`);
        }
        for (const [set, e] of TRIO) {
            if (fullTrio.has(set.join())) continue;
            const mid = set[1];
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                const a = items[i], b = items[j];
                const other = a.branch === mid ? b.branch : b.branch === mid ? a.branch : -1;
                if (other !== set[0] && other !== set[2]) continue;
                add('halfTrio', [a, b], e, `${B.BRANCHES[mid]}${B.BRANCHES[other]} ครึ่งภาคีธาตุ${EL[e]}`);
            }
        }
        for (const set of PUNISH3) {
            const g = pick(set);
            const present = g.filter((x) => x.length);
            if (present.length >= 2) add(present.length === 3 ? 'punish3' : 'punish', present.map((x) => x[0]), null, `${set.filter((b, i) => g[i].length).map((b) => B.BRANCHES[b]).join('')}${present.length === 3 ? ' ครบชุด' : ''}`);
        }
        // กิ่ง: เป็นคู่
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
            const a = items[i], b = items[j], x = a.branch, y = b.branch, pr = `${B.BRANCHES[x]}${B.BRANCHES[y]}`;
            for (const [p, q, e] of PAIR) if (same2(x, y, p, q)) add('pair', [a, b], e, `${pr} รวมเป็นธาตุ${EL[e]}`);
            if ((x + 6) % 12 === y) add('clash', [a, b], null, pr);
            if (same2(x, y, 0, 3)) add('punish', [a, b], null, `${pr} `);
            if (x === y && SELF.includes(x)) add('selfPunish', [a, b], null, pr);
            for (const [p, q] of HARM) if (same2(x, y, p, q)) add('harm', [a, b], null, pr);
            for (const [p, q] of BREAK) if (same2(x, y, p, q)) add('break', [a, b], null, pr);
        }
        return out;
    }

    // ผังดวงเดิม 4 เสาหลัก
    const NATAL = [['year', 'ปี'], ['month', 'เดือน'], ['day', 'ดิถี'], ['hour', 'ยาม']];
    function natalItems(chart) {
        return NATAL.map(([k, l]) => ({ key: k, label: l, stem: chart.pillars[k].stem, branch: chart.pillars[k].branch }));
    }
    function natal(chart) { return find(natalItems(chart), null); }
    // เสาจร (วัยจรหรือปีจร) เทียบกับดวงเดิม และเสาจรอื่นที่ส่งมา
    function withTransit(chart, transits, focus) {
        return find(natalItems(chart).concat(transits), focus);
    }

    return { find, natal, withTransit, TYPES };
});
