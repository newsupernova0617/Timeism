# SEO 검증 스크립트
# 배포 후 실행하여 SEO 설정이 올바른지 확인합니다.

$DOMAIN = "https://timeism.keero.site"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  SEO 검증 스크립트" -ForegroundColor Cyan
Write-Host "  Domain: $DOMAIN" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 테스트 결과 저장
$results = @()

# 1. robots.txt 검증
Write-Host "[1/5] robots.txt 검증 중..." -ForegroundColor Yellow
try {
    $robotsTxt = Invoke-WebRequest -Uri "$DOMAIN/robots.txt" -UseBasicParsing
    $robotsContent = $robotsTxt.Content
    
    if ($robotsContent -match "Sitemap: $DOMAIN/sitemap.xml") {
        Write-Host "  ✅ robots.txt Sitemap URL 정상" -ForegroundColor Green
        $results += "✅ robots.txt Sitemap"
    } else {
        Write-Host "  ❌ robots.txt Sitemap URL 오류" -ForegroundColor Red
        Write-Host "     현재: $($robotsContent | Select-String 'Sitemap')" -ForegroundColor Red
        $results += "❌ robots.txt Sitemap"
    }
} catch {
    Write-Host "  ❌ robots.txt 접근 실패: $_" -ForegroundColor Red
    $results += "❌ robots.txt 접근 실패"
}
Write-Host ""

# 2. sitemap.xml 검증
Write-Host "[2/5] sitemap.xml 검증 중..." -ForegroundColor Yellow
try {
    $sitemap = Invoke-WebRequest -Uri "$DOMAIN/sitemap.xml" -UseBasicParsing
    $sitemapContent = $sitemap.Content
    
    if ($sitemapContent -match "<loc>$DOMAIN/</loc>") {
        Write-Host "  ✅ sitemap.xml URL 정상" -ForegroundColor Green
        $results += "✅ sitemap.xml URLs"
    } else {
        Write-Host "  ❌ sitemap.xml URL 오류" -ForegroundColor Red
        Write-Host "     내용: $($sitemapContent | Select-String '<loc>')" -ForegroundColor Red
        $results += "❌ sitemap.xml URLs"
    }
    
    # URL 개수 확인
    $urlCount = ([regex]::Matches($sitemapContent, "<url>")).Count
    Write-Host "  📊 Sitemap에 포함된 URL: $urlCount개" -ForegroundColor Cyan
} catch {
    Write-Host "  ❌ sitemap.xml 접근 실패: $_" -ForegroundColor Red
    $results += "❌ sitemap.xml 접근 실패"
}
Write-Host ""

# 3. 홈페이지 메타 태그 검증
Write-Host "[3/5] 홈페이지 메타 태그 검증 중..." -ForegroundColor Yellow
try {
    $homepage = Invoke-WebRequest -Uri "$DOMAIN/" -UseBasicParsing
    $htmlContent = $homepage.Content
    
    $checks = @{
        "og:url" = $htmlContent -match "og:url.*content=`"$DOMAIN/`""
        "canonical" = $htmlContent -match "canonical.*href=`"$DOMAIN/`""
        "og:image" = $htmlContent -match "og:image.*content=`"$DOMAIN/og-image.png`""
        "JSON-LD" = $htmlContent -match "application/ld\+json"
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Host "  ✅ $($check.Key) 정상" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($check.Key) 누락 또는 오류" -ForegroundColor Red
        }
    }
    
    if ($checks.Values -notcontains $false) {
        $results += "✅ 홈페이지 메타 태그"
    } else {
        $results += "⚠️ 홈페이지 메타 태그 일부 오류"
    }
} catch {
    Write-Host "  ❌ 홈페이지 접근 실패: $_" -ForegroundColor Red
    $results += "❌ 홈페이지 접근 실패"
}
Write-Host ""

# 4. Guide 페이지 검증
Write-Host "[4/5] Guide 페이지 검증 중..." -ForegroundColor Yellow
try {
    $guide = Invoke-WebRequest -Uri "$DOMAIN/guide" -UseBasicParsing
    $guideContent = $guide.Content
    
    if ($guideContent -match "FAQPage") {
        Write-Host "  ✅ FAQPage 스키마 정상" -ForegroundColor Green
        $results += "✅ Guide 페이지"
    } else {
        Write-Host "  ❌ FAQPage 스키마 누락" -ForegroundColor Red
        $results += "❌ Guide 페이지 스키마"
    }
} catch {
    Write-Host "  ❌ Guide 페이지 접근 실패: $_" -ForegroundColor Red
    $results += "❌ Guide 페이지 접근 실패"
}
Write-Host ""

# 5. HTTPS 확인
Write-Host "[5/5] HTTPS 설정 확인 중..." -ForegroundColor Yellow
if ($DOMAIN -match "^https://") {
    Write-Host "  ✅ HTTPS 사용 중" -ForegroundColor Green
    $results += "✅ HTTPS"
} else {
    Write-Host "  ⚠️ HTTP 사용 중 (HTTPS 권장)" -ForegroundColor Yellow
    $results += "⚠️ HTTP 사용"
}
Write-Host ""

# 최종 결과
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  검증 결과 요약" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
foreach ($result in $results) {
    Write-Host "  $result"
}
Write-Host ""

# 성공/실패 카운트
$successCount = ($results | Where-Object { $_ -match "^✅" }).Count
$totalCount = $results.Count
$percentage = [math]::Round(($successCount / $totalCount) * 100, 2)

Write-Host "성공률: $successCount/$totalCount ($percentage%)" -ForegroundColor $(if ($percentage -ge 80) { "Green" } elseif ($percentage -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

# 다음 단계 안내
if ($percentage -lt 100) {
    Write-Host "🔧 다음 단계:" -ForegroundColor Yellow
    Write-Host "1. 배포 플랫폼에서 DOMAIN 환경변수 확인" -ForegroundColor White
    Write-Host "   DOMAIN=https://timeism.keero.site" -ForegroundColor Gray
    Write-Host "2. 앱 재시작 후 다시 이 스크립트 실행" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "🎉 모든 SEO 설정이 정상입니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 다음 단계:" -ForegroundColor Cyan
    Write-Host "1. Google Search Console 등록" -ForegroundColor White
    Write-Host "   https://search.google.com/search-console" -ForegroundColor Gray
    Write-Host "2. Sitemap 제출: sitemap.xml" -ForegroundColor White
    Write-Host "3. Rich Results Test 실행" -ForegroundColor White
    Write-Host "   https://search.google.com/test/rich-results" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "상세 분석 도구:" -ForegroundColor Cyan
Write-Host "  - Rich Results: https://search.google.com/test/rich-results?url=$DOMAIN" -ForegroundColor Gray
Write-Host "  - PageSpeed: https://pagespeed.web.dev/analysis?url=$DOMAIN" -ForegroundColor Gray
Write-Host "  - Mobile-Friendly: https://search.google.com/test/mobile-friendly?url=$DOMAIN" -ForegroundColor Gray
Write-Host ""
