#!/usr/bin/env python3
"""
이벤트 관리자 - period 기반 알림

ticketing_time 대신 period의 첫날을 사용하여
내일 공연이 있으면 알림을 보냅니다.
"""

import json
import re
from datetime import datetime, timedelta
from dateutil import parser
import pytz

class EventManager:
    def __init__(self, locale='ko'):
        self.locale = locale
        # 현재 스크립트 위치에서 상대 경로
        import os
        script_dir = os.path.dirname(os.path.abspath(__file__))
        marketing_dir = os.path.dirname(script_dir)
        
        # locale 매핑 (ko -> kr 파일 사용)
        file_locale = 'kr' if locale == 'ko' else locale
        self.events_file = os.path.join(marketing_dir, 'output', f'synctime_{file_locale}.json')
        
        # 파일 로드
        with open(self.events_file, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        
        # 템플릿 로드 (템플릿은 ko.json 사용)
        self.templates_file = os.path.join(marketing_dir, 'templates', f'{locale}.json')
        with open(self.templates_file, 'r', encoding='utf-8') as f:
            self.templates = json.load(f)
    
    def parse_period_start_date(self, period_str):
        """
        period 문자열에서 시작 날짜 추출
        예: "2026.02.07~2026.02.08" -> datetime(2026, 2, 7)
        예: "2026.02.07~\\n\\t\\t\\t\\t\\t\\t\\t2026.02.08" -> datetime(2026, 2, 7)
        """
        if not period_str:
            return None
        
        # 공백, 탭, 개행 제거
        clean_period = re.sub(r'[\s\n\t]+', '', period_str)
        
        # ~ 또는 - 로 분리
        parts = re.split(r'[~\-]', clean_period)
        if not parts:
            return None
        
        start_date_str = parts[0].strip()
        
        # 날짜 파싱 (여러 형식 지원)
        try:
            # 2026.02.07 형식
            if '.' in start_date_str:
                return datetime.strptime(start_date_str, '%Y.%m.%d')
            # 2026-02-07 형식
            elif '-' in start_date_str and start_date_str.count('-') == 2:
                return datetime.strptime(start_date_str, '%Y-%m-%d')
            else:
                return None
        except:
            return None
    
    def get_tomorrow_events(self):
        """내일 공연이 있는 이벤트 찾기"""
        # 한국 시간 기준
        kst = pytz.timezone('Asia/Seoul')
        now = datetime.now(kst)
        tomorrow = (now + timedelta(days=1)).date()
        
        tomorrow_events = []
        
        for event in self.data.get('events', []):
            # enabled 체크
            if not event.get('enabled', True):
                continue
            
            # 이미 posted된 이벤트는 제외
            if event.get('posted', False):
                continue
            
            # period에서 시작 날짜 추출
            period = event.get('period', '')
            start_date = self.parse_period_start_date(period)
            
            if start_date and start_date.date() == tomorrow:
                tomorrow_events.append(event)
        
        return tomorrow_events
    
    def mark_as_posted(self, event_id):
        """이벤트를 게시 완료로 표시"""
        for event in self.data.get('events', []):
            if event['id'] == event_id:
                event['posted'] = True
                break
    
    def generate_tweet(self, event):
        """트윗 텍스트 생성"""
        import random
        
        # 카테고리 결정
        category = event.get('category', 'default')
        if category not in self.templates['templates']:
            category = 'default'
        
        # 템플릿 선택 (랜덤)
        template_list = self.templates['templates'][category]
        template = random.choice(template_list)
        
        # URL 생성 (locale에 따라)
        base_url = "https://synctime.keero.site"
        if self.locale == 'ko':
            url = f"{base_url}/ko"
        elif self.locale == 'jp':
            url = f"{base_url}/jp"
        else:
            url = base_url
        
        # 변수 치환
        tweet = template.format(
            name=event.get('name', 'Unknown Event'),
            period=event.get('period', ''),
            venue=event.get('venue', ''),
            platform=event.get('platform', ''),
            url=url
        )
        
        return tweet
    
    def save(self):
        """변경사항 저장"""
        with open(self.events_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, ensure_ascii=False, indent=2)

# 테스트
if __name__ == "__main__":
    manager = EventManager('ko')  # kr -> ko로 변경
    
    print("🔍 내일 공연 찾기 테스트")
    print(f"오늘: {datetime.now().strftime('%Y-%m-%d')}")
    print(f"내일: {(datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')}")
    print()
    
    tomorrow_events = manager.get_tomorrow_events()
    
    if tomorrow_events:
        print(f"✅ 내일 공연: {len(tomorrow_events)}개")
        for event in tomorrow_events[:5]:
            print(f"  - {event['name']} ({event.get('period', 'N/A')})")
        
        # 트윗 생성 테스트
        print("\n📝 트윗 생성 테스트:")
        test_event = tomorrow_events[0]
        tweet = manager.generate_tweet(test_event)
        print(f"\n{tweet}")
        print(f"\n글자 수: {len(tweet)}")
    else:
        print("❌ 내일 공연 없음")
    
    # period 파싱 테스트
    print("\n📅 Period 파싱 테스트:")
    test_periods = [
        "2026.02.07~2026.02.08",
        "2026.02.07~\\n\\t\\t\\t\\t\\t\\t\\t2026.02.08",
        "2026.01.17~\\n\\t\\t\\t\\t\\t\\t\\t2026.01.18",
        "2026.03.14~\\n\\t\\t\\t\\t\\t\\t\\t2026.03.14",
    ]
    
    for period in test_periods:
        parsed = manager.parse_period_start_date(period)
        print(f"  '{period[:30]}...' -> {parsed}")
