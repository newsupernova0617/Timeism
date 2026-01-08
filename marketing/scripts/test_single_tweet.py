#!/usr/bin/env python3
"""
단일 트윗 테스트 - 내일 공연 중 1개만 실제로 트윗

사용법:
    python test_single_tweet.py
"""

import os
import sys
from datetime import datetime
from event_manager import EventManager
from twitter_client import TwitterClient

def main():
    print("=" * 60)
    print("🧪 Single Tweet Test")
    print("=" * 60)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    
    # API 키 체크
    required_vars = [
        'TWITTER_API_KEY',
        'TWITTER_API_SECRET',
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_SECRET'
    ]
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n💡 Set them first:")
        print("   set TWITTER_API_KEY=your_key")
        print("   set TWITTER_API_SECRET=your_secret")
        print("   set TWITTER_ACCESS_TOKEN=your_token")
        print("   set TWITTER_ACCESS_SECRET=your_secret")
        sys.exit(1)
    
    try:
        # 1. 이벤트 매니저 초기화
        print("📋 Loading events...")
        event_manager = EventManager('ko')
        
        # 2. 내일 공연 찾기
        print("🔍 Searching for tomorrow's events...")
        tomorrow_events = event_manager.get_tomorrow_events()
        
        if not tomorrow_events:
            print("❌ No events found for tomorrow")
            return
        
        print(f"✅ Found {len(tomorrow_events)} event(s) for tomorrow\n")
        
        # 3. 첫 번째 이벤트만 선택
        test_event = tomorrow_events[0]
        
        print("📌 Selected event for test:")
        print(f"   Name: {test_event['name']}")
        print(f"   Venue: {test_event.get('venue', 'N/A')}")
        print(f"   Period: {test_event.get('period', 'N/A')}")
        print()
        
        # 4. 트윗 생성
        print("📝 Generating tweet...")
        tweet_text = event_manager.generate_tweet(test_event)
        
        print("\n" + "=" * 60)
        print("Generated Tweet:")
        print("=" * 60)
        print(tweet_text)
        print("=" * 60)
        print(f"Length: {len(tweet_text)} characters")
        print("=" * 60)
        print()
        
        # 5. 사용자 확인
        response = input("🤔 Post this tweet? (yes/no): ").strip().lower()
        
        if response not in ['yes', 'y']:
            print("❌ Cancelled by user")
            return
        
        # 6. Twitter 클라이언트 초기화
        print("\n🐦 Initializing Twitter client...")
        twitter = TwitterClient('ko')
        
        # 7. 트윗 게시
        print("\n📤 Posting tweet...")
        tweet_id = twitter.post_tweet(tweet_text)
        
        if tweet_id:
            # 이벤트를 posted로 표시
            event_manager.mark_as_posted(test_event['id'])
            event_manager.save()
            
            print("\n✅ Success! Tweet posted and event marked as posted.")
            print(f"🔗 Check it out: https://twitter.com/user/status/{tweet_id}")
        
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
