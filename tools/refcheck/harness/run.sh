#!/bin/sh
# รันตัวเทียบ: อ่านผังจาก stdin บรรทัดละ "ก้านยาม กิ่งยาม ก้านวัน กิ่งวัน ก้านเดือน กิ่งเดือน ก้านปี กิ่งปี [ปี เดือน วัน ชม. นาที]" (เลข 1-based)
# MAIN=H ผลสรุป · MAIN=H2 ผลพร้อมค่าระหว่างทาง
W="$1"
java -XX:+UnlockDiagnosticVMOptions -XX:-BytecodeVerificationRemote -Xss64m -cp "$W/hc:$W/sc:$W/ref.jar" ${MAIN:-H2} 2>&1 | grep -v '^Picked up'
