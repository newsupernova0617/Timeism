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
$robotsTxt = Invoke-WebRequest -Uri "$DOMAIN/robots.txt" -UseBasicParsing -ErrorAction SilentlyContinue
if ($robotsTxt) {
    $robotsContent = $robotsTxt.Content
    
    if ($robotsContent -match "Sitemap: $DOMAIN/sitemap.xml") {
        Write-Host "  OK robots.txt Sitemap URL 정상" -ForegroundColor Green
        $results += "OK robots.txt Sitemap"
    } else {
        Write-Host "  FAIL robots.txt Sitemap URL 오류" -ForegroundColor Red
        $sitemapLine = $robotsContent -split "`n" | Where-Object { $_ -match "Sitemap" }
        Write-Host "     현재: $sitemapLine" -ForegroundColor Red
        $results += "FAIL robots.txt Sitemap"
    }
} else {
    Write-Host "  FAIL robots.txt 접근 실패" -ForegroundColor Red
    $results += "FAIL robots.txt 접근 실패"
}
Write-Host ""

# 2. sitemap.xml 검증
Write-Host "[2/5] sitemap.xml 검증 중..." -ForegroundColor Yellow
$sitemap = Invoke-WebRequest -Uri "$DOMAIN/sitemap.xml" -UseBasicParsing -ErrorAction SilentlyContinue
if ($sitemap) {
    $sitemapContent = $sitemap.Content
    
    if ($sitemapContent -match "<loc>$DOMAIN/</loc>") {
        Write-Host "  OK sitemap.xml URL 정상" -ForegroundColor Green
        $results += "OK sitemap.xml URLs"
    } else {
        Write-Host "  FAIL sitemap.xml URL 오류" -ForegroundColor Red
        $locLines = $sitemapContent -split "`n" | Where-Object { $_ -match "<loc>" } | Select-Object -First 3
        foreach ($line in $locLines) {
            Write-Host "     $($line.Trim())" -ForegroundColor Red
        }
        $results += "FAIL sitemap.xml URLs"
    }
    
    # URL 개수 확인
    $urlCount = ([regex]::Matches($sitemapContent, "<url>")).Count
    Write-Host "  INFO Sitemap에 포함된 URL: $urlCount개" -ForegroundColor Cyan
} else {
    Write-Host "  FAIL sitemap.xml 접근 실패" -ForegroundColor Red
    $results += "FAIL sitemap.xml 접근 실패"
}
Write-Host ""

# 3. 홈페이지 메타 태그 검증
Write-Host "[3/5] 홈페이지 메타 태그 검증 중..." -ForegroundColor Yellow
$homepage = Invoke-WebRequest -Uri "$DOMAIN/" -UseBasicParsing -ErrorAction SilentlyContinue
if ($homepage) {
    $htmlContent = $homepage.Content
    
    $ogUrlCheck = $htmlContent -match "og:url.*content=.*$DOMAIN/"
    $canonicalCheck = $htmlContent -match "canonical.*href=.*$DOMAIN/"
    $ogImageCheck = $htmlContent -match "og:image.*content=.*$DOMAIN/og-image.png"
    $jsonLdCheck = $htmlContent -match "application/ld\+json"
    
    if ($ogUrlCheck) { Write-Host "  OK og:url 정상" -ForegroundColor Green } else { Write-Host "  FAIL og:url 누락 또는 오류" -ForegroundColor Red }
    if ($canonicalCheck) { Write-Host "  OK canonical 정상" -ForegroundColor Green } else { Write-Host "  FAIL canonical 누락 또는 오류" -ForegroundColor Red }
    if ($ogImageCheck) { Write-Host "  OK og:image 정상" -ForegroundColor Green } else { Write-Host "  FAIL og:image 누락 또는 오류" -ForegroundColor Red }
    if ($jsonLdCheck) { Write-Host "  OK JSON-LD 정상" -ForegroundColor Green } else { Write-Host "  FAIL JSON-LD 누락" -ForegroundColor Red }
    
    if ($ogUrlCheck -and $canonicalCheck -and $ogImageCheck -and $jsonLdCheck) {
        $results += "OK 홈페이지 메타 태그"
    } else {
        $results += "WARN 홈페이지 메타 태그 일부 오류"
    }
} else {
    Write-Host "  FAIL 홈페이지 접근 실패" -ForegroundColor Red
    $results += "FAIL 홈페이지 접근 실패"
}
Write-Host ""

# 4. Guide 페이지 검증
Write-Host "[4/5] Guide 페이지 검증 중..." -ForegroundColor Yellow
$guide = Invoke-WebRequest -Uri "$DOMAIN/guide" -UseBasicParsing -ErrorAction SilentlyContinue
if ($guide) {
    $guideContent = $guide.Content
    
    if ($guideContent -match "FAQPage") {
        Write-Host "  OK FAQPage 스키마 정상" -ForegroundColor Green
        $results += "OK Guide 페이지"
    } else {
        Write-Host "  FAIL FAQPage 스키마 누락" -ForegroundColor Red
        $results += "FAIL Guide 페이지 스키마"
    }
} else {
    Write-Host "  FAIL Guide 페이지 접근 실패" -ForegroundColor Red
    $results += "FAIL Guide 페이지 접근 실패"
}
Write-Host ""

# 5. HTTPS 확인
Write-Host "[5/5] HTTPS 설정 확인 중..." -ForegroundColor Yellow
if ($DOMAIN -match "^https://") {
    Write-Host "  OK HTTPS 사용 중" -ForegroundColor Green
    $results += "OK HTTPS"
} else {
    Write-Host "  WARN HTTP 사용 중 (HTTPS 권장)" -ForegroundColor Yellow
    $results += "WARN HTTP 사용"
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
$successCount = ($results | Where-Object { $_ -match "^OK" }).Count
$totalCount = $results.Count
if ($totalCount -gt 0) {
    $percentage = [math]::Round(($successCount / $totalCount) * 100, 2)
} else {
    $percentage = 0
}

Write-Host "성공률: $successCount/$totalCount ($percentage%)" -ForegroundColor $(if ($percentage -ge 80) { "Green" } elseif ($percentage -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

# 다음 단계 안내
if ($percentage -lt 100) {
    Write-Host "다음 단계:" -ForegroundColor Yellow
    Write-Host "1. 배포 플랫폼에서 DOMAIN 환경변수 확인" -ForegroundColor White
    Write-Host "   DOMAIN=https://timeism.keero.site" -ForegroundColor Gray
    Write-Host "2. 앱 재시작 후 다시 이 스크립트 실행" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "모든 SEO 설정이 정상입니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Cyan
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
