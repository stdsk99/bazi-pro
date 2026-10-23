// สร้าง dist/index.html แบบไฟล์เดียว (ฝังสคริปต์) สำหรับเผยแพร่เป็นหน้าเดียว
const fs = require('fs');
let html = fs.readFileSync(__dirname + '/index.html', 'utf8');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => `<script>\n${fs.readFileSync(__dirname + '/' + f, 'utf8')}\n</script>`);
fs.mkdirSync(__dirname + '/dist', { recursive: true });
fs.writeFileSync(__dirname + '/dist/index.html', html);
console.log('dist/index.html', html.length, 'bytes');
