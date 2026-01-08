#!/usr/bin/env python3
"""
깨진 텍스트가 있는 이벤트를 제거하는 스크립트
"""

import json
import re

def is_text_corrupted(text):
    """텍스트가 깨졌는지 확인"""
    if not text:
        return False
    
    # 한글 범위가 아닌 이상한 문자가 많으면 깨진 것으로 판단
    # 예: 裕ㅼ而, 대怨듭, 留 怨 등
    corrupted_patterns = [
        r'[ㅼㅽㅾㅿㆀㆁㆂㆃㆄㆅㆆㆇㆈㆉㆊ]',  # 자음만 있는 경우
        r'[⑥⑦⑧⑨⑩]',  # 특수 숫자
        r'裕|怨|띠|吏|곗',  # 깨진 한자
    ]
    
    for pattern in corrupted_patterns:
        if re.search(pattern, text):
            return True
    
    return False

def clean_events():
    """깨진 이벤트 제거"""
    print("🔧 깨진 텍스트 제거 중...")
    
    with open('output/synctime_kr.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    original_count = len(data['events'])
    
    # 깨진 이벤트 필터링
    clean_events = []
    removed_events = []
    
    for event in data['events']:
        is_corrupted = (
            is_text_corrupted(event.get('name', '')) or
            is_text_corrupted(event.get('venue', '')) or
            is_text_corrupted(event.get('period', ''))
        )
        
        if is_corrupted:
            removed_events.append(event)
        else:
            clean_events.append(event)
    
    # 결과 저장
    data['events'] = clean_events
    data['event_count'] = len(clean_events)
    
    with open('output/synctime_kr.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 완료!")
    print(f"   원본: {original_count}개")
    print(f"   제거: {len(removed_events)}개")
    print(f"   최종: {len(clean_events)}개")
    
    if removed_events:
        print(f"\n🗑️  제거된 이벤트:")
        for event in removed_events[:5]:  # 처음 5개만 표시
            print(f"   - {event.get('name', 'N/A')} ({event.get('platform', 'N/A')})")
        if len(removed_events) > 5:
            print(f"   ... 외 {len(removed_events) - 5}개")

if __name__ == "__main__":
    clean_events()
