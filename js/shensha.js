// shensha.js — ดาวพิเศษ (神煞) ชุดแรก 6 ดวง
// ผู้อุปถัมภ์ 天乙贵人 และดาววิชา 文昌 ดูจากดิถี (ราศีบนของเสาวัน)
// ดอกท้อ 桃花 ม้าเดินทาง 驿马 ดาวขุนพล 将星 ดาวหลวง 华盖 ดูจากราศีล่างของเสาปีและเสาวัน ตามกลุ่มไตรภาคี
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BaziShensha = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    // ราศีล่าง: 0 子 1 丑 2 寅 3 卯 4 辰 5 巳 6 午 7 未 8 申 9 酉 10 戌 11 亥
    const GUIREN = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [3, 5], [3, 5]]; // 甲戊庚牛羊 乙己鼠猴 丙丁猪鸡 壬癸兔蛇 辛逢马虎
    const WENCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
    // กลุ่มไตรภาคี: 申子辰=0 寅午戌=1 巳酉丑=2 亥卯未=3
    const TRIO = [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3];
    const TAOHUA = [9, 3, 6, 0], YIMA = [2, 8, 11, 5], JIANG = [0, 6, 9, 3], HUAGAI = [4, 10, 1, 7];
    const STARS = {
        guiren: { zh: '天乙贵人', th: 'ผู้อุปถัมภ์', icon: '🤝', natal: 'มีผู้ใหญ่หรือคนดีคอยช่วยในยามคับขัน', transit: 'มีคนช่วยในจังหวะสำคัญ', act: 'ขอความช่วยเหลือหรือคำแนะนำจากผู้ใหญ่' },
        wenchang: { zh: '文昌', th: 'ดาววิชา', icon: '📚', natal: 'หัวดี เรียนรู้ไว เหมาะกับงานที่ใช้ความรู้', transit: 'สมองแล่น เรียนรู้และจดจำได้ดี', act: 'เรียน สอบ หรือเขียนงานสำคัญ' },
        taohua: { zh: '桃花', th: 'ดอกท้อ', icon: '🌸', natal: 'มีเสน่ห์ เป็นที่ชื่นชอบของคนรอบตัว', transit: 'มีเสน่ห์ เหมาะพบปะผู้คนและเรื่องความรัก', act: 'พบปะผู้คน นัดเดต หรืองานที่ต้องใช้เสน่ห์' },
        yima: { zh: '驿马', th: 'ม้าเดินทาง', icon: '🐎', natal: 'ชอบเดินทาง ชีวิตมีความเคลื่อนไหวและเปลี่ยนแปลงบ่อย', transit: 'มีการเดินทางหรือความเปลี่ยนแปลงเข้ามา', act: 'เดินทาง ติดต่องานนอกสถานที่ หรือมองหาโอกาสใหม่' },
        jiang: { zh: '将星', th: 'ดาวขุนพล', icon: '🎖️', natal: 'มีภาวะผู้นำ คนรอบตัวยอมรับ', transit: 'มีบทบาทนำ คนรอบตัวพร้อมฟัง', act: 'รับบทนำหรือคุมทีม' },
        huagai: { zh: '华盖', th: 'ดาวหลวง', icon: '🪷', natal: 'ฉลาดลึก สนใจศาสนา ปรัชญา หรือศิลปะ บางครั้งชอบอยู่คนเดียว', transit: 'ใจสงบ เหมาะกับการศึกษาเรื่องลึกและงานศิลปะ', act: 'ทำบุญ ทำสมาธิ หรือศึกษาเรื่องที่สนใจ' }
    };
    const ORDER = ['guiren', 'wenchang', 'taohua', 'yima', 'jiang', 'huagai'];
    // ดาวที่ราศีล่าง br ทำให้เกิด เมื่อเทียบกับดวงนี้ · ตอบเป็นรายการ { id, by: ['ดิถี'|'ปีเกิด'|'วันเกิด'] }
    function hits(chart, br) {
        const P = chart.pillars, ds = P.day.stem, out = {};
        const add = (id, by) => { (out[id] = out[id] || []).push(by); };
        if (GUIREN[ds].includes(br)) add('guiren', 'ดิถี');
        if (WENCHANG[ds] === br) add('wenchang', 'ดิถี');
        for (const [ref, lab] of [[P.year.branch, 'ปีเกิด'], [P.day.branch, 'วันเกิด']]) {
            const t = TRIO[ref];
            if (TAOHUA[t] === br) add('taohua', lab);
            if (YIMA[t] === br) add('yima', lab);
            if (JIANG[t] === br) add('jiang', lab);
            if (HUAGAI[t] === br) add('huagai', lab);
        }
        return ORDER.filter((k) => out[k]).map((k) => Object.assign({ id: k, by: [...new Set(out[k])] }, STARS[k]));
    }
    // ดาวในดวงเดิม: ไล่ราศีล่างของเสาปี เดือน วัน ยาม (ดาวที่อ้างจากเสาใด จะไม่นับเสานั้นเอง)
    function natal(chart) {
        const P = chart.pillars, LAB = { year: 'เสาปี', month: 'เสาเดือน', day: 'เสาวัน', hour: 'เสายาม' }, out = {};
        for (const k of ['year', 'month', 'day', 'hour']) {
            for (const h of hits(chart, P[k].branch)) {
                const by = h.by.filter((b) => !((b === 'ปีเกิด' && k === 'year') || (b === 'วันเกิด' && k === 'day')));
                if (!by.length) continue;
                (out[h.id] = out[h.id] || { at: [] }).at.push(LAB[k]);
            }
        }
        return ORDER.filter((k) => out[k]).map((k) => Object.assign({ id: k, at: [...new Set(out[k].at)] }, STARS[k]));
    }
    return { hits, natal, STARS, ORDER };
});
