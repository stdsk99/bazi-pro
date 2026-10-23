// compat.js — ดูดวงคู่ตามหลักตำรามาตรฐาน 合婚 (ระบบอ้างอิงไม่มีส่วนนี้) · ใช้ศัพท์เดียวกับทั้งแอป
// คะแนนเต็ม 100: ธาตุเติมกัน 25 · ดิถีคู่กัน 20 · วังคู่ครอง 20 · ดาวคู่ครอง 15 · นักษัตรปีเกิด 10 · ราศีล่างเดือน 10
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'), require('./analysis.js'), require('./interactions.js'));
    else root.BaziCompat = factory(root.BaziCore, root.BaziAnalysis, root.BaziInteractions);
})(typeof self !== 'undefined' ? self : this, function (B, An, I) {
    'use strict';
    const EL = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const r1 = (x) => Math.round(x * 2) / 2;
    const list = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(' ') + 'และ' + a[a.length - 1];

    // ธาตุที่ดวงต้องการ / ไม่ต้องการ (ไม่นับธาตุที่เป็นทั้งสองฝั่ง)
    function needs(an) {
        const f = new Set(an.favorable.map((x) => x.element)), u = new Set(an.unfavorable.filter((x) => !x.polarity && !x.position).map((x) => x.element));
        return { fav: [...f].filter((e) => !u.has(e)), unf: [...u].filter((e) => !f.has(e)) };
    }
    // ความสัมพันธ์ของกิ่งสองตัว
    function branchRel(a, b) {
        const it = I.find([{ key: 'a', label: 'a', stem: 0, branch: a }, { key: 'b', label: 'b', stem: 1, branch: b }], null).filter((r) => !r.type.startsWith('stem'));
        const has = (t) => it.find((r) => r.type === t);
        return has('pair') || has('halfTrio') || has('clash') || has('punish') || has('selfPunish') || has('harm') || has('break') || null;
    }
    const BR_SCORE = { pair: 1, halfTrio: 0.9, none: 0.6, same: 0.7, selfPunish: 0.35, punish: 0.3, harm: 0.3, break: 0.35, clash: 0.1 };
    const brKey = (a, b) => { const r = branchRel(a, b); return r ? r.type : a === b ? 'same' : 'none'; };

    function compare(c1, c2) {
        const a1 = An.analyze(c1), a2 = An.analyze(c2);
        const P1 = c1.pillars, P2 = c2.pillars;
        const nm = (c, d) => { const n = (c.input.name || '').trim() || d; return /[A-Za-z0-9.]$/.test(n) ? n + ' ' : n; };
        const n1 = nm(c1, 'คนที่ 1'), n2 = nm(c2, 'คนที่ 2');
        const items = [];

        // 1. ธาตุเติมกัน: ธาตุในดวงอีกฝ่ายเป็นธาตุที่ดวงเราต้องการหรือไม่
        const give = (an, other) => {
            const nd = needs(an), cnt = other.elementCount.map((x) => x.count), tot = cnt.reduce((s, x) => s + x, 0) || 1;
            const f = nd.fav.reduce((s, e) => s + cnt[e], 0) / tot, u = nd.unf.reduce((s, e) => s + cnt[e], 0) / tot;
            const top = cnt.map((v, e) => [v, e]).sort((x, y) => y[0] - x[0]).filter(([v]) => v >= 2).map(([, e]) => e);
            return { sc: clamp(0.5 + (f - u) * 0.9, 0, 1), nd, top };
        };
        const g12 = give(a1, c2), g21 = give(a2, c1);
        const sideTxt = (me, other, g) => {
            const hit = g.top.filter((e) => g.nd.fav.includes(e)), bad = g.top.filter((e) => g.nd.unf.includes(e));
            const need = g.nd.fav.length ? `${me}ต้องการธาตุ${list(g.nd.fav.map((e) => EL[e]))}` : `ดวง${me}ยังสรุปธาตุที่ต้องการไม่ได้`;
            return hit.length ? `${need} ดวง${other}มีธาตุ${list(hit.map((e) => EL[e]))}มาก จึงช่วยเติมสิ่งที่${me}ขาดได้ดี`
                : bad.length ? `${need} แต่ดวง${other}เด่นธาตุ${list(bad.map((e) => EL[e]))} ซึ่งดวง${me}ไม่ต้องการ อยู่ด้วยกันนานๆ ${me}อาจรู้สึกเหนื่อยหรือถูกกดดัน`
                    : `${need} ดวง${other}มีธาตุนี้ไม่มาก จึงช่วยเติมได้บ้างแต่ไม่เด่น`;
        };
        items.push({ id: 'elements', name: 'ธาตุเติมกัน', max: 25, pts: r1(25 * (g12.sc + g21.sc) / 2),
            text: `${sideTxt(n1, n2, g12)} · ${sideTxt(n2, n1, g21)}`,
            source: `ธาตุให้คุณของ${n1}: ${g12.nd.fav.map((e) => EL[e]).join(' ') || '—'} · ธาตุให้คุณของ${n2}: ${g21.nd.fav.map((e) => EL[e]).join(' ') || '—'} · นับธาตุจาก 8 อักษร` });

        // 2. ดิถีคู่กัน
        const s1 = P1.day.stem, s2 = P2.day.stem, e1 = B.STEM_ELEMENT[s1], e2 = B.STEM_ELEMENT[s2];
        const combo = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]].some(([x, y]) => (s1 === x && s2 === y) || (s1 === y && s2 === x));
        const sclash = [[0, 6], [1, 7], [2, 8], [3, 9]].some(([x, y]) => (s1 === x && s2 === y) || (s1 === y && s2 === x));
        let dp, dt, dsrc;
        if (combo) { dp = 20; dt = 'ดิถีของสองคนเป็นคู่ภาคีกัน ดึงดูดกันโดยธรรมชาติ รู้สึกคุ้นเคยและอยากอยู่ใกล้กัน ถือเป็นลักษณะคู่ที่ดีที่สุดในตำรา'; dsrc = 'บนภาคี 天干合'; }
        else if (sclash) { dp = 5; dt = 'ดิถีของสองคนปะทะกัน ความคิดและวิธีทำงานต่างกันชัด มักเถียงกันเรื่องหลักการ ต้องตกลงบทบาทให้ชัดและให้เกียรติความต่าง'; dsrc = 'บนปะทะ 天干冲'; }
        else if (e1 === e2) { dp = 13; dt = 'ดิถีเป็นธาตุเดียวกัน เข้าใจกันง่ายเหมือนเพื่อน แต่ต่างคนต่างมีจุดยืน อาจแข่งกันนำ ควรแบ่งเรื่องที่แต่ละคนดูแลให้ชัด'; dsrc = 'ธาตุเดียวกัน (คู่ธาตุ)'; }
        else if ((e1 + 1) % 5 === e2 || (e2 + 1) % 5 === e1) {
            const giver = (e1 + 1) % 5 === e2 ? n1 : n2, taker = giver === n1 ? n2 : n1;
            dp = 16; dt = `ดิถีให้กำเนิดกัน ${giver}เป็นฝ่ายดูแลและหนุน${taker} ความสัมพันธ์อบอุ่นและพึ่งพากันได้ ข้อควรระวังคือ${giver}อาจเหนื่อยถ้าให้อยู่ฝ่ายเดียว`; dsrc = 'ธาตุให้กำเนิด (ธาตุส่งเสริม/ธาตุถ่ายเท)';
        } else {
            const ctl = (e1 + 2) % 5 === e2 ? n1 : n2, sub = ctl === n1 ? n2 : n1;
            dp = 10; dt = `ดิถีข่มกัน ${ctl}มักเป็นฝ่ายกำหนดทิศทาง ส่วน${sub}รู้สึกถูกควบคุมได้ง่าย ถ้า${ctl}รู้จักฟังและ${sub}ได้มีพื้นที่ของตัวเอง ความสัมพันธ์จะมั่นคงขึ้น`; dsrc = 'ธาตุข่ม (ธาตุโชคลาภ/ธาตุอำนาจ)';
        }
        items.push({ id: 'dm', name: 'ดิถีคู่กัน', max: 20, pts: dp, text: dt, source: `ดิถี ${B.STEMS[s1]} ธาตุ${EL[e1]} กับ ${B.STEMS[s2]} ธาตุ${EL[e2]} · ${dsrc}` });

        // 3. วังคู่ครอง (ราศีล่างดิถี)
        const BR_TXT = {
            pair: 'วังคู่ครองเป็นภาคีคู่ เข้าขากันในชีวิตประจำวัน อยู่บ้านเดียวกันแล้วสบายใจ ช่วยกันสร้างครอบครัวได้ดี',
            halfTrio: 'วังคู่ครองเป็นครึ่งภาคี มีเป้าหมายร่วมกัน ร่วมมือกันได้ดีเมื่อมีเรื่องให้ทำด้วยกัน',
            same: 'วังคู่ครองเหมือนกัน นิสัยในบ้านคล้ายกัน เข้าใจกันง่าย แต่ก็เห็นข้อเสียของกันชัด',
            none: 'วังคู่ครองไม่มีทั้งแรงดึงดูดและแรงปะทะ ความสัมพันธ์ขึ้นกับการดูแลกันในแต่ละวัน',
            clash: 'วังคู่ครองชงกัน ชีวิตคู่มีความเปลี่ยนแปลงหรือต้องห่างกันบ่อย เช่น ทำงานคนละที่ ควรมีเวลาคุณภาพร่วมกันสม่ำเสมอ',
            punish: 'วังคู่ครองเฮ้งกัน มักมีเรื่องจุกจิกหรือคำพูดที่กระทบใจ ควรใจเย็นและไม่เก็บเรื่องเล็กมาสะสม',
            selfPunish: 'วังคู่ครองเหมือนกันและเป็นกิ่งเฮ้งตัวเอง ต่างคนต่างคิดมากในเรื่องเดียวกัน ควรเปิดใจคุยกันตรงๆ',
            harm: 'วังคู่ครองไห่กัน มักมีความเข้าใจผิดหรือมีคนนอกเข้ามาทำให้ระแวงกัน ควรสื่อสารให้ชัด',
            break: 'วังคู่ครองผั่วกัน แผนที่วางไว้ร่วมกันมักสะดุด ควรวางแผนสำรองและไม่ปล่อยให้เรื่องเล็กบานปลาย'
        };
        const k3 = brKey(P1.day.branch, P2.day.branch);
        const TH = Object.assign({ same: 'ราศีล่างเหมือนกัน', none: 'ไม่มีภาคีหรือชง' }, Object.fromEntries(Object.entries(I.TYPES).map(([k, v]) => [k, `${v.th} ${v.zh}`])));
        items.push({ id: 'palace', name: 'วังคู่ครอง', max: 20, pts: r1(20 * BR_SCORE[k3]), text: BR_TXT[k3],
            source: `ราศีล่างดิถี ${B.BRANCHES[P1.day.branch]} กับ ${B.BRANCHES[P2.day.branch]} · ${TH[k3]}` });

        // 4. ดาวคู่ครอง: ชายดูธาตุโชคลาภ หญิงดูธาตุอำนาจ เทียบกับดิถีของอีกฝ่าย
        const star = (c, an) => { const e = B.STEM_ELEMENT[c.pillars.day.stem], male = (c.input.gender || 'M') === 'M'; return { el: male ? (e + 2) % 5 : (e + 3) % 5, word: male ? 'ธาตุโชคลาภ' : 'ธาตุอำนาจ', nd: needs(an) }; };
        const st1 = star(c1, a1), st2 = star(c2, a2);
        const fit = (st, otherEl) => otherEl === st.el ? 1 : st.nd.fav.includes(otherEl) ? 0.6 : (otherEl + 1) % 5 === st.el ? 0.5 : 0.25;
        const f1 = fit(st1, e2), f2 = fit(st2, e1);
        const fitTxt = (me, other, st, f, oe) => f === 1 ? `ดิถีของ${other}เป็น${st.word}ซึ่งเป็นดาวคู่ครองของ${me}พอดี ตามตำราถือว่าเป็นคู่ที่ใช่` : f >= 0.6 ? `ดิถีของ${other} (ธาตุ${EL[oe]}) ไม่ใช่ดาวคู่ครองของ${me}โดยตรง แต่เป็นธาตุที่ดวง${me}ต้องการ จึงเกื้อหนุนกัน` : f >= 0.5 ? `ดิถีของ${other} (ธาตุ${EL[oe]}) ให้กำเนิดดาวคู่ครองของ${me} ช่วยหนุนเรื่องความรักทางอ้อม` : `ดิถีของ${other} (ธาตุ${EL[oe]}) ไม่ตรงกับดาวคู่ครองของ${me} (ธาตุ${EL[st.el]}) ต้องอาศัยความเข้าใจมากกว่าแรงดึงดูดตามดวง`;
        items.push({ id: 'star', name: 'ดาวคู่ครอง', max: 15, pts: r1(7.5 * f1 + 7.5 * f2), text: `${fitTxt(n1, n2, st1, f1, e2)} · ${fitTxt(n2, n1, st2, f2, e1)}`,
            source: `ดาวคู่ครองของ${n1}: ${st1.word} (${EL[st1.el]}) · ของ${n2}: ${st2.word} (${EL[st2.el]}) (ชายดูธาตุโชคลาภ หญิงดูธาตุอำนาจ)` });

        // 5. นักษัตรปีเกิด
        const ZTXT = { pair: 'ปีเกิดเป็นภาคีคู่ ครอบครัวสองฝ่ายมักเข้ากันได้ และนิสัยพื้นฐานเกื้อกูลกัน', halfTrio: 'ปีเกิดอยู่ในกลุ่มภาคีเดียวกัน มองโลกคล้ายกัน คุยกันถูกคอ', same: 'เกิดปีนักษัตรเดียวกัน รสนิยมคล้ายกัน แต่ข้อเสียก็คล้ายกัน', none: 'ปีเกิดไม่มีภาคีหรือชง เป็นกลาง', clash: 'ปีเกิดชงกัน มุมมองชีวิตต่างกันมาก และครอบครัวสองฝ่ายอาจมีความเห็นไม่ตรงกัน', punish: 'ปีเกิดเฮ้งกัน มีเรื่องขัดใจเล็กๆ บ่อย', selfPunish: 'ปีเกิดเดียวกันแบบเฮ้งตัวเอง ต่างคนต่างดื้อในเรื่องเดียวกัน', harm: 'ปีเกิดไห่กัน ระวังความเข้าใจผิดจากคนรอบข้าง', break: 'ปีเกิดผั่วกัน แผนร่วมกันมักต้องปรับบ่อย' };
        const k5 = brKey(P1.year.branch, P2.year.branch);
        items.push({ id: 'zodiac', name: 'นักษัตรปีเกิด', max: 10, pts: r1(10 * BR_SCORE[k5]), text: ZTXT[k5], source: `ปี${P1.year.animal} ${B.BRANCHES[P1.year.branch]} กับ ปี${P2.year.animal} ${B.BRANCHES[P2.year.branch]} · ${TH[k5]}` });

        // 6. ราศีล่างเดือน (พื้นเพครอบครัวและจังหวะชีวิตการงาน)
        const MTXT = { pair: 'ราศีล่างเดือนเป็นภาคีคู่ พื้นเพครอบครัวและจังหวะการทำงานไปด้วยกันได้', halfTrio: 'ราศีล่างเดือนเป็นครึ่งภาคี สนับสนุนงานของกันและกันได้', same: 'ราศีล่างเดือนเหมือนกัน เกิดฤดูเดียวกัน จังหวะชีวิตคล้ายกัน', none: 'ราศีล่างเดือนเป็นกลาง', clash: 'ราศีล่างเดือนชงกัน เกิดคนละฤดู จังหวะการทำงานและนิสัยครอบครัวต่างกัน ต้องปรับเข้าหากัน', punish: 'ราศีล่างเดือนเฮ้งกัน มีแรงเสียดทานเรื่องครอบครัวหรืองาน', selfPunish: 'ราศีล่างเดือนเหมือนกันแบบเฮ้งตัวเอง ต่างคนต่างเครียดเรื่องงานคล้ายกัน', harm: 'ราศีล่างเดือนไห่กัน ระวังญาติหรือคนที่ทำงานทำให้เข้าใจผิดกัน', break: 'ราศีล่างเดือนผั่วกัน แผนเรื่องงานหรือบ้านมักต้องปรับ' };
        const k6 = brKey(P1.month.branch, P2.month.branch);
        items.push({ id: 'month', name: 'พื้นเพและจังหวะชีวิต', max: 10, pts: r1(10 * BR_SCORE[k6]), text: MTXT[k6], source: `ราศีล่างเดือน ${B.BRANCHES[P1.month.branch]} กับ ${B.BRANCHES[P2.month.branch]} · ${TH[k6]}` });

        const total = Math.round(items.reduce((s, x) => s + x.pts, 0));
        const level = total >= 80 ? ['เข้ากันดีมาก', 'good'] : total >= 65 ? ['เข้ากันดี', 'good'] : total >= 50 ? ['ปานกลาง ต้องปรับเข้าหากัน', 'mix'] : ['ต้องใช้ความเข้าใจมาก', 'bad'];
        const sorted = items.slice().sort((x, y) => x.pts / x.max - y.pts / y.max);
        const weak = sorted.filter((x) => x.pts / x.max < 0.55).slice(0, 2), strong = sorted.slice().reverse().filter((x) => x.pts / x.max >= 0.75).slice(0, 2);
        const advice = [];
        if (strong.length) advice.push(`จุดแข็งของคู่นี้คือ${list(strong.map((x) => x.name))} ใช้เป็นฐานของความสัมพันธ์`);
        if (weak.length) advice.push(`เรื่องที่ควรใส่ใจคือ${list(weak.map((x) => x.name))} ไม่ได้แปลว่าไปด้วยกันไม่ได้ แต่ต้องตกลงกันให้ชัดและให้เวลาปรับตัว`);
        const mix = [...new Set(g12.nd.fav.filter((e) => g21.nd.fav.includes(e)))];
        if (mix.length) advice.push(`ทั้งสองคนได้ประโยชน์จากธาตุ${list(mix.map((e) => EL[e]))} เหมือนกัน การตกแต่งบ้านหรือทำกิจกรรมที่เป็นธาตุนี้จะช่วยทั้งคู่`);
        advice.push('ดวงคู่บอกแนวโน้มของความเข้ากัน ความสัมพันธ์จริงขึ้นกับการสื่อสาร ความเคารพ และการดูแลกันของทั้งสองคน');
        return { total, level: level[0], tone: level[1], items, advice, a1, a2, names: [n1.trim(), n2.trim()] };
    }

    return { compare };
});
