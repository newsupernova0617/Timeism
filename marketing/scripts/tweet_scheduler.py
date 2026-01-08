#!/usr/bin/env python3
"""
트윗 스케줄러 - 내일 공연을 찾아서 자동으로 트윗

사용법:
    # DRY RUN (실제로 트윗하지 않음)
    python tweet_scheduler.py --dry-run
    
    # 실제 트윗 게시
    python tweet_scheduler.py
    
    # 특정 언어만
    LOCALE=ko python tweet_scheduler.py
"""

import os
import sys
from datetime import datetime
from event_manager import EventManager
from twitter_client import TwitterClient

def main():
    # 설정
    locale = os.getenv('LOCALE', 'ko')  # 기본값: 한국어
    dry_run = '--dry-run' in sys.argv or '--test' in sys.argv
    
    print("=" * 60)
    print("🎫 SyncTime Auto Tweet Scheduler")
    print("=" * 60)
    print(f"Locale: {locale}")
    print(f"Mode: {'DRY RUN (테스트)' if dry_run else 'LIVE (실제 트윗)'}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    
    try:
        # 1. 이벤트 매니저 초기화
        print("📋 Loading events...")
        event_manager = EventManager(locale)
        
        # 2. 내일 공연 찾기
        print("🔍 Searching for tomorrow's events...")
        tomorrow_events = event_manager.get_tomorrow_events()
        
        if not tomorrow_events:
            print("❌ No events found for tomorrow")
            print("=" * 60)
            return
        
        print(f"✅ Found {len(tomorrow_events)} event(s) for tomorrow\n")
        
        # 3. Twitter 클라이언트 초기화
        if not dry_run:
            print("🐦 Initializing Twitter client...")
            twitter = TwitterClient(locale)
            print()
        
        # 4. 각 이벤트에 대해 트윗
        posted_count = 0
        skipped_count = 0
        
        for i, event in enumerate(tomorrow_events, 1):
            print(f"\n[{i}/{len(tomorrow_events)}] Processing: {event['name'][:50]}...")
            
            # 이미 posted된 이벤트는 건너뛰기
            if event.get('posted', False):
                print(f"  ⏭️  Already posted, skipping")
                skipped_count += 1
                continue
            
            # 트윗 생성
            tweet_text = event_manager.generate_tweet(event)
            
            # 트윗 게시
            if dry_run:
                # DRY RUN 모드
                print(f"  🔍 DRY RUN - Would post:")
                print(f"  {tweet_text[:100]}...")
                posted_count += 1
            else:
                # 실제 게시
                try:
                    tweet_id = twitter.post_tweet(tweet_text)
                    if tweet_id:
                        # 이벤트를 posted로 표시
                        event_manager.mark_as_posted(event['id'])
                        posted_count += 1
                        print(f"  ✅ Posted successfully")
                except Exception as e:
                    print(f"  ❌ Failed to post: {e}")
        
        # 5. 변경사항 저장
        if not dry_run and posted_count > 0:
            print("\n💾 Saving changes...")
            event_manager.save()
            print("✅ Changes saved")
        
        # 6. 결과 요약
        print("\n" + "=" * 60)
        print("📊 Summary")
        print("=" * 60)
        print(f"Total events: {len(tomorrow_events)}")
        print(f"Posted: {posted_count}")
        print(f"Skipped: {skipped_count}")
        print(f"Failed: {len(tomorrow_events) - posted_count - skipped_count}")
        print("=" * 60)
        
        if dry_run:
            print("\n💡 This was a DRY RUN. No tweets were actually posted.")
            print("   Run without --dry-run to post for real.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
