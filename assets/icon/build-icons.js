// 확장 아이콘 생성 스크립트 (배포 zip에는 포함하지 않음)
// 사용법: 임시 폴더에서 npm install @resvg/resvg-js@2.6.2 후 node build-icons.js <출력폴더>
// 디자인: 패널 헤더의 나침반 아이콘 + 상품 이미지 배경색(보라 그라데이션), 128은 웹스토어 권장대로 여백 8px
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const out = process.argv[2];
// size → margin around rounded square (128은 웹스토어 권장대로 여백)
const svgFor = (margin) => {
  const S = 128, inner = S - margin * 2, r = inner * 0.24;
  const scale = inner / 64 * 0.78; // 나침반 크기 (panel 아이콘 viewBox 64 기준)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6a7fe8"/>
      <stop offset="1" stop-color="#7b52b4"/>
    </linearGradient>
  </defs>
  <rect x="${margin}" y="${margin}" width="${inner}" height="${inner}" rx="${r}" fill="url(#bg)"/>
  <g transform="translate(64 64) scale(${scale}) translate(-32 -32)">
    <circle cx="32" cy="32" r="28" fill="none" stroke="#ffffff" stroke-width="6"/>
    <path fill="#ffe08a" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
    <path fill="#4b3d8f" d="M36 20 44 34 28 44z"/>
    <circle cx="32" cy="32" r="3" fill="#4b3d8f"/>
  </g>
</svg>`;
};
const sizes = { 16: 0, 32: 0, 48: 2, 128: 8 };
for (const [size, margin] of Object.entries(sizes)) {
  const svg = svgFor(margin);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: Number(size) } }).render().asPng();
  fs.writeFileSync(`${out}/icon-${size}.png`, png);
  if (size === '128') fs.writeFileSync(`${out}/icon.svg`, svg);
}
console.log('ok');
