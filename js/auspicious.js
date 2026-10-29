// auspicious.js — หาฤกษ์ตามดวงส่วนตัว (ไม่ใช่ฤกษ์ตามปฏิทินจีน 通书)
// ให้คะแนนแต่ละวันในช่วงที่เลือก จากธาตุของเสาวัน สิบเทพที่ตรงกับเรื่องที่จะทำ ความสัมพันธ์กับดวงเดิม และเดือนจร
// แล้วเลือกยามดีของวันนั้นจากเกณฑ์เดียวกัน
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'), require('./interactions.js'), require('./yearly.js'), require('./almanac.js'));
    else root.BaziAuspicious = factory(root.BaziCore, root.BaziInteractions, root.BaziYearly, root.BaziAlmanac);
})(typeof self !== 'undefined' ? self : this, function (B, I, Y, AL) {
    'use strict';
    const TG_TH = { '比肩': 'คู่ธาตุ', '劫财': 'คู่แข่ง', '食神': 'ถ่ายเท', '伤官': 'กลยุทธ์', '偏财': 'โชคลอย', '正财': 'โชคลาภ', '七杀': 'พิฆาต', '正官': 'อำนาจ', '偏印': 'เสริมรอง', '正印': 'เสริมหลัก' };
    const G = Y.GROUP_OF;
    // groups: 0 คู่ธาตุ/คู่แข่ง · 1 ถ่ายเท/กลยุทธ์ · 2 โชคลาภ/โชคลอย · 3 อำนาจ/พิฆาต · 4 เสริมหลัก/เสริมรอง
    const PURPOSES = [
        { id: 'contract', name: 'เซ็นสัญญา ซื้อบ้าน ทำเอกสาร', groups: [4, 3], pref: ['正印', '正官'] },
        { id: 'business', name: 'เปิดร้าน เริ่มธุรกิจ เปิดตัวสินค้า', groups: [1, 2], pref: ['食神', '正财'] },
        { id: 'deal', name: 'เจรจาธุรกิจ ลงทุน', groups: [2], pref: ['正财'] },
        { id: 'job', name: 'สมัครงาน สอบ ติดต่อราชการ', groups: [3, 4], pref: ['正官', '正印'] },
        { id: 'move', name: 'ย้ายบ้าน ขึ้นบ้านใหม่ เดินทางไกล', groups: [], pref: [], calm: true },
        { id: 'wedding', name: 'แต่งงาน หมั้น', groups: [], pref: [], wedding: true }
    ];
    const MAX_DAYS = 92;
    const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    // ความสัมพันธ์ระหว่างราศีล่างสองตัว (ใช้ตัวที่แรงที่สุด)
    const rel2 = (x, y) => { const r = I.find([{ key: 'a', label: 'a', stem: 0, branch: x }, { key: 'b', label: 'b', stem: 1, branch: y }], null).filter((t) => !t.type.startsWith('stem')); const o = ['clash', 'punish', 'selfPunish', 'harm', 'break', 'pair', 'halfTrio']; return o.map((t) => r.find((z) => z.type === t)).find(Boolean) || null; };
    const th2 = (r) => r.th.replace(/^ล่าง/, '');

    // เดือนจรที่ครอบวันนั้น (เทียบเวลาเที่ยงวัน)
    function monthOf(chart, y, m, d) {
        const t = new Date(y, m - 1, d, 12).getTime(), at = (o) => new Date(o.year, o.month - 1, o.day, o.hour, o.minute).getTime();
        for (const yy of [y, y + 1]) { const f = chart.monthly(yy).find((x) => at(x.start) <= t && t < at(x.end)); if (f) return f.pillar; }
        return null;
    }

    // คะแนนของวันหนึ่งสำหรับคนหนึ่ง
    function scoreDay(chart, an, P, y, m, d) {
        const N = chart.pillars, dm = N.day.stem, q = chart.daily(y, m, d).pillar, J = Y.judgeFn(chart, an)(q);
        const male = (chart.input && chart.input.gender) !== 'F', star = male ? 2 : 3;
        const cS = B.tenGod(dm, q.stem).code, cB = B.tenGod(dm, q.hidden[0].stem).code;
        const parts = [[cS, J.a, `ราศีบน ${B.STEMS[q.stem]} ${TG_TH[cS]}`], [cB, J.b, `ราศีล่าง ${B.BRANCHES[q.branch]} ${TG_TH[cB]}`]];
        let s = 2 * J.sum; const plus = [], minus = [];
        for (const [c, j, lab] of parts) {
            if (j > 0) plus.push(`${lab} ธาตุให้คุณ`); else if (j < 0) minus.push(`${lab} ธาตุให้โทษ`);
            if (P.groups.includes(G[c]) && j >= 0) { const b = P.pref.includes(c) ? 2 : 1.5; s += b; plus.push(`${lab} ตรงกับเรื่องนี้`); }
            if (P.wedding && G[c] === star) { if (j >= 0) { s += 2; plus.push(`${lab} เป็นดาวคู่ครองที่ให้คุณ`); } else { s -= 1; minus.push(`${lab} เป็นดาวคู่ครองแต่ธาตุให้โทษ`); } }
        }
        const rD = rel2(q.branch, N.day.branch), rY = rel2(q.branch, N.year.branch);
        const clashDay = !!(rD && rD.type === 'clash'), clashYear = !!(rY && rY.type === 'clash');
        if (clashDay) { s -= 6; minus.push('ชงวังคู่ครอง (ราศีล่างของดิถี)'); }
        else if (rD && rD.kind === '+') { const b = P.wedding ? 3 : 1; s += b; plus.push(`ราศีล่าง${th2(rD)}กับวังคู่ครอง`); }
        else if (rD) { s -= P.wedding || P.calm ? 2 : 1; minus.push(`ราศีล่าง${th2(rD)}กับวังคู่ครอง`); }
        if (clashYear) { s -= P.calm ? 4 : 2; minus.push('ชงปีเกิด'); }
        else if (rY && rY.kind === '+' && P.calm) { s += 1; plus.push(`ราศีล่าง${th2(rY)}กับปีเกิด`); }
        const mp = monthOf(chart, y, m, d);
        if (mp) { const mj = Y.judgeFn(chart, an)(mp).sum; s += mj * 0.5; if (mj > 0) plus.push(`อยู่ในเดือน${mp.animal} ${mp.zh} ที่ธาตุส่งเสริม`); else if (mj < 0) minus.push(`อยู่ในเดือน${mp.animal} ${mp.zh} ที่ธาตุไม่ส่งเสริม`); }
        return { s, plus, minus, clashDay, clashYear, pillar: q, sum: J.sum };
    }

    // ยามดีของวันนั้น: ธาตุให้คุณ + ตรงเรื่อง · ไม่ชงวังคู่ครองของทุกคน · เลือกเฉพาะช่วง 05.00–21.00 ที่ทำกิจได้จริง
    function bestHours(people, P, y, m, d) {
        const lists = people.map((p) => Y.hours(p.chart, p.an, y, m, d));
        const hs = lists[0].map((h, i) => {
            let v = 0, bad = false;
            lists.forEach((L, k) => { const x = L[i]; v += x.score; if (x.clashDay) bad = true;
                const dm = people[k].chart.pillars.day.stem, c = B.tenGod(dm, x.pillar.stem).code;
                if (P.groups.includes(G[c]) && x.a >= 0) v += 1; });
            return Object.assign({}, h, { v, bad });
        });
        return hs.filter((h) => !h.bad && h.v >= people.length && h.from >= 5 && h.to <= 21).sort((a, b) => b.v - a.v || a.from - b.from).slice(0, 3).sort((a, b) => a.from - b.from);
    }

    // people: [{ chart, an, name }] คนแรกคือเจ้าของดวง คนที่สอง (ถ้ามี) คือคู่ สำหรับฤกษ์แต่งงาน
    function find(people, purposeId, from, to, opts) {
        const P = PURPOSES.find((x) => x.id === purposeId) || PURPOSES[0], top = (opts && opts.top) || 5;
        const a = new Date(from.year, from.month - 1, from.day), b = new Date(to.year, to.month - 1, to.day);
        let n = Math.round((b - a) / 86400000) + 1; const capped = n > MAX_DAYS; if (capped) n = MAX_DAYS;
        if (n < 1) return { purpose: P, days: 0, ranked: [], excluded: 0, capped: false };
        const all = [];
        for (let k = 0; k < n; k++) {
            const t = new Date(a.getFullYear(), a.getMonth(), a.getDate() + k), y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
            const per = people.map((p) => Object.assign({ name: p.name }, scoreDay(p.chart, p.an, P, y, m, d)));
            // 12 เทพประจำวัน: ตัดวันต้องห้ามของเรื่องนั้น · เทพที่เหมาะ +1.5 · กลุ่มกลาง (ดำ) ที่ไม่เหมาะกับเรื่อง −1
            const off = AL ? AL.officer(people[0].chart, y, m, d) : null, rule = AL ? AL.PURPOSE[P.id] : null;
            let adj = 0, offNote = null, offBad = false;
            if (off && rule) {
                if (rule.block.includes(off.zh)) { offBad = true; offNote = `${off.name} ${off.zh} เป็นวันต้องห้ามของเรื่องนี้`; }
                else if (rule.plus.includes(off.zh)) { adj = 1.5; offNote = `${off.name} ${off.zh} เหมาะกับเรื่องนี้`; }
                else if (off.tone === 0) { adj = -1; offNote = `${off.name} ${off.zh} ไม่ส่งเสริมเรื่องนี้`; }
            }
            const blocked = offBad || per.some((x) => x.clashDay) || (P.calm || P.wedding ? per.some((x) => x.clashYear) : false);
            const s = per.reduce((t2, x) => t2 + x.s, 0) / per.length + adj;
            all.push({ date: { year: y, month: m, day: d }, label: `วัน${WD[t.getDay()]}ที่ ${d} ${TH_M[m - 1]} ${y}`, pillar: per[0].pillar, score: Math.round(s * 10) / 10, per, blocked, officer: off, offNote, offAdj: adj });
        }
        const ok = all.filter((x) => !x.blocked).sort((p, q) => q.score - p.score || (p.date.year - q.date.year) || (p.date.month - q.date.month) || (p.date.day - q.date.day));
        const ranked = ok.slice(0, top).filter((x) => x.score > 0).map((x) => Object.assign(x, { hours: bestHours(people, P, x.date.year, x.date.month, x.date.day), level: x.score >= 6 ? 'ดีมาก' : x.score >= 3 ? 'ดี' : 'พอใช้' }));
        return { purpose: P, days: n, capped, excluded: all.filter((x) => x.blocked).length, excludedOfficer: all.filter((x) => x.blocked && x.offNote && x.offNote.includes('ต้องห้าม')).length, ranked, rule: RULE(P) };
    }
    const RULE = (P) => `เกณฑ์: ธาตุของราศีบนและราศีล่างของวันที่ดวงต้องการ +2 ที่ไม่ต้องการ −2 · สิบเทพของวันตรงกับเรื่อง${P.wedding ? ' (ดาวคู่ครอง)' : ''} +1.5 ถึง +2 · ภาคีกับวังคู่ครอง +${P.wedding ? 3 : 1} · เดือนจรที่ธาตุส่งเสริมหรือไม่ส่งเสริม ±0.5 ต่อแต้ม · 12 เทพประจำวัน: เทพที่เหมาะกับเรื่อง +1.5 วันกลุ่มกลางที่ไม่เหมาะ −1 และตัดวัน${(AL ? AL.PURPOSE[P.id].block : ['破', '闭']).join(' ')} ออก · ตัดวันที่ชงวังคู่ครองออก${P.calm || P.wedding ? ' และตัดวันที่ชงปีเกิด' : ' (วันที่ชงปีเกิดหัก 2)'}${P.wedding ? ' · คิดจากดวงทั้งสองคนแล้วเฉลี่ย วันที่ชงดวงคนใดคนหนึ่งจะถูกตัดออก' : ''} · ยามดีคือยามที่ธาตุให้คุณ ตรงกับเรื่อง และไม่ชงวังคู่ครอง เลือกเฉพาะช่วง 05.00–21.00`;
    return { find, PURPOSES, MAX_DAYS };
});
