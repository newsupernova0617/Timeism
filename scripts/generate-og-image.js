#!/usr/bin/env node

/**
 * OG Image Generator for Timeism
 *
 * This script generates Open Graph images for social media sharing.
 * Requires: canvas or sharp library
 *
 * Usage: node scripts/generate-og-image.js
 */

const fs = require('fs');
const path = require('path');

// Check if the script needs dependencies
console.log(`
╔════════════════════════════════════════════════════════════════╗
║         OG Image Generation Guide for Timeism                 ║
╚════════════════════════════════════════════════════════════════╝

사용 가능한 방법:

1) ⭐ 권장: Figma, Canva, Adobe Express 등을 사용하여
   1200x630 픽셀의 이미지를 생성합니다.

   필수 요소:
   - 최소 1200x630px (권장: 1200x630px)
   - 포맷: PNG, JPG (JPG는 파일 크기가 작음)
   - 텍스트: "Timeism - 서버 시간 비교 서비스"
   - 배경: 프로젝트 테마 색상 (#1f3c88 또는 밝은 파란색)
   - 주요 정보: NTP, 시간 비교, 티켓팅 등의 키워드

2) 프로그래밍 방식 (Node.js):
   - sharp 라이브러리 사용:
     npm install sharp

   예시 코드:
   \`\`\`javascript
   const sharp = require('sharp');

   const svg = \`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
     <rect width="1200" height="630" fill="#1f3c88"/>
     <text x="600" y="315" font-size="72" font-weight="bold"
           fill="white" text-anchor="middle" dominant-baseline="middle">
       Timeism
     </text>
     <text x="600" y="400" font-size="36" fill="#e0e0e0"
           text-anchor="middle" dominant-baseline="middle">
       서버 시간 비교 서비스
     </text>
   </svg>\`;

   sharp(Buffer.from(svg))
     .png()
     .toFile('public/og-image.png')
     .then(() => console.log('OG image created!'));
   \`\`\`

3) 온라인 도구:
   - https://www.remove.bg/tools/og-image-generator
   - https://www.canva.com/ (유료 기능 일부 필요)
   - https://figma.com

최종 단계:
- public/og-image.png 경로에 이미지 저장
- 파일 크기: 최대 100KB 권장
- 포맷: PNG 또는 JPG

이미지 체크리스트:
✓ 1200x630 픽셀
✓ 명확한 로고/브랜드 표시
✓ 주요 메시지 포함
✓ 색상 대비 우수
✓ 텍스트 가독성 좋음

배포 후:
- 생성된 이미지를 public/og-image.png에 저장
- 환경 변수의 DOMAIN을 실제 도메인으로 설정
- SNS 공유 링크로 테스트 (Facebook Share Debugger, Twitter Card Validator)
`);

// Create placeholder if image doesn't exist
const imagePath = path.join(__dirname, '../public/og-image.png');
if (!fs.existsSync(imagePath)) {
  console.log('\n⚠️  현재 public/og-image.png가 존재하지 않습니다.');
  console.log('위의 방법 중 하나를 선택하여 이미지를 생성해주세요.\n');
}
