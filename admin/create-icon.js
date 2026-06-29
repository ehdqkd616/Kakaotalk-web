/**
 * KakaoTalk Web 관리자 아이콘 생성기
 * jimp로 노란 배경 + "K" 픽셀 패턴 → icon.png / icon.ico 출력
 *
 * 사용: node create-icon.js
 */

const Jimp = require('jimp');
const pngToIco = require('png-to-ico');
const path = require('path');
const fs   = require('fs');

const YELLOW = 0xFEE500FF;
const DARK   = 0x3C1E1EFF;
const CLEAR  = 0x00000000;

// 4×6 픽셀 "K" 패턴
const K_PATTERN = [
  [1,0,0,1],
  [1,0,1,0],
  [1,1,0,0],
  [1,1,0,0],
  [1,0,1,0],
  [1,0,0,1],
];

async function drawIcon(size) {
  const img    = await Jimp.create(size, size, CLEAR);
  const radius = Math.round(size * 0.2);

  // 노란 둥근 사각형 배경
  img.scan(0, 0, size, size, function (x, y) {
    const corners = [
      x < radius       && y < radius       && Math.hypot(x - radius,        y - radius)        > radius,
      x >= size-radius && y < radius       && Math.hypot(x - (size-radius), y - radius)        > radius,
      x < radius       && y >= size-radius && Math.hypot(x - radius,        y - (size-radius)) > radius,
      x >= size-radius && y >= size-radius && Math.hypot(x - (size-radius), y - (size-radius)) > radius,
    ];
    if (!corners.some(Boolean)) this.setPixelColor(YELLOW, x, y);
  });

  // "K" 픽셀 그리기 (32px 미만은 생략)
  if (size >= 32) {
    const ps = Math.max(1, Math.round(size * 0.115));
    const kw = 4 * ps;
    const kh = 6 * ps;
    const sx = Math.round((size - kw) / 2);
    const sy = Math.round((size - kh) / 2);

    for (let row = 0; row < K_PATTERN.length; row++) {
      for (let col = 0; col < K_PATTERN[row].length; col++) {
        if (!K_PATTERN[row][col]) continue;
        for (let dy = 0; dy < ps; dy++) {
          for (let dx = 0; dx < ps; dx++) {
            const px = sx + col * ps + dx;
            const py = sy + row * ps + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              img.setPixelColor(DARK, px, py);
            }
          }
        }
      }
    }
  }

  return img;
}

async function main() {
  console.log('아이콘 생성 중...\n');

  // PNG 원본 (256×256)
  const img256 = await drawIcon(256);
  const pngOut = path.join(__dirname, 'icon.png');
  await img256.writeAsync(pngOut);
  console.log('  ✔ icon.png  생성 완료');

  // ICO (16 / 32 / 48 / 256px 멀티 사이즈)
  const sizes    = [16, 32, 48, 256];
  const tmpPaths = [];

  for (const sz of sizes) {
    const img  = await drawIcon(sz);
    const tmp  = path.join(__dirname, `_tmp_${sz}.png`);
    await img.writeAsync(tmp);
    tmpPaths.push(tmp);
  }

  const icoBuffer = await pngToIco(tmpPaths);
  const icoOut    = path.join(__dirname, 'icon.ico');
  fs.writeFileSync(icoOut, icoBuffer);
  console.log('  ✔ icon.ico  생성 완료');

  // 임시 파일 정리
  for (const p of tmpPaths) { try { fs.unlinkSync(p); } catch {} }

  console.log('\n완료! 이제 start.bat으로 관리자를 실행하세요.');
}

main().catch(err => {
  console.error('\n오류 발생:', err.message);
  process.exit(1);
});
