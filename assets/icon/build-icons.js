// 확장 아이콘 생성 스크립트 (배포 zip에는 포함하지 않음)
// 사용법: 임시 폴더에서 npm install @resvg/resvg-js@2.6.2 후 node build-icons.js <출력폴더>
// 디자인: 패널 헤더의 나침반 아이콘, 흰 바탕 + 보라 링(툴바에서 잘 보이게), 128은 웹스토어 권장대로 여백 8px
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const out = process.argv[2];
// size → margin around rounded square (128은 웹스토어 권장대로 여백)
const svgFor = (margin, compass) => {
  const S = 128, inner = S - margin * 2, r = inner * 0.24;
  const scale = inner / 64 * compass; // 나침반 크기 (panel 아이콘 viewBox 64 기준, 작은 크기일수록 크게)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6a7fe8"/>
      <stop offset="1" stop-color="#7b52b4"/>
    </linearGradient>
  </defs>
  <rect x="${margin + 1}" y="${margin + 1}" width="${inner - 2}" height="${inner - 2}" rx="${r}" fill="#ffffff" stroke="#e4defa" stroke-width="2"/>
  <g transform="translate(64 64) scale(${scale}) translate(-32 -32)">
    <circle cx="32" cy="32" r="28" fill="none" stroke="#6c5ce0" stroke-width="6"/>
    <path fill="#b9b0f2" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
    <path fill="#4b3d8f" d="M36 20 44 34 28 44z"/>
    <circle cx="32" cy="32" r="3" fill="#4b3d8f"/>
  </g>
</svg>`;
};
const sizes = { 16: [0, 0.98], 32: [0, 0.9], 48: [2, 0.86], 128: [8, 0.8] }; // [여백, 나침반 비율]
for (const [size, [margin, compass]] of Object.entries(sizes)) {
  const svg = svgFor(margin, compass);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: Number(size) } }).render().asPng();
  fs.writeFileSync(`${out}/icon-${size}.png`, png);
  if (size === '128') fs.writeFileSync(`${out}/icon.svg`, svg);
}
console.log('ok');
