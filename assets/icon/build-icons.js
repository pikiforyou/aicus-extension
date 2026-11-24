// 확장 아이콘 생성 스크립트 (배포 zip에는 포함하지 않음)
// 사용법: 임시 폴더에서 npm install @resvg/resvg-js@2.6.2 후 node build-icons.js <출력폴더>
// 디자인: 패널 헤더의 나침반 아이콘, 투명 바탕 + 중간 밝기 보라 링(라이트/다크 툴바 모두에서 보이게)
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const out = process.argv[2];
// 크기별 [여백, 나침반 비율]: 128은 웹스토어 권장대로 여백, 작은 크기일수록 나침반을 크게
const svgFor = (margin, compass) => {
  const S = 128, inner = S - margin * 2;
  const scale = inner / 64 * compass; // 나침반 크기 (panel 아이콘 viewBox 64 기준, 작은 크기일수록 크게)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <g transform="translate(64 64) scale(${scale}) translate(-32 -32)">
    <circle cx="32" cy="32" r="28" fill="none" stroke="#8b7cf0" stroke-width="6"/>
    <path fill="#cdc6ff" d="M32 10l5.5 12.8L50 28.5 37.2 34 32 50 26.8 34 14 28.5l12.5-5.7L32 10z"/>
    <path fill="#5b4bc4" d="M36 20 44 34 28 44z"/>
    <circle cx="32" cy="32" r="3" fill="#5b4bc4"/>
  </g>
</svg>`;
};
const sizes = { 16: [0, 1.12], 32: [0, 1.1], 48: [2, 1.08], 128: [8, 0.9] }; // [여백, 나침반 비율]
for (const [size, [margin, compass]] of Object.entries(sizes)) {
  const svg = svgFor(margin, compass);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: Number(size) } }).render().asPng();
  fs.writeFileSync(`${out}/icon-${size}.png`, png);
  if (size === '128') fs.writeFileSync(`${out}/icon.svg`, svg);
}
console.log('ok');
