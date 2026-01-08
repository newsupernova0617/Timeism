#!/usr/bin/env python3
"""
티켓팅 일정 데이터 추출

사용법:
    python extract_events.py
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
    
    # 공연 목록 테이블 찾기
    rows = soup.find_all('tr')
    
    for row in rows:
        # 공연 정보가 있는 행 찾기
        title_cell = row.find('td', class_='RKtxt')
        if not title_cell:
            continue
        
        try:
            # 공연명
            title_link = title_cell.find('a')
            if not title_link:
                continue
            
            title = title_link.text.strip()
            url = title_link.get('href', '')
            if url and not url.startswith('http'):
                url = 'http://ticket.interpark.com' + url
            
            # 장소
            place_cell = row.find_all('td', class_='Rkdate')
            place = place_cell[0].text.strip() if len(place_cell) > 0 else ''
            
            # 날짜
            date_text = place_cell[1].text.strip() if len(place_cell) > 1 else ''
            
            # 이벤트 ID 생성
            event_id = f"interpark-{re.sub(r'[^a-z0-9]+', '-', title.lower())[:50]}"
            
            event = {
                "id": event_id,
                "name": title,
                "platform": "인터파크",
                "ticketing_time": "",  # 티켓 오픈 시간은 별도 페이지에서 확인 필요
                "url": url,
                "category": "concert",
                "venue": place,
                "period": date_text,
                "enabled": True,
                "priority": "medium"
            }
            
            events.append(event)
            
        except Exception as e:
            print(f"  ⚠️  Error parsing row: {e}")
            continue
    
    print(f"  ✅ Extracted {len(events)} events from Interpark")
    return events

def extract_melon_events():
    """멜론티켓 일정 추출"""
    print("\n🔍 Extracting Melon events...")
    
    with open('raw_html/melon_utf8.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # 슬라이더 내 공연 목록 찾기
    slider_items = soup.find_all('li', class_='list_slider')
    if not slider_items:
        # 다른 구조 시도
        slider_items = soup.select('#sliderInner li')
    
    for item in slider_items:
        try:
            # 공연명
            name_elem = item.find('span', class_='name')
            if not name_elem:
                continue
            
            title = name_elem.text.strip()
            
            # URL
            link_elem = item.find('a')
            url = link_elem.get('href', '') if link_elem else ''
            if url and not url.startswith('http'):
                url = 'https://ticket.melon.com' + url
            
            # 날짜
            day_elem = item.find('span', class_='day')
            date_text = day_elem.text.strip() if day_elem else ''
            
            # 이벤트 ID 생성
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
            print(f"  ⚠️  Error parsing item: {e}")
            continue
    
    print(f"  ✅ Extracted {len(events)} events from Melon")
    return events

def extract_ticketmaster_events():
    """Ticketmaster 일정 추출"""
    print("\n🔍 Extracting Ticketmaster events...")
    
    with open('raw_html/ticketmaster.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # JSON-LD 데이터 찾기
    scripts = soup.find_all('script', type='application/ld+json')
    
    for script in scripts:
        try:
            data = json.loads(script.string)
            # Event 타입 데이터 찾기
            if isinstance(data, dict) and data.get('@type') == 'Event':
                event = {
                    "id": f"ticketmaster-{data.get('name', '').lower().replace(' ', '-')[:50]}",
                    "name": data.get('name', ''),
                    "platform": "Ticketmaster",
                    "ticketing_time": data.get('startDate', ''),
                    "url": data.get('url', ''),
                    "category": "concert",
                    "venue": data.get('location', {}).get('name', '') if isinstance(data.get('location'), dict) else '',
                    "enabled": True,
                    "priority": "medium"
                }
                events.append(event)
        except:
            continue
    
    print(f"  ℹ️  Ticketmaster parser needs refinement (found {len(events)} events)")
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
    
    print(f"\n💾 Saved to {filename}")

def main():
    print("=" * 60)
    print("🎫 티켓팅 일정 데이터 추출")
    print("=" * 60)
    
    # 한국 사이트
    kr_events = []
    kr_events.extend(extract_interpark_events())
    kr_events.extend(extract_melon_events())
    save_events('kr', kr_events)
    
    # 글로벌 사이트
    global_events = []
    global_events.extend(extract_ticketmaster_events())
    save_events('global', global_events)
    
    print("\n" + "=" * 60)
    print(f"✨ 추출 완료!")
    print(f"   한국: {len(kr_events)} events")
    print(f"   글로벌: {len(global_events)} events")
    print("=" * 60)

if __name__ == "__main__":
    main()
