// yearly.js — สรุปปี: อ่านทีละด้าน (งาน เงิน ความรัก สุขภาพ) · 12 เดือน · เดือนที่ดีที่สุด · ไท้ส่วย
// ระบบอ้างอิงไม่มีส่วนสรุปรายด้านและไท้ส่วย หัวข้อนี้ใช้หลักตำรามาตรฐาน และใช้ศัพท์เดียวกับทั้งแอป
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'), require('./interactions.js'), require('./narrative.js'));
    else root.BaziYearly = factory(root.BaziCore, root.BaziInteractions, root.BaziNarrative);
})(typeof self !== 'undefined' ? self : this, function (B, I, N) {
    'use strict';
    const EL = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];
    const GROUP_OF = { '比肩': 0, '劫财': 0, '食神': 1, '伤官': 1, '偏财': 2, '正财': 2, '七杀': 3, '正官': 3, '偏印': 4, '正印': 4 };
    const TG_TH = { '比肩': 'คู่ธาตุ', '劫财': 'คู่แข่ง', '食神': 'ถ่ายเท', '伤官': 'กลยุทธ์', '偏财': 'โชคลอย', '正财': 'โชคลาภ', '七杀': 'พิฆาต', '正官': 'อำนาจ', '偏印': 'เสริมรอง', '正印': 'เสริมหลัก' };
    const MTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    // ให้คุณ/ให้โทษของธาตุในเสาจร — เกณฑ์เดียวกับป้ายบนการ์ดวัยจร ปีจร เดือนจร
    function judgeFn(chart, an) {
        const dm = chart.pillars.day.stem;
        const ok = (x, st, pos) => (!x.polarity || (x.polarity === 'same') === ((st % 2) === (dm % 2))) && (!x.position || x.position === pos);
        const j = (e, st, pos) => { const f = an.favorable.some((x) => x.element === e && ok(x, st, pos)), u = an.unfavorable.some((x) => x.element === e && ok(x, st, pos)); return f && !u ? 1 : u && !f ? -1 : 0; };
        return (q) => { const a = j(B.STEM_ELEMENT[q.stem], q.stem, 'stem'), b = j(B.BRANCH_ELEMENT[q.branch], q.hidden[0].stem, 'branch'); return { a, b, sum: a + b }; };
    }
    const rel2 = (x, y) => { const r = I.find([{ key: 'a', label: 'a', stem: 0, branch: x }, { key: 'b', label: 'b', stem: 1, branch: y }], null).filter((t) => !t.type.startsWith('stem')); const o = ['clash', 'punish', 'selfPunish', 'harm', 'break', 'pair', 'halfTrio']; return o.map((t) => r.find((z) => z.type === t)).find(Boolean) || null; };

    // ---------- 1. อ่านทีละด้าน ----------
    const TOPIC = {
        work: { name: 'การงาน', lv: [
            ['งานมีโอกาสก้าวหน้า ได้รับมอบหมายงานสำคัญหรือได้รับการยอมรับ ผลงานเป็นที่เห็น', 'เสนอโครงการ ขอเลื่อนตำแหน่ง หรือรับงานที่ท้าทาย'],
            ['งานเดินไปตามปกติ ไม่มีเรื่องใหญ่', 'ใช้ปีนี้พัฒนาทักษะและเก็บผลงาน เตรียมพร้อมสำหรับโอกาสในปีถัดไป'],
            ['งานมีแรงกดดัน ขัดแย้งกับหัวหน้าหรือเพื่อนร่วมงาน หรือมีความเปลี่ยนแปลงที่ไม่ได้เลือก', 'ทำงานให้รอบคอบ เก็บหลักฐานการทำงาน ไม่ลาออกหรือเปลี่ยนงานด้วยอารมณ์']] },
        money: { name: 'การเงิน', lv: [
            ['รายได้ดีขึ้น มีโอกาสทางการเงินหรือรายได้เสริม', 'เก็บออมหรือลงทุนอย่างมีแผน ขยายงานที่ทำกำไรอยู่แล้ว'],
            ['การเงินทรงตัว รายรับรายจ่ายใกล้เคียงเดิม', 'ทำงบประมาณ ลดรายจ่ายที่ไม่จำเป็น'],
            ['มีรายจ่ายไม่คาดคิด เสียเงินจากคนใกล้ตัว หรือการลงทุนเสี่ยง', 'ไม่ค้ำประกัน ไม่ให้ยืมเงินก้อน ไม่ลงทุนเกินตัว และกันเงินสำรองไว้']] },
        love: { name: 'ความรัก', lv: [
            ['เรื่องความรักเด่น คนโสดมีโอกาสพบคนที่ใช่ คนมีคู่ความสัมพันธ์แน่นแฟ้นขึ้น', 'เปิดใจพบคนใหม่ หรือวางแผนก้าวสำคัญกับคนรัก'],
            ['ความรักราบรื่นตามปกติ', 'หาเวลาคุณภาพกับคนรักหรือครอบครัวสม่ำเสมอ'],
            ['ความสัมพันธ์มีเรื่องให้คิด ความเห็นไม่ตรงกัน หรือต้องอยู่ห่างกัน', 'สื่อสารให้ชัด ไม่ตัดสินใจเรื่องใหญ่ในความสัมพันธ์ด้วยอารมณ์']] },
        health: { name: 'สุขภาพ', lv: [
            ['สุขภาพแข็งแรง มีพลังทำสิ่งต่างๆ', 'เริ่มออกกำลังกายหรือวางแผนดูแลสุขภาพระยะยาว'],
            ['สุขภาพโดยรวมปกติ', 'ตรวจสุขภาพประจำปีและพักผ่อนให้พอ'],
            ['ร่างกายและใจเหนื่อยง่าย ระวังความเครียด อุบัติเหตุ และโรคเดิมกำเริบ', 'พักผ่อนให้พอ ตรวจสุขภาพ และขับรถระมัดระวัง']] }
    };
    function topics(chart, an, q, kind) {
        const W = { luck: ['ช่วงนี้', 'ช่วงถัดไป'], month: ['เดือนนี้', 'เดือนถัดไป'], day: ['วันนี้', 'วันถัดไป'], dayx: ['วันนั้น', 'วันถัดไป'] }[kind] || ['ปีนี้', 'ปีถัดไป'];
        const w = (t) => t.replace(/ปีนี้/g, W[0]).replace(/ปีถัดไป/g, W[1]);
        const P = chart.pillars, dm = P.day.stem, male = (chart.input && chart.input.gender) !== 'F';
        const J = judgeFn(chart, an)(q);
        const cS = B.tenGod(dm, q.stem).code, cB = B.tenGod(dm, q.hidden[0].stem).code;
        const parts = [[GROUP_OF[cS], J.a, `ราศีบน ${B.STEMS[q.stem]} ${TG_TH[cS]}`, B.STEM_ELEMENT[q.stem]], [GROUP_OF[cB], J.b, `ราศีล่าง ${B.BRANCHES[q.branch]} ${TG_TH[cB]}`, B.BRANCH_ELEMENT[q.branch]]];
        const jt = (j) => j > 0 ? 'ให้คุณ' : j < 0 ? 'ให้โทษ' : 'กลางๆ';
        const rMonth = rel2(q.branch, P.month.branch), rDay = rel2(q.branch, P.day.branch);
        const out = [];
        // ภาพรวมของช่วงนั้น (ธาตุทั้งเสา) ใช้เทียบกับแต่ละด้าน ถ้าทิศทางสวนกันจะอธิบายเหตุผลไว้ให้
        const overall = J.sum > 0 ? 1 : J.sum < 0 ? -1 : 0;
        const th2 = (r) => r.th.replace(/^ล่าง/, '');
        const jt2 = (d) => d > 0 ? 'ให้คุณ' : 'ให้โทษ';
        const add = (id, score, why, drv) => {
            const lvl = score >= 1 ? 0 : score <= -1 ? 2 : 1, T = TOPIC[id], tone = [1, 0, -1][lvl];
            const o = { id, name: T.name, score, drv, level: ['เด่น', 'ปกติ', 'ต้องระวัง'][lvl], tone, text: w(T.lv[lvl][0]), todo: w(T.lv[lvl][1]), why: why.join(' · ') || w('ปีนี้ไม่มีธาตุที่เกี่ยวกับด้านนี้โดยตรง') };
            if (overall && tone === -overall) {
                const key = drv.filter((x) => Math.sign(x[1]) === tone).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map((x) => x[0]);
                const because = key.length ? ` เพราะ${key.slice(0, 2).join(' และ')}` : '';
                const head = tone > 0 ? `ภาพรวมปีนี้ต้องระวัง แต่ด้าน${T.name}ยังไปได้ดี` : `ภาพรวมปีนี้ดี แต่ด้าน${T.name}ควรระวัง`;
                o.note = w(`${head}${because} ภาพรวมดูจากธาตุของทั้งเสาว่าดวงต้องการหรือไม่ ส่วนแต่ละด้านดูจากดาวและวังที่เกี่ยวกับด้านนั้นโดยตรง ผลจึงต่างกันได้`);
            }
            out.push(o);
        };
        // การงาน: อำนาจ (官杀) และความคิด/ผลงาน (食伤) · ราศีล่างเดือน = ฐานการงาน
        { let s = 0; const why = [], drv = [];
            for (const [g, j, lab] of parts) if (g === 3 || g === 1) { const d = j !== 0 ? j : g === 3 ? 0.5 : 0; s += d; why.push(`${lab} ${jt(j)}`); if (d) drv.push([`${lab}${jt2(d)}`, d]); }
            if (rMonth && rMonth.type === 'clash') { s -= 1; why.push(`ชงราศีล่างเดือน (ฐานการงาน)`); drv.push(['ราศีล่างของปีนี้ไปชงฐานการงาน (ราศีล่างของเสาเดือนเกิด)', -1]); } else if (rMonth && rMonth.kind === '+') { s += 0.5; why.push(`${rMonth.th}กับราศีล่างเดือน`); drv.push([`ราศีล่างของปีนี้${th2(rMonth)}กับฐานการงาน (ราศีล่างของเสาเดือนเกิด)`, 0.5]); }
            add('work', s, why, drv); }
        // การเงิน: โชคลาภ/โชคลอย (财) ดีหรือร้ายตามธาตุ · คู่ธาตุ/คู่แข่ง (比劫) ที่ให้โทษ = แย่งทรัพย์
        { let s = 0; const why = [], drv = [];
            for (const [g, j, lab] of parts) { if (g === 2) { const d = j !== 0 ? j : 0.5; s += d; why.push(`${lab} ${jt(j)}`); drv.push([`${lab}เป็นดาวทรัพย์ที่${jt2(d)}`, d]); } if (g === 0 && j <= 0) { s -= 1; why.push(`${lab} ${jt(j)} (แย่งทรัพย์)`); drv.push([`${lab}มาแย่งทรัพย์`, -1]); } }
            add('money', s, why, drv); }
        // ความรัก: ดาวคู่ครอง (ชาย 财 หญิง 官杀) · ภาคี/ชงกับวังคู่ครอง
        { let s = 0; const why = [], drv = [], star = male ? 2 : 3;
            for (const [g, j, lab] of parts) if (g === star) { const d = j >= 0 ? 1 : -1; s += d; why.push(`${lab} เป็นดาวคู่ครอง ${jt(j)}`); drv.push([`${lab}เป็นดาวคู่ครองที่${jt2(d)}`, d]); }
            if (rDay && rDay.type === 'clash') { s -= 1; why.push('ชงวังคู่ครอง (ราศีล่างดิถี)'); drv.push(['ราศีล่างของปีนี้ไปชงวังคู่ครอง (ราศีล่างของดิถี)', -1]); } else if (rDay && rDay.kind === '+') { s += 1; why.push(`${rDay.th}กับวังคู่ครอง`); drv.push([`ราศีล่างของปีนี้${th2(rDay)}กับวังคู่ครอง (ราศีล่างของดิถี) ซึ่งเป็นแรงดึงดูดเข้าหากัน`, 1]); } else if (rDay) { s -= 0.5; why.push(`${rDay.th}กับวังคู่ครอง`); drv.push([`ราศีล่างของปีนี้${th2(rDay)}กับวังคู่ครอง (ราศีล่างของดิถี)`, -0.5]); }
            add('love', s, why, drv); }
        // สุขภาพ: ธาตุให้โทษของปี · ชงราศีล่างดิถี (ตัวเอง)
        { let s = 0; const why = [], drv = [];
            const badE = [];
            for (const [, j, lab, el] of parts) { if (j < 0) { s -= 0.75; why.push(`${lab} ให้โทษ`); drv.push([`${lab}ให้โทษ`, -0.75]); badE.push(el); } }
            if (J.a > 0 && J.b > 0) { s += 1; why.push('ทั้งราศีบนและราศีล่างให้คุณ'); drv.push(['ทั้งราศีบนและราศีล่างให้คุณ', 1]); }
            if (rDay && rDay.type === 'clash') { s -= 1; why.push('ชงราศีล่างดิถี (ตัวเอง)'); drv.push(['ราศีล่างของปีนี้ไปชงราศีล่างของดิถี (ตัวคุณเอง)', -1]); }
            add('health', s, why, drv);
            const h = out[out.length - 1];
            if (h.tone < 0 && badE.length && N && N.ORGAN) h.todo += ` และดูแล${N.ORGAN[badE[0]].sys} (ธาตุ${EL[badE[0]]})`; }
        return out;
    }

    // ---------- 2–3. 12 เดือน และเดือนที่ดีที่สุด ----------
    const DO = ['สร้างเครือข่าย หาหุ้นส่วน ทำงานเป็นทีม', 'เริ่มงานใหม่ เปิดตัวผลงาน นำเสนอ เจรจาขาย', 'เจรจาธุรกิจ ลงทุน ซื้อขายทรัพย์สิน', 'สมัครงาน ขอเลื่อนตำแหน่ง ติดต่อราชการ สอบ', 'เรียน สอบ เซ็นสัญญา ทำเอกสาร ซื้อบ้าน'];
    const LEVEL = (v) => v >= 2 ? 'ดีมาก' : v === 1 ? 'ดี' : v === 0 ? 'กลาง' : v === -1 ? 'ติดขัด' : 'ต้องระวัง';
    function months(chart, an, year) {
        const P = chart.pillars, dm = P.day.stem, R = judgeFn(chart, an);
        const ms = chart.monthly(year).map((m) => {
            const q = m.pillar, r = R(q), cl = (q.branch + 6) % 12 === P.day.branch;
            const gS = GROUP_OF[B.tenGod(dm, q.stem).code], gB = GROUP_OF[B.tenGod(dm, q.hidden[0].stem).code];
            const doIt = [...new Set([r.a >= 0 ? gS : null, r.b >= 0 ? gB : null].filter((x) => x != null))].map((g) => DO[g]);
            return Object.assign({}, m, { score: r.sum, level: LEVEL(r.sum), clashDay: cl, rank: r.sum - (cl ? 1 : 0), good: doIt, label: `เดือน${q.animal} ${q.zh} (${m.start.day} ${MTH[m.start.month - 1]} – ${m.end.day} ${MTH[m.end.month - 1]} ${m.end.year})` });
        });
        const count = { great: ms.filter((m) => m.score >= 2).length, good: ms.filter((m) => m.score === 1).length, mix: ms.filter((m) => m.score === 0).length, bad: ms.filter((m) => m.score <= -1).length };
        const top = Math.max(...ms.map((m) => m.rank)), best = ms.filter((m) => m.rank === top);
        return { months: ms, count, best, top,
            rule: 'เกณฑ์: ให้คะแนนแต่ละเดือนจากธาตุของราศีบนและราศีล่างของเดือน ธาตุที่ดวงต้องการ +1 ธาตุที่ดวงไม่ต้องการ −1 (เต็ม +2) ถ้าเดือนนั้นชงวังคู่ครอง (ราศีล่างดิถี) หัก 1 แล้วเลือกเดือนที่ได้คะแนนสูงสุด ถ้าเท่ากันแสดงทุกเดือน ส่วน "เหมาะกับ" ดูจากสิบเทพของเดือนนั้น' };
    }

    // ---------- วันจร (ดวงรายวัน) ----------
    const AVOID = ['ระวังการให้ยืมเงินหรือร่วมทุนกับเพื่อน', 'ระวังคำพูด ไม่โต้เถียงกับหัวหน้าหรือผู้ใหญ่', 'ไม่ลงทุนหรือซื้อของราคาแพงตามอารมณ์', 'ระวังความกดดันจากงานและเรื่องกฎระเบียบ', 'อย่าคิดมากจนไม่ลงมือ และตรวจเอกสารให้ครบ'];
    const WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    function day(chart, an, y, m, d, isToday) {
        const P = chart.pillars, dm = P.day.stem, D = chart.daily(y, m, d), q = D.pillar, r = judgeFn(chart, an)(q);
        const clashDay = (q.branch + 6) % 12 === P.day.branch, clashYear = (q.branch + 6) % 12 === P.year.branch;
        const gS = GROUP_OF[B.tenGod(dm, q.stem).code], gB = GROUP_OF[B.tenGod(dm, q.hidden[0].stem).code];
        const good = [...new Set([r.a >= 0 ? gS : null, r.b >= 0 ? gB : null].filter((x) => x != null))].map((g) => DO[g]);
        const avoid = [...new Set([r.a < 0 ? gS : null, r.b < 0 ? gB : null].filter((x) => x != null))].map((g) => AVOID[g]);
        if (clashDay) avoid.unshift('วันนี้ชงวังคู่ครอง (ราศีล่างของดิถี) เลี่ยงการตัดสินใจเรื่องใหญ่ เซ็นสัญญา และเดินทางไกล ระวังอารมณ์กับคนใกล้ตัว');
        if (clashYear) avoid.push('วันนี้ชงปีเกิด ระวังเรื่องในครอบครัวและผู้ใหญ่');
        const W = isToday ? 'วันนี้' : 'วันนั้น';
        const dow = WD[new Date(y, m - 1, d).getDay()];
        return { date: D.date, dow, pillar: q, score: r.sum, a: r.a, b: r.b, level: LEVEL(r.sum), clashDay, clashYear, rank: r.sum - (clashDay ? 1 : 0),
            good: good.map((t) => t), avoid: avoid.map((t) => t.replace(/วันนี้/g, W)),
            topics: topics(chart, an, q, isToday ? 'day' : 'dayx'),
            label: `วัน${dow}ที่ ${d} ${MTH[m - 1]} ${y}` };
    }
    // ยามจร: 12 ยามของวัน (ระบบมาตรฐานแยกยามชวดต้น/ปลาย เป็น 13 ช่วง)
    function hours(chart, an, y, m, d) {
        const P = chart.pillars, dm = P.day.stem, R = judgeFn(chart, an);
        const pad = (h) => String(h).padStart(2, '0') + '.00';
        return chart.hourly(y, m, d).map((h) => {
            const q = h.pillar, r = R(q), clashDay = (q.branch + 6) % 12 === P.day.branch;
            const gS = GROUP_OF[B.tenGod(dm, q.stem).code], gB = GROUP_OF[B.tenGod(dm, q.hidden[0].stem).code];
            const good = [...new Set([r.a >= 0 ? gS : null, r.b >= 0 ? gB : null].filter((x) => x != null))].map((g) => DO[g]);
            const avoid = [...new Set([r.a < 0 ? gS : null, r.b < 0 ? gB : null].filter((x) => x != null))].map((g) => AVOID[g]);
            if (clashDay) avoid.unshift('ยามนี้ชงวังคู่ครอง (ราศีล่างของดิถี) ไม่เหมาะกับการตัดสินใจเรื่องใหญ่หรือเริ่มเรื่องสำคัญ');
            return Object.assign({}, h, { score: r.sum, a: r.a, b: r.b, level: LEVEL(r.sum), clashDay, rank: r.sum - (clashDay ? 1 : 0), good, avoid,
                time: `${pad(h.from)}–${pad(h.to)}`, label: `ยาม${q.animal}${h.tag}` });
        });
    }
    const hourIndex = (hs, hour) => hs.findIndex((h) => hour >= h.from && hour < h.to);
    // 7 วันเริ่มจากวันที่ให้ (ใช้แถบวัน)
    function week(chart, an, y, m, d, today) {
        const out = [];
        for (let k = 0; k < 7; k++) { const t = new Date(y, m - 1, d + k), Y = t.getFullYear(), M = t.getMonth() + 1, Dd = t.getDate();
            out.push(day(chart, an, Y, M, Dd, today && Y === today.year && M === today.month && Dd === today.day)); }
        return out;
    }

    // ---------- 4. ไท้ส่วย ----------
    const TS = {
        same: { name: 'ปีนักษัตรตัวเอง (值太岁)', sev: 2, text: 'ปีนี้เป็นปีนักษัตรเดียวกับปีเกิด ตามความเชื่อถือว่าเป็นปีชง มักมีความเปลี่ยนแปลงในตัวเอง อารมณ์ขึ้นลง และมีเรื่องที่ต้องตัดสินใจด้วยตัวเอง', care: 'ทำเรื่องสำคัญอย่างรอบคอบ ไม่ใจร้อน และดูแลสุขภาพใจ' },
        clash: { name: 'ชงไท้ส่วย (冲太岁)', sev: 3, text: 'ปีเกิดชงกับไท้ส่วยโดยตรง เป็นกลุ่มที่นิยมไหว้แก้ชงมากที่สุด มักมีการเปลี่ยนแปลงใหญ่ เช่น ย้ายงาน ย้ายบ้าน เดินทางไกล หรือต้องเริ่มบางเรื่องใหม่', care: 'วางแผนล่วงหน้า เผื่อเงินและเวลา ระวังการเดินทางและการตัดสินใจเรื่องใหญ่ด้วยอารมณ์' },
        punish: { name: 'เฮ้งไท้ส่วย (刑太岁)', sev: 2, text: 'ปีเกิดเฮ้งกับไท้ส่วย ระวังเรื่องกฎหมาย เอกสาร สัญญา และคำพูดที่กระทบคนอื่น', care: 'อ่านสัญญาให้ละเอียด เก็บเอกสารให้ครบ และระวังคำพูด' },
        selfPunish: { name: 'ปีนักษัตรตัวเองแบบเฮ้งตัวเอง (值太岁 自刑)', sev: 2, text: 'ปีนี้เป็นปีนักษัตรเดียวกับปีเกิด และเป็นกิ่งเฮ้งตัวเอง มักคิดมาก กดดันตัวเอง หรือทำเรื่องให้ยากเกินจำเป็น', care: 'ลดความคาดหวังกับตัวเอง ปรึกษาคนที่ไว้ใจก่อนตัดสินใจ' },
        harm: { name: 'ไห่ไท้ส่วย (害太岁)', sev: 1, text: 'ปีเกิดไห่กับไท้ส่วย ระวังความเข้าใจผิด คนรอบตัวคิดไม่ซื่อ หรือถูกนินทา', care: 'สื่อสารให้ชัด ไม่เล่าเรื่องส่วนตัวกับคนที่ยังไม่สนิท' },
        break: { name: 'ผั่วไท้ส่วย (破太岁)', sev: 1, text: 'ปีเกิดผั่วกับไท้ส่วย แผนที่วางไว้มักต้องปรับ งานบางอย่างสะดุดกลางทาง', care: 'มีแผนสำรอง และไม่ลงทุนทั้งหมดในครั้งเดียว' }
    };
    const PRAY = 'แนวทางตามความนิยม: คนที่ชง เฮ้ง ไห่ หรือผั่วกับไท้ส่วย นิยมไหว้ไท้ส่วยประจำปีช่วงต้นปีจีน ที่ศาลเจ้าที่มีองค์ไท้ส่วย ขั้นตอนและเครื่องไหว้ของแต่ละศาลเจ้าไม่เหมือนกัน ควรสอบถามศาลเจ้านั้นโดยตรง';
    function taisui(chart, year) {
        const P = chart.pillars, a = chart.annual(year, year)[0], q = a.pillar;
        const yb = P.year.branch, db = P.day.branch;
        let key = null;
        if (yb === q.branch) key = [4, 6, 9, 11].includes(yb) ? 'selfPunish' : 'same';
        else { const r = rel2(yb, q.branch); if (r && TS[r.type]) key = r.type; }
        const hits = [];
        if (key) hits.push({ by: 'ปีเกิด', name: TS[key].name, sev: TS[key].sev, text: TS[key].text, care: TS[key].care, source: `ปีเกิด ${B.BRANCHES[yb]} ปี${P.year.animal} กับไท้ส่วย ${B.BRANCHES[q.branch]} ปี${q.animal}` });
        if ((db + 6) % 12 === q.branch) hits.push({ by: 'ดิถี', name: 'ชงวังคู่ครอง (ราศีล่างดิถี)', sev: 2, text: 'ตามหลักบาจื้อ ปีนี้ชงราศีล่างดิถีซึ่งเป็นวังของตัวเองและคู่ครอง แม้ปีเกิดไม่ชง ก็มักมีความเปลี่ยนแปลงในชีวิตส่วนตัวหรือชีวิตคู่', care: 'ใส่ใจคนใกล้ตัว และระวังสุขภาพกับการเดินทาง', source: `ราศีล่างดิถี ${B.BRANCHES[db]} ชงกับ ${B.BRANCHES[q.branch]}` });
        const sev = hits.reduce((m, h) => Math.max(m, h.sev), 0);
        return { year, pillar: q, animal: q.animal, zh: q.zh, hits, status: !hits.length ? 'ไม่ชง' : sev >= 3 ? 'ชงแรง' : sev === 2 ? 'ชง' : 'ชงเล็กน้อย', tone: !hits.length ? 1 : sev >= 2 ? -1 : 0, pray: hits.length ? PRAY : '' };
    }

    function summary(chart, an, year) {
        const a = chart.annual(year, year)[0];
        const tp = topics(chart, an, a.pillar), mo = months(chart, an, year);
        return { year, pillar: a.pillar, topics: tp, good: tp.filter((t) => t.tone > 0), bad: tp.filter((t) => t.tone < 0), months: mo, taisui: [taisui(chart, year), taisui(chart, year + 1)] };
    }
    return { summary, topics, months, taisui, day, week, hours, hourIndex, DO, AVOID, GROUP_OF, judgeFn, LEVEL };
});
