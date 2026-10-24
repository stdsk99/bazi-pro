// store.js — เก็บดวงที่บันทึกไว้ใน localStorage ของเบราว์เซอร์ (ยังไม่มีฐานข้อมูลออนไลน์)
// ถ้าวันหลังย้ายไปฐานข้อมูลจริง แก้เฉพาะไฟล์นี้ ส่วนอื่นเรียกผ่านฟังก์ชันเดิม
// ระเบียน: { id, name, date: 'YYYY-MM-DD', time: 'HH:MM', g: 'M'|'F', place, mine: true|undefined }
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory;
    else root.BaziStore = factory(root.localStorage);
})(typeof self !== 'undefined' ? self : this, function (storage) {
    'use strict';
    const KEY = 'bazi.saved', CUR = 'bazi.cur';
    const read = () => { try { const v = JSON.parse(storage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(valid) : []; } catch (e) { return []; } };
    const write = (l) => { try { storage.setItem(KEY, JSON.stringify(l)); return true; } catch (e) { return false; } };
    const valid = (o) => o && typeof o === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(o.date || '') && /^\d{2}:\d{2}$/.test(o.time || '') && (o.g === 'M' || o.g === 'F');
    const same = (a, b) => a.date === b.date && a.time === b.time && a.g === b.g;
    const clean = (o) => ({ id: String(o.id || Date.now() + Math.random().toString(36).slice(2, 6)), name: String(o.name || '').trim().slice(0, 60), date: o.date, time: o.time, g: o.g, place: o.place != null ? String(o.place) : '100.5', mine: o.mine ? true : undefined });

    const api = {
        list: () => { const l = read(); return l.filter((o) => o.mine).concat(l.filter((o) => !o.mine)); },
        get: (id) => read().find((o) => o.id === id) || null,
        find: (rec) => read().find((o) => same(o, rec)) || null,
        mine: () => read().find((o) => o.mine) || null,
        // บันทึก: ถ้าวันเวลาเกิดและเพศตรงกับที่มีอยู่ = อัปเดต · mine: true ตั้งเป็นดวงของฉัน (มีได้ดวงเดียว)
        save: (rec, opts) => {
            if (!valid(rec)) return { ok: false };
            const l = read(), mine = opts && opts.mine;
            let o = (rec.id && l.find((x) => x.id === rec.id)) || l.find((x) => same(x, rec));
            const created = !o;
            if (o) Object.assign(o, clean(Object.assign({}, o, rec, { id: o.id, mine: o.mine })));
            else { o = clean(rec); l.push(o); }
            if (mine) { l.forEach((x) => { delete x.mine; }); o.mine = true; }
            return { ok: write(l.map(clean)), created, rec: o };
        },
        setMine: (id) => { const l = read(); if (!l.some((x) => x.id === id)) return false; l.forEach((x) => { if (x.id === id) x.mine = true; else delete x.mine; }); return write(l.map(clean)); },
        remove: (id) => write(read().filter((o) => o.id !== id)),
        // สำรองเป็นไฟล์ / นำเข้าจากไฟล์ (รวมกับของเดิม ดวงที่ซ้ำจะอัปเดต)
        exportText: () => JSON.stringify({ app: 'bazi-pro', version: 1, exported: new Date().toISOString(), charts: read() }, null, 2),
        importText: (text) => {
            let data; try { data = JSON.parse(text); } catch (e) { return { ok: false, error: 'ไฟล์ไม่ใช่ JSON' }; }
            const arr = Array.isArray(data) ? data : data && Array.isArray(data.charts) ? data.charts : null;
            if (!arr) return { ok: false, error: 'ไม่พบรายชื่อดวงในไฟล์' };
            const l = read(); let added = 0, updated = 0, skipped = 0;
            const hasMine = l.some((x) => x.mine);
            for (const r of arr) {
                if (!valid(r)) { skipped++; continue; }
                const o = l.find((x) => same(x, r));
                if (o) { o.name = String(r.name || o.name || '').trim(); if (r.place != null) o.place = String(r.place); updated++; }
                else { const n = clean(Object.assign({}, r, { id: undefined, mine: !hasMine && r.mine })); l.push(n); added++; }
            }
            if (l.filter((x) => x.mine).length > 1) { let seen = false; l.forEach((x) => { if (x.mine) { if (seen) delete x.mine; seen = true; } }); }
            return { ok: write(l.map(clean)), added, updated, skipped };
        },
        // ดวงที่เปิดดูล่าสุด
        getCur: () => { try { return JSON.parse(storage.getItem(CUR) || 'null'); } catch (e) { return null; } },
        setCur: (rec) => { try { storage.setItem(CUR, JSON.stringify(rec)); } catch (e) {} }
    };
    return api;
});
