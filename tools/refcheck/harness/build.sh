#!/bin/sh
# สร้างตัวเทียบจากไฟล์ APK ของระบบอ้างอิง (ไม่เก็บ APK และไฟล์ที่ถอดได้ไว้ใน repo)
# ใช้: REF_PKG=<ชื่อแพ็กเกจ เช่น com.example.app> ./build.sh /path/to/app.apk /path/to/workdir
# ต้องมี: java 17+, python3, dex2jar (ตั้ง D2J=/path/to/d2j-dex2jar.sh)
set -e
APK="$1"; W="$2"; HERE="$(cd "$(dirname "$0")" && pwd)"
[ -n "$REF_PKG" ] || { echo "ตั้งค่า REF_PKG ก่อน"; exit 1; }
PKGP=$(echo "$REF_PKG" | tr . /)
mkdir -p "$W" && cd "$W"
sh "${D2J:-d2j-dex2jar.sh}" -f -o ref.jar "$APK"
rm -rf cls && mkdir cls && (cd cls && unzip -q ../ref.jar "$PKGP/*")
ls cls/$PKGP/ExMain*.class cls/$PKGP/PopClass*.class cls/$PKGP/XSart*.class cls/$PKGP/AstronomyClass*.class | sed 's#^cls/##' > cls.txt
(cd cls && xargs -a ../cls.txt -n40 javap -c -p > ../javap.txt 2>/dev/null)
rm -rf stub sc hc h && mkdir sc hc h
python3 "$HERE/genstub.py" javap.txt stub "$PKGP"
sed -i '/xmlpull/d' stub/android/util/Xml.java
printf 'package android.os;\npublic interface Parcelable { public interface Creator<T> {} }\n' > stub/android/os/Parcelable.java
for f in "$HERE"/*.java.in; do sed "s/__REFPKG__/$REF_PKG/g" "$f" > "h/$(basename "$f" .in)"; done
javac -nowarn -cp ref.jar -d sc $(find stub -name '*.java')
javac -cp sc:ref.jar -d hc h/*.java
echo "พร้อมใช้: MAIN=H2 $HERE/run.sh $W < input.txt"
