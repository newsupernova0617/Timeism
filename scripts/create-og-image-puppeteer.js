#!/usr/bin/env node

/**
 * Generate OG Image using Puppeteer
 * Puppeteer는 Chromium을 사용하여 한글을 완벽하게 렌더링합니다
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const width = 1200;
const height = 630;
const outputPath = path.join(__dirname, '../public/og-image.png');

// Create output directory if it doesn't exist
const publicDir = path.dirname(outputPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// HTML content for OG image
const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(135deg, #1f3c88 0%, #0d1f47 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      overflow: hidden;
    }

    /* Decorative circles */
    .circle-1 {
      position: absolute;
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      top: 50px;
      left: 50px;
    }

    .circle-2 {
      position: absolute;
      width: 160px;
      height: 160px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 50%;
      bottom: 50px;
      right: 50px;
    }

    .container {
      position: relative;
      z-index: 10;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 20px;
    }

    .title {
      font-size: 96px;
      font-weight: 700;
      color: white;
      margin-bottom: 20px;
      letter-spacing: 2px;
    }

    .subtitle {
      font-size: 48px;
      color: #e0e0e0;
      margin-bottom: 40px;
      font-weight: 400;
      letter-spacing: 1px;
    }

    .description {
      font-size: 32px;
      color: #b0b0b0;
      margin-bottom: 60px;
      font-weight: 400;
    }

    .divider {
      width: 80%;
      height: 2px;
      background: rgba(255, 255, 255, 0.3);
      margin-bottom: 40px;
    }

    .keywords {
      font-size: 24px;
      color: #a0a0a0;
      font-weight: 400;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="circle-1"></div>
  <div class="circle-2"></div>

  <div class="container">
    <div class="title">Timeism</div>
    <div class="subtitle">서버 시간 비교 서비스</div>
    <div class="description">정확한 시간으로 티켓팅을 준비하세요</div>
    <div class="divider"></div>
    <div class="keywords">NTP 동기화 • HTTP Date 측정 • 수강신청 • 한정판 구매</div>
  </div>
</body>
</html>
`;

(async () => {
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Create page
    const page = await browser.newPage();

    // Set viewport to exact dimensions
    await page.setViewport({
      width: width,
      height: height,
      deviceScaleFactor: 1
    });

    // Set content
    await page.setContent(html);

    // Wait for content to render
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false
    });

    // Close browser
    await browser.close();

    const fileSize = fs.statSync(outputPath).size;
    console.log('✅ OG Image created successfully with Puppeteer!');
    console.log(`   Location: ${outputPath}`);
    console.log(`   Size: ${(fileSize / 1024).toFixed(2)}KB`);
    console.log(`   Dimensions: ${width}x${height}px`);
    console.log('\n✨ 한글이 완벽하게 렌더링됩니다!');

  } catch (err) {
    console.error('❌ Error creating OG image:', err.message);
    console.error('\n💡 Puppeteer 렌더링 실패. 다음 방법을 시도하세요:');
    console.error('   1. 온라인 도구 사용: https://www.canva.com');
    console.error('   2. 이미지 편집기 사용: Photoshop, GIMP, Figma');
    console.error('   3. 가이드 보기: npm run og:guide');
    process.exit(1);
  }
})();
