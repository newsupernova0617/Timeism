#!/usr/bin/env python3
"""
모든 티켓팅 사이트 데이터 추출 - 최종 버전

사용법:
    python extract_all_events.py
"""

from bs4 import BeautifulSoup
import json
import os
import re
from datetime import datetime

def extract_interpark_events():
    """인터파크 티켓 일정 추출"""
    print("🔍 Extracting Interpark events...")
    
    with open('raw_html/interpark_utf8.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    rows = soup.find_all('tr')
    
    for row in rows:
        title_cell = row.find('td', class_='RKtxt')
        if not title_cell:
            continue
        
        try:
            title_link = title_cell.find('a')
            if not title_link:
                continue
            
            title = title_link.text.strip()
            url = title_link.get('href', '')
            if url and not url.startswith('http'):
                url = 'http://ticket.interpark.com' + url
            
            place_cell = row.find_all('td', class_='Rkdate')
            place = place_cell[0].text.strip() if len(place_cell) > 0 else ''
            date_text = place_cell[1].text.strip() if len(place_cell) > 1 else ''
            
            event_id = f"interpark-{re.sub(r'[^a-z0-9]+', '-', title.lower())[:50]}"
            
            event = {
                "id": event_id,
                "name": title,
                "platform": "인터파크",
                "ticketing_time": "",
                "url": url,
                "category": "concert",
                "venue": place,
                "period": date_text,
                "enabled": True,
                "priority": "medium"
            }
            
            events.append(event)
            
        except Exception as e:
            continue
    
    print(f"  ✅ Extracted {len(events)} events from Interpark")
    return events

def extract_melon_events():
    """멜론티켓 일정 추출"""
    print("🔍 Extracting Melon events...")
    
    with open('raw_html/melon_utf8.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    slider_items = soup.select('#sliderInner li')
    
    for item in slider_items:
        try:
            name_elem = item.find('span', class_='name')
            if not name_elem:
                continue
            
            title = name_elem.text.strip()
            
            link_elem = item.find('a')
            url = link_elem.get('href', '') if link_elem else ''
            if url and not url.startswith('http'):
                url = 'https://ticket.melon.com' + url
            
            day_elem = item.find('span', class_='day')
            date_text = day_elem.text.strip() if day_elem else ''
            
            event_id = f"melon-{re.sub(r'[^a-z0-9]+', '-', title.lower())[:50]}"
            
            event = {
                "id": event_id,
                "name": title,
                "platform": "멜론티켓",
                "ticketing_time": "",
                "url": url,
                "category": "concert",
                "period": date_text,
                "enabled": True,
                "priority": "medium"
            }
            
            events.append(event)
            
        except Exception as e:
            continue
    
    print(f"  ✅ Extracted {len(events)} events from Melon")
    return events

def save_events(region, events):
    """이벤트를 JSON 파일로 저장"""
    os.makedirs('output', exist_ok=True)
    
    data = {
        "last_updated": datetime.now().isoformat(),
        "event_count": len(events),
        "events": events
    }
    
    filename = f'output/synctime_{region}.json'
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Saved to {filename}")

def main():
    print("=" * 60)
    print("🎫 티켓팅 일정 데이터 추출 - 전체")
    print("=" * 60)
    
    # 한국 사이트
    print("\n🇰🇷 한국 사이트 처리 중...")
    kr_events = []
    kr_events.extend(extract_interpark_events())
    kr_events.extend(extract_melon_events())
    save_events('kr', kr_events)
    
    # 일본 사이트 (TODO: 구현 필요)
    print("\n🇯🇵 일본 사이트...")
    print("  ℹ️  일본 사이트 파서 구현 필요")
    jp_events = []
    save_events('jp', jp_events)
    
    # 글로벌 사이트 (TODO: 구현 필요)
    print("\n🌍 글로벌 사이트...")
    print("  ℹ️  글로벌 사이트 파서 구현 필요")
    global_events = []
    save_events('global', global_events)
    
    print("\n" + "=" * 60)
    print(f"✨ 추출 완료!")
    print(f"   🇰🇷 한국: {len(kr_events)} events")
    print(f"   🇯🇵 일본: {len(jp_events)} events")
    print(f"   🌍 글로벌: {len(global_events)} events")
    print(f"   📊 총합: {len(kr_events) + len(jp_events) + len(global_events)} events")
    print("=" * 60)
    print("\n💡 다음 단계:")
    print("   1. output/ 폴더의 JSON 파일 확인")
    print("   2. 데이터 품질 검토")
    print("   3. 필요시 수동 편집")
    print("   4. Git에 커밋")

if __name__ == "__main__":
    main()
