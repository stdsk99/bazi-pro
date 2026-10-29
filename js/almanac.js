// almanac.js — ปฏิทินจีนพื้นฐาน: 12 เทพประจำวัน (建除十二神) และกงหวั่ง (空亡 旬空)
// 12 เทพประจำวัน: วันที่ราศีล่างตรงกับราศีล่างของเดือน (นับเดือนตามสารทต้นเดือน 节) คือวันเจี้ยน 建 แล้วไล่ตามลำดับ
// กลุ่มดี/ร้าย ตามคำกลอนมาตรฐาน 建满平收黑 除危定执黄 成开皆可用 闭破不相当
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BaziAlmanac = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    // tone: 1 ใช้ได้ดี · 0 กลาง (กลุ่มดำ) · -1 ไม่ควรใช้
    const OFFICERS = [
        { zh: '建', th: 'เจี้ยน', name: 'วันตั้ง', tone: 0, good: 'เริ่มวางแผน พบผู้ใหญ่ ยื่นเรื่อง เดินทางระยะสั้น', bad: 'ขุดดิน ลงเสาเข็ม ย้ายบ้าน' },
        { zh: '除', th: 'ฉู', name: 'วันขจัด', tone: 1, good: 'ทำความสะอาด เคลียร์ของเก่า รักษาตัว ปลดหนี้', bad: 'งานแต่งงาน งานฉลองใหญ่' },
        { zh: '满', th: 'หม่าน', name: 'วันเต็ม', tone: 0, good: 'เปิดร้าน ทำบุญ ฉลอง เก็บเกี่ยวผล', bad: 'รับตำแหน่ง ฟ้องร้อง' },
        { zh: '平', th: 'ผิง', name: 'วันราบ', tone: 0, good: 'ซ่อมแซม ปรับปรุง ไกล่เกลี่ย งานประจำ', bad: 'เปิดกิจการ งานสำคัญที่ต้องการแรงส่ง' },
        { zh: '定', th: 'ติ้ง', name: 'วันมั่นคง', tone: 1, good: 'แต่งงาน เซ็นสัญญา ซื้อทรัพย์สิน งานระยะยาว', bad: 'ฟ้องร้อง เดินทางไกล' },
        { zh: '执', th: 'จื๋อ', name: 'วันยึดมั่น', tone: 1, good: 'จัดระเบียบ ตามหนี้ เริ่มก่อสร้าง ทำสัญญา', bad: 'ย้ายบ้าน เดินทางไกล' },
        { zh: '破', th: 'พั่ว', name: 'วันแตก', tone: -1, good: 'รื้อถอน รักษาโรค ทำลายของเก่า', bad: 'งานมงคลทุกอย่าง เปิดร้าน เซ็นสัญญา แต่งงาน' },
        { zh: '危', th: 'เหวย', name: 'วันเสี่ยง', tone: 1, good: 'ทำบุญ งานที่ต้องระมัดระวัง', bad: 'ขึ้นที่สูง เดินทางทางน้ำ ลงทุนเสี่ยง' },
        { zh: '成', th: 'เฉิง', name: 'วันสำเร็จ', tone: 1, good: 'เกือบทุกเรื่อง เปิดร้าน แต่งงาน เซ็นสัญญา ย้ายบ้าน เริ่มงาน', bad: 'ฟ้องร้อง' },
        { zh: '收', th: 'โซว', name: 'วันเก็บ', tone: 0, good: 'เก็บเงิน ตามหนี้ ซื้อของเข้าคลัง', bad: 'เริ่มงานใหม่ เดินทางไกล งานศพ' },
        { zh: '开', th: 'ไค', name: 'วันเปิด', tone: 1, good: 'เปิดร้าน เริ่มงาน เรียน แต่งงาน ย้ายเข้าบ้าน', bad: 'ขุดดิน งานศพ' },
        { zh: '闭', th: 'ปี้', name: 'วันปิด', tone: -1, good: 'เก็บรักษา ปิดบัญชี พักผ่อน', bad: 'เปิดร้าน เริ่มงาน เดินทาง ผ่าตัด' }
    ];
    // ราศีล่างของเดือนที่ครอบวันนั้น (เวลาเที่ยงวัน) จากเดือนจรของผังนี้
    function monthPillar(chart, y, m, d) {
        const t = new Date(y, m - 1, d, 12).getTime(), at = (o) => new Date(o.year, o.month - 1, o.day, o.hour, o.minute).getTime();
        for (const yy of [y, y + 1]) { const f = chart.monthly(yy).find((x) => at(x.start) <= t && t < at(x.end)); if (f) return f.pillar; }
        return null;
    }
    function officer(chart, y, m, d) {
        const mp = monthPillar(chart, y, m, d), db = chart.daily(y, m, d).pillar.branch;
        if (!mp) return null;
        const i = (db - mp.branch + 12) % 12;
        return Object.assign({ index: i, monthBranch: mp.branch }, OFFICERS[i]);
    }
    // เทพประจำวันที่เหมาะ (+) และต้องห้าม (ตัดออก) ของแต่ละเรื่องในหาฤกษ์
    const PURPOSE = {
        contract: { plus: ['定', '成', '执', '开'], block: ['破', '闭'] },
        business: { plus: ['开', '成', '满'], block: ['破', '闭'] },
        deal: { plus: ['成', '定', '收', '执'], block: ['破', '闭'] },
        job: { plus: ['开', '成', '定'], block: ['破', '闭'] },
        move: { plus: ['成', '开', '定'], block: ['破', '闭', '危'] },
        wedding: { plus: ['成', '定', '开'], block: ['破', '闭', '危'] }
    };
    // กงหวั่ง: ราศีล่าง 2 ตัวที่ว่างในรอบ 10 วัน (旬) ของเสานั้น
    const kong = (p) => { const s = ((p.branch - p.stem) % 12 + 12) % 12; return [(s + 10) % 12, (s + 11) % 12]; };
    const KONG_PILLAR = { year: 'เรื่องครอบครัวเดิมและญาติผู้ใหญ่ มักห่างหรือพึ่งพาได้น้อย ต้องสร้างฐานด้วยตัวเอง', month: 'เรื่องพี่น้องและที่ทำงาน ความช่วยเหลือมักไม่เต็มที่ ต้องพึ่งฝีมือของตัวเอง', hour: 'เรื่องลูกและบั้นปลาย ควรวางแผนการเงินและที่พึ่งยามแก่ไว้แต่เนิ่นๆ' };
    // กงหวั่งของดวง (ดูจากเสาวัน) และเสาเดิมที่ตกกงหวั่ง
    function natalKong(chart) {
        const P = chart.pillars, k = kong(P.day), LAB = { year: 'เสาปี', month: 'เสาเดือน', hour: 'เสายาม' };
        const hits = ['year', 'month', 'hour'].filter((x) => k.includes(P[x].branch)).map((x) => ({ key: x, label: LAB[x], text: KONG_PILLAR[x] }));
        return { branches: k, hits };
    }
    const isKong = (chart, branch) => kong(chart.pillars.day).includes(branch);
    return { OFFICERS, officer, monthPillar, PURPOSE, kong, natalKong, isKong };
});
