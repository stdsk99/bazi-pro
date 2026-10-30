// ai.js — ให้ AI เรียบเรียงคำทำนายและตอบคำถามเรื่องดวง
// แอปคำนวณทุกอย่างเอง แล้วส่ง "แฟ้มดวง" (ข้อมูลที่คำนวณแล้ว + คำทำนายแม่แบบ) ให้ AI เขียนเป็นภาษาคน
// AI ห้ามคำนวณหรือเปลี่ยนผลวิเคราะห์เอง ถ้าต้องการข้อมูลปี/เดือน/วัน/ฤกษ์อื่น ให้เรียกเครื่องมือของแอป
// ผู้ให้บริการ: Claude ผ่านบัญชีผู้ใช้ (เมื่อเปิดบน claude.ai) · ที่อื่นใช้ปุ่มคัดลอกไปถาม AI ตัวไหนก็ได้
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-core.js'), require('./analysis.js'), require('./interactions.js'), require('./narrative.js'), require('./yearly.js'), require('./auspicious.js'), require('./compat.js'), require('./structure.js'), require('./shensha.js'), require('./almanac.js'));
    else root.BaziAI = factory(root.BaziCore, root.BaziAnalysis, root.BaziInteractions, root.BaziNarrative, root.BaziYearly, root.BaziAuspicious, root.BaziCompat, root.BaziStructure, root.BaziShensha, root.BaziAlmanac);
})(typeof self !== 'undefined' ? self : this, function (B, An, I, N, Y, AU, C, ST, SS, AL) {
    'use strict';
    const MTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const POS = { hour: 'ยาม', day: 'วัน (ดิถี)', month: 'เดือน', year: 'ปี' };
    const dstr = (d) => `${d.day} ${MTH[d.month - 1]} ${d.year}`;
    const elList = (l) => l.map((x) => { const n = An.itemNote(x); return x.th + (x.polarity ? (x.polarity === 'same' ? ' (ขั้วเดียวกับดิถี)' : ' (ขั้วตรงข้ามดิถี)') : '') + (n ? ` (${n})` : ''); }).join(', ') || '—';
    const blockText = (b) => [b.title, b.sub, b.text, (b.items || []).map(([k, v]) => `${k}: ${v}`).join(' · '), b.source ? `[ที่มา: ${b.source}]` : ''].filter(Boolean).join(' — ');
    const todayOf = (now) => { const t = now || new Date(); return { year: t.getFullYear(), month: t.getMonth() + 1, day: t.getDate() }; };

    // ---------- แฟ้มดวง ----------
    function pillarLine(chart, k) {
        const p = chart.pillars[k], dm = chart.pillars.day.stem;
        const tg = k === 'day' ? 'ดิถี (ตัวเจ้าชะตา)' : `${p.tenGod.code} ${p.tenGod.th}`;
        const hid = p.hidden.map((h) => { const g = B.tenGod(dm, h.stem); return `${h.zh}${h.element} ${g.code}`; }).join(' ');
        return `- ${POS[k]}: ${p.zh} · ราศีบน ${B.STEMS[p.stem]} ${p.stemElement}${p.stemYang ? '+' : '−'} (${tg}) · ราศีล่าง ${B.BRANCHES[p.branch]} ${p.branchElement} ปี${p.animal} · ราศีแฝง ${hid}`;
    }
    function luckLines(chart, an, today) {
        const R = Y.judgeFn(chart, an), y = today.year;
        return chart.luck.periods.slice(0, 9).map((lp) => {
            const r = R(lp.pillar), cur = lp.start.year <= y && y < lp.end.year;
            return `- ${lp.pillar.zh} อายุ ${lp.ageAtStart.years}–${lp.ageAtStart.years + 10} ปี (${dstr(lp.start)} – ${dstr(lp.end)}) · ${Y.LEVEL(r.sum)} (ราศีบน ${r.a > 0 ? 'ให้คุณ' : r.a < 0 ? 'ให้โทษ' : 'กลาง'} ราศีล่าง ${r.b > 0 ? 'ให้คุณ' : r.b < 0 ? 'ให้โทษ' : 'กลาง'})${cur ? ' ← ช่วงปัจจุบัน' : ''}`;
        }).join('\n');
    }
    function yearBrief(chart, an, year) {
        const s = Y.summary(chart, an, year), r = Y.judgeFn(chart, an)(s.pillar);
        const ts = s.taisui[0];
        return `ปี ${year} (${s.pillar.zh} ปี${s.pillar.animal}) ภาพรวม ${Y.LEVEL(r.sum)} · ` + s.topics.map((t) => `${t.name}: ${t.level} — ${t.text} (ควรทำ: ${t.todo})`).join(' | ') +
            ` · เดือนเด่น: ${s.months.best.map((m) => m.label).join(', ')} · ไท้ส่วย: ${ts.status}${ts.hits.length ? ' — ' + ts.hits.map((h) => h.name).join(', ') : ''}`;
    }
    // ข้อมูลดวงที่คำนวณแล้ว เป็นข้อความ (ภาษาไทย) — ใช้ทั้งการเรียบเรียงและการถามดวง
    function context(chart, an, opt) {
        opt = opt || {};
        const today = opt.today || todayOf(), inp = chart.input || {};
        const age = today.year - inp.year - ((today.month < inp.month || (today.month === inp.month && today.day < inp.day)) ? 1 : 0);
        const rels = I.natal(chart), secs = N.natal(chart, an, rels), basis = N.summary(chart, an, rels);
        const G = ST.structure(chart), stars = SS.natal(chart), kong = AL.natalKong(chart);
        const L = [];
        L.push('## ผู้ถาม');
        L.push(`${(inp.name || '').trim() || 'ไม่ระบุชื่อ'} · ${inp.gender === 'F' ? 'หญิง' : 'ชาย'} · เกิด ${inp.day} ${MTH[inp.month - 1]} ${inp.year} เวลา ${String(inp.hour).padStart(2, '0')}:${String(inp.minute || 0).padStart(2, '0')} น. · อายุ ${age} ปี · วันนี้ ${dstr(today)}`);
        L.push('## ผังดวง (ยาม วัน เดือน ปี)');
        ['hour', 'day', 'month', 'year'].forEach((k) => L.push(pillarLine(chart, k)));
        L.push('## ผลวิเคราะห์ (ห้ามเปลี่ยน)');
        L.push(`- ${an.pattern ? `ดวงพิเศษ: ${an.patternTh} ${an.patternZh}` : `ดวงปกติ: ${an.strengthTh}`} · คะแนนฝ่ายช่วย ${an.score.total}`);
        L.push(`- ธาตุให้คุณ: ${elList(an.favorable)}`);
        L.push(`- ธาตุให้โทษ: ${elList(an.unfavorable)}`);
        if (an.neutral && an.neutral.length) L.push(`- ธาตุกลาง: ${elList(an.neutral)}`);
        L.push(`- เหตุผล: ${an.reasons.join(' · ')}`);
        L.push(`- โครงสร้างดวง (ข้อมูลประกอบ ไม่เปลี่ยนธาตุดี/ร้าย): ${G.zh} ${G.th} — ${G.mean}`);
        L.push(`- ความสัมพันธ์ในดวง: ${rels.length ? rels.map((x) => `${x.th} ${x.zh} (${x.members.map((m) => m.label).join('-')})`).join(', ') : 'ไม่มี'}`);
        L.push(`- ดาวพิเศษ: ${stars.length ? stars.map((s) => `${s.th} ${s.zh} ที่${s.at.join(' ')} — ${s.natal}`).join(' | ') : 'ไม่มี'}`);
        L.push(`- กงหวั่ง: ${kong.branches.map((b) => B.BRANCHES[b] + ' ' + B.ANIMALS_TH[b]).join(', ')}${kong.hits.length ? ' · ' + kong.hits.map((h) => `${h.label}ตกกงหวั่ง: ${h.text}`).join(' | ') : ''}`);
        L.push('## วัยจร (ดวง 10 ปี)');
        L.push(luckLines(chart, an, today));
        L.push('## ดวงรายปี');
        L.push('- ' + yearBrief(chart, an, today.year));
        L.push('- ' + yearBrief(chart, an, today.year + 1));
        L.push('## พื้นดวง (สรุป)');
        basis.forEach((x) => L.push(`- ${x.label}: ${x.text}${x.more && x.more.length ? ' · ' + x.more.map(([k, v]) => `${k}: ${v}`).join(' · ') : ''}`));
        L.push('## คำทำนายแม่แบบ (ความหมายที่ตรวจทานแล้ว ใช้เป็นเนื้อหาหลัก)');
        secs.forEach((s) => { L.push(`### ${s.title} [id: ${s.id}]`); s.blocks.forEach((b) => L.push('- ' + blockText(b))); });
        return L.join('\n');
    }

    // ---------- กติกา ----------
    const TERMS_PRO = 'ใช้ศัพท์ของแอปได้เต็มที่: ดิถี ราศีบน ราศีล่าง ราศีแฝง คู่ธาตุ ธาตุถ่ายเท ธาตุโชคลาภ ธาตุอำนาจ ธาตุส่งเสริม สิบเทพ (เขียนชื่อจีนกำกับได้) วัยจร ปีจร เดือนจร ภาคี ชง เฮ้ง ไห่ ผั่ว และอ้างตำแหน่งเสาได้';
    const TERMS_GEN = 'เขียนให้คนทั่วไปอ่านเข้าใจ ไม่ใช้ศัพท์เทคนิค ถ้าจำเป็นต้องใช้ให้อธิบายสั้นๆ ในวงเล็บ เรียกดิถีว่า "ตัวคุณ" เรียกวัยจรว่า "ดวง 10 ปี" ปีจรว่า "ดวงรายปี" เน้นว่าชีวิตเป็นอย่างไรและควรทำอะไร';
    function rules(pro) {
        return [
            'คุณคือผู้ช่วยเรียบเรียงคำทำนายดวงจีนสี่เสา (ปาจื้อ) ในแอป Bazi Pro ตอบเป็นภาษาไทยเสมอ',
            'กติกา:',
            '1. ใช้เฉพาะข้อมูลใน "แฟ้มดวง" และผลจากเครื่องมือของแอปเท่านั้น ห้ามผูกดวงหรือคำนวณเสาเอง ห้ามเปลี่ยนลักษณะดวง กำลังดิถี หรือธาตุให้คุณ/ให้โทษ ถ้าข้อมูลไม่พอให้บอกตรงๆ',
            '2. ความหมายต้องตรงกับคำทำนายแม่แบบในแฟ้มดวง เรียบเรียงใหม่ด้วยคำของตัวเอง เชื่อมโยงให้เป็นเรื่องเดียว ไม่ลอกประโยคเดิมทั้งประโยค',
            '3. ห้ามกล่าวถึงชื่ออาจารย์ สำนัก โปรแกรม หรือแหล่งอ้างอิงภายนอก และห้ามบอกว่ามีข้อความแม่แบบ',
            '4. ธาตุที่มีเงื่อนไข (เช่น เฉพาะราศีบน เฉพาะบางกิ่ง ถ้ามากับธาตุอื่น บางตัว) ต้องคงเงื่อนไขนั้นไว้',
            '5. เรื่องสุขภาพ การเงิน กฎหมาย ให้เป็นแนวทาง ไม่ฟันธง และแนะนำให้ปรึกษาผู้เชี่ยวชาญเมื่อเป็นเรื่องสำคัญ ไม่ขู่ให้กลัว',
            '6. ทุกข้อสรุปสำคัญให้ต่อท้ายที่มาในดวงสั้นๆ ในวงเล็บ เช่น (ที่มา: ธาตุไฟให้คุณ ปีจรราศีบนเป็นไฟ)',
            '7. ' + (pro ? TERMS_PRO : TERMS_GEN),
            '8. รูปแบบ: หัวข้อขึ้นต้นด้วย "## " ย่อหน้าสั้น รายการขึ้นต้นด้วย "- " เน้นคำด้วย **ตัวหนา** ได้ ไม่ใช้ตาราง'
        ].join('\n');
    }
    function rewritePrompt(ctx, pro) {
        return `${rules(pro)}\n\nงาน: เรียบเรียงคำทำนายพื้นดวงทั้งหมดของคนนี้เป็นบทความเดียวที่อ่านลื่น ${pro ? 'ละเอียดระดับซินแส' : 'อ่านง่ายสำหรับคนทั่วไป'} ความยาวราว ${pro ? '1,500–2,500' : '1,000–1,800'} คำ เรียงหัวข้อดังนี้:\n` +
            '## ภาพรวมชีวิต (คุณเป็นคนแบบไหน จุดแข็ง สิ่งที่ต้องระวัง)\n## ธาตุที่ช่วยและธาตุที่ควรเลี่ยง (ใช้ในชีวิตประจำวันอย่างไร)\n## การงานและการเงิน\n## ความรักและครอบครัว\n## สุขภาพ\n## ช่วงชีวิตตอนนี้ (ดวง 10 ปีปัจจุบัน ปีนี้ และปีหน้า)\n## คำแนะนำ 5 ข้อ\n\n' +
            `แฟ้มดวง:\n${ctx}`;
    }
    function chatIntro(ctx, pro) {
        return `${rules(pro)}\n\nงาน: ตอบคำถามเรื่องดวงของคนนี้ ตอบตรงคำถามก่อน แล้วให้เหตุผลทางดวงและคำแนะนำที่ทำได้จริง ความยาวพอเหมาะกับคำถาม ` +
            'ถ้าคำถามเกี่ยวกับปี เดือน วัน ฤกษ์ หรือดวงคู่ที่ไม่มีในแฟ้มดวง ให้เรียกเครื่องมือของแอปก่อนตอบ ห้ามเดา\n\nแฟ้มดวง:\n' + ctx;
    }
    // สำหรับคัดลอกไปวางใน AI ตัวอื่น (ไม่มีเครื่องมือ)
    function copyText(ctx, pro, question) {
        return question ? `${rules(pro)}\n\nตอบคำถามเรื่องดวงของคนนี้ ถ้าต้องใช้ข้อมูลปี เดือน วัน หรือฤกษ์ที่ไม่มีในแฟ้มดวง ให้บอกว่าข้อมูลไม่พอ ห้ามคำนวณเอง\n\nแฟ้มดวง:\n${ctx}\n\nคำถาม: ${question}` : rewritePrompt(ctx, pro);
    }

    // ---------- เครื่องมือของแอปที่ AI เรียกได้ ----------
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : d; };
    const parseDate = (s) => { const m = String(s || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/); if (!m) throw new Error('รูปแบบวันที่ต้องเป็น YYYY-MM-DD'); return { year: +m[1], month: +m[2], day: +m[3] }; };
    function tools(chart, an, opt) {
        opt = opt || {};
        const yr = (v) => { const y = num(v, NaN); if (!(y >= 1900 && y <= 2150)) throw new Error('ปีต้องอยู่ระหว่าง ค.ศ. 1900–2150'); return y; };
        const list = [
            { name: 'year_reading', description: 'ดวงรายปีของปี ค.ศ. ที่ระบุ: ภาพรวม งาน เงิน ความรัก สุขภาพ เดือนเด่น ไท้ส่วย และดวง 10 ปีที่ครอบปีนั้น',
                inputSchema: { type: 'object', properties: { year: { type: 'integer', description: 'ปี ค.ศ.' } }, required: ['year'] },
                execute: (i) => { const y = yr(i.year); const lp = chart.luck.periods.find((p) => p.start.year <= y && y < p.end.year); const R = Y.judgeFn(chart, an);
                    return yearBrief(chart, an, y) + (lp ? ` · ดวง 10 ปีที่ครอบ: ${lp.pillar.zh} (${dstr(lp.start)} – ${dstr(lp.end)}) ${Y.LEVEL(R(lp.pillar).sum)}` : ''); } },
            { name: 'month_readings', description: 'ดวงรายเดือนทั้ง 12 เดือนของปี ค.ศ. ที่ระบุ (เดือนจีนตามสารท): ระดับดวงและเรื่องที่เหมาะทำ',
                inputSchema: { type: 'object', properties: { year: { type: 'integer' } }, required: ['year'] },
                execute: (i) => { const m = Y.months(chart, an, yr(i.year)); return m.months.map((x) => `${x.label}: ${x.level}${x.clashDay ? ' (ชงวังคู่ครอง)' : ''} · เหมาะ: ${x.good.join(', ') || '—'}`).join('\n'); } },
            { name: 'day_reading', description: 'ดวงรายวันของวันที่ระบุ: ระดับ เหมาะทำ ควรเลี่ยง 4 ด้าน และยามดี',
                inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] },
                execute: (i) => { const d = parseDate(i.date); const x = Y.day(chart, an, d.year, d.month, d.day, false), hs = Y.hours(chart, an, d.year, d.month, d.day).filter((h) => h.from >= 5 && h.to <= 23).sort((a, b) => b.rank - a.rank).slice(0, 3);
                    const off = AL.officer(chart, d.year, d.month, d.day);
                    return `${x.label} (${x.pillar.zh}): ${x.level}${off ? ` · ${off.name} ${off.zh}` : ''} · เหมาะ: ${x.good.join(', ') || '—'} · ควรเลี่ยง: ${x.avoid.join(', ') || '—'} · ` + x.topics.map((t) => `${t.name} ${t.level}`).join(', ') + ` · ยามดี: ${hs.map((h) => `${h.label} ${h.time}`).join(', ')}`; } },
            { name: 'find_auspicious', description: 'หาฤกษ์ตามดวงของคนนี้ ในช่วงไม่เกิน 92 วัน คืน 5 วันที่ดีที่สุดพร้อมยามดี · purpose: contract (เซ็นสัญญา ซื้อบ้าน) business (เปิดร้าน เริ่มธุรกิจ) deal (เจรจา ลงทุน) job (สมัครงาน สอบ ราชการ) move (ย้ายบ้าน เดินทางไกล) wedding (แต่งงาน หมั้น)',
                inputSchema: { type: 'object', properties: { purpose: { type: 'string', enum: AU.PURPOSES.map((p) => p.id) }, from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['purpose', 'from', 'to'] },
                execute: (i) => { const res = AU.find([{ chart, an, name: 'ผู้ถาม' }], String(i.purpose), parseDate(i.from), parseDate(i.to));
                    if (!res.ranked.length) return `ไม่พบวันที่เหมาะสำหรับ${res.purpose.name}ในช่วงนี้ (ตัดวันต้องห้าม ${res.excluded} วัน)`;
                    return `${res.purpose.name} (ตรวจ ${res.days} วัน${res.capped ? ' ตัดเหลือ 92 วัน' : ''}):\n` + res.ranked.map((x) => `- ${x.label} ${x.pillar.zh}: ${x.level} · ${x.offNote || ''} · ยามดี ${x.hours.map((h) => h.time || h.label).join(', ')}`).join('\n'); } },
            { name: 'natal_section', description: 'ข้อความคำทำนายแม่แบบเต็มของหัวข้อพื้นดวง (id: self elements house gods stages career money love health season zodiac)',
                inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
                execute: (i) => { const s = N.natal(chart, an, I.natal(chart)).find((x) => x.id === String(i.id)); if (!s) throw new Error('ไม่พบหัวข้อนี้'); return s.blocks.map(blockText).join('\n'); } }
        ];
        if (opt.saved) {
            list.push({ name: 'saved_charts', description: 'รายชื่อดวงอื่นที่ผู้ใช้บันทึกไว้ในแอป (id ชื่อ วันเกิด) ใช้ก่อนเรียก compatibility',
                execute: () => opt.saved().map((o) => `${o.id}: ${o.name || 'ไม่ระบุชื่อ'} · ${o.date} ${o.time} · ${o.g === 'F' ? 'หญิง' : 'ชาย'}`).join('\n') || 'ยังไม่มีดวงที่บันทึก' });
            list.push({ name: 'compatibility', description: 'ดวงคู่ระหว่างผู้ถามกับดวงที่บันทึกไว้ (ใส่ id จาก saved_charts): คะแนน 6 ด้าน คำทำนาย จังหวะเวลา คำแนะนำ',
                inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
                execute: (i) => { const o = opt.chartOf ? opt.chartOf(String(i.id)) : null; if (!o) throw new Error('ไม่พบดวงนี้');
                    const res = C.compare(chart, o);
                    return `${res.names.join(' กับ ')}: ${res.total}/100 ${res.level}\n` + res.items.map((x) => `- ${x.name} ${x.pts}/${x.max}: ${x.text} · ${x.pred}`).join('\n') +
                        `\nปีดีร่วมกัน: ${res.timing.good.map(([k]) => k).join(', ') || '—'} · ปีที่ควรประคอง: ${res.timing.caution.map(([k]) => k).join(', ') || '—'}\nคำแนะนำ: ${res.advice.join(' · ')}`; } });
        }
        return list;
    }

    // ---------- แสดงผลข้อความ (Markdown แบบย่อ) ----------
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    function md(text) {
        const out = []; let list = false, para = [];
        const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\(ที่มา: ([^)]+)\)/g, '<span class="aisrc">(ที่มา: $1)</span>');
        const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } if (list) { out.push('</ul>'); list = false; } };
        for (const raw of String(text).split('\n')) {
            const l = raw.trim();
            if (!l) { flush(); continue; }
            let m;
            if ((m = l.match(/^#{1,2}\s+(.*)/))) { flush(); out.push(`<h3>${inline(m[1])}</h3>`); }
            else if ((m = l.match(/^#{3,}\s+(.*)/))) { flush(); out.push(`<h4>${inline(m[1])}</h4>`); }
            else if ((m = l.match(/^(?:[-*•]|\d+[.)])\s+(.*)/))) { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(m[1])}</li>`); }
            else { if (list) { out.push('</ul>'); list = false; } para.push(l); }
        }
        flush();
        return out.join('');
    }

    // ---------- ผู้ให้บริการ ----------
    // คืน { name, hasTools, call(input, {onText, signal, tools}) } หรือ null เมื่อเรียก AI จากหน้านี้ไม่ได้
    async function provider() {
        try {
            if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null;
            const sample = await window.claude.use('sample');
            if (!sample) return null;
            let hasTools = false;
            try { const lim = await sample.limits(); hasTools = !!(lim && lim.tools); } catch (e) { hasTools = false; }
            return {
                name: 'Claude', hasTools,
                call: (input, o) => {
                    const opts = { onText: o.onText, signal: o.signal };
                    if (o.tools && hasTools) opts.tools = o.tools;
                    if (o.tools || o.fresh) opts.cache = false;
                    return sample(input, opts);
                }
            };
        } catch (e) { return null; }
    }
    const ERR = {
        not_granted: 'ยังไม่ได้อนุญาตให้หน้านี้ใช้ Claude', sampling_disabled: 'บัญชีนี้ใช้ Claude จากหน้านี้ไม่ได้', rate_limited: 'ใช้งานถี่เกินหรือถึงโควตาแล้ว ลองใหม่ภายหลัง',
        session_expired: 'ต้องเข้าสู่ระบบ claude.ai ใหม่', refused: 'AI ไม่ตอบคำถามนี้ ลองถามแบบอื่น', empty_completion: 'AI ไม่ได้ตอบกลับ ลองใหม่อีกครั้ง',
        prompt_too_large: 'ข้อมูลยาวเกินไป ลองล้างประวัติการถาม', cancelled: 'หยุดแล้ว'
    };
    const errText = (e) => (e && ERR[e.code]) || 'เชื่อมต่อ AI ไม่สำเร็จ ลองใหม่อีกครั้ง';
    // รหัสสำหรับเก็บผลแยกตามดวง
    function keyOf(chart) {
        const i = chart.input || {}, s = JSON.stringify([i.year, i.month, i.day, i.hour, i.minute, i.gender, i.longitude, chart.options]);
        let h = 0; for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0;
        return (h >>> 0).toString(36);
    }
    return { context, rules, rewritePrompt, chatIntro, copyText, tools, md, provider, errText, keyOf };
});
