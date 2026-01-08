#!/usr/bin/env python3
"""
HTML 파일에서 티켓팅 일정 추출

사용법:
    python parse_schedules.py
"""

from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
import re

def parse_interpark():
    """인터파크 티켓 파싱"""
    print("🔍 Parsing Interpark...")
    
    with open('raw_html/interpark_utf8.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # 공연 목록 찾기 - 실제 HTML 구조에 맞게 조정 필요
    # 먼저 구조 파악을 위해 일부 출력
    print("  → Analyzing HTML structure...")
    
    # 티켓 오픈 관련 섹션 찾기
    ticket_open_sections = soup.find_all(text=re.compile(r'티켓.*오픈|오픈.*예정'))
    print(f"  → Found {len(ticket_open_sections)} sections with '티켓오픈' or '오픈예정'")
    
    # 날짜 패턴 찾기
    date_patterns = soup.find_all(text=re.compile(r'\d{4}[.-]\d{2}[.-]\d{2}|\d{2}[.-]\d{2}'))
    print(f"  → Found {len(date_patterns)} date patterns")
    
    # 샘플 데이터 출력
    for i, section in enumerate(ticket_open_sections[:3]):
        print(f"\n  Sample {i+1}:")
        print(f"    Text: {section.strip()[:100]}")
        parent = section.parent
        if parent:
            print(f"    Parent tag: {parent.name}")
            print(f"    Parent class: {parent.get('class', 'N/A')}")
    
    return events

def parse_melon():
    """멜론티켓 파싱"""
    print("\n🔍 Parsing Melon Ticket...")
    
    with open('raw_html/melon_utf8.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # 티켓 오픈 관련 찾기
    ticket_sections = soup.find_all(text=re.compile(r'티켓.*오픈|오픈.*안내'))
    print(f"  → Found {len(ticket_sections)} sections with ticket open info")
    
    return events

def parse_yes24():
    """YES24 티켓 파싱"""
    print("\n🔍 Parsing YES24...")
    
    with open('raw_html/yes24.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # 공연 목록 찾기
    print(f"  → Total HTML size: {len(html)} bytes")
    
    return events

def parse_ticketmaster():
    """Ticketmaster 파싱"""
    print("\n🔍 Parsing Ticketmaster...")
    
    with open('raw_html/ticketmaster.html', 'r', encoding='utf-8') as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    events = []
    
    # "On Sale" 관련 찾기
    on_sale_sections = soup.find_all(text=re.compile(r'On Sale|Presale|Tickets'))
    print(f"  → Found {len(on_sale_sections)} sections with sale info")
    
    # JSON 데이터가 있는지 확인 (많은 현대 사이트들이 JSON을 embed함)
    scripts = soup.find_all('script', type='application/ld+json')
    print(f"  → Found {len(scripts)} JSON-LD scripts")
    
    if scripts:
        print("  → Sample JSON-LD:")
        try:
            sample_json = json.loads(scripts[0].string)
            print(f"    Type: {sample_json.get('@type', 'N/A')}")
            print(f"    Keys: {list(sample_json.keys())[:5]}")
        except:
            print("    (Could not parse)")
    
    return events

def main():
    print("=" * 60)
    print("🎫 티켓팅 일정 파싱 (구조 분석)")
    print("=" * 60)
    
    # 각 사이트 파싱
    parse_interpark()
    parse_melon()
    parse_yes24()
    parse_ticketmaster()
    
    print("\n" + "=" * 60)
    print("✨ 구조 분석 완료!")
    print("💡 위 정보를 바탕으로 실제 파싱 로직을 구현할 수 있습니다.")
    print("=" * 60)

if __name__ == "__main__":
    main()
