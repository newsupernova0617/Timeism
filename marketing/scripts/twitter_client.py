#!/usr/bin/env python3
"""
Twitter 클라이언트 - X(Twitter) API (OAuth 1.0a)

환경 변수:
- TWITTER_API_KEY
- TWITTER_API_SECRET
- TWITTER_ACCESS_TOKEN
- TWITTER_ACCESS_SECRET
"""

import os
import tweepy
from datetime import datetime

class TwitterClient:
    def __init__(self, locale='ko'):
        """
        Twitter 클라이언트 초기화 (OAuth 1.0a)
        
        Args:
            locale: 'ko', 'jp', 'en' 중 하나
        """
        self.locale = locale
        
        # 환경 변수에서 API 키 가져오기
        api_key = os.getenv('TWITTER_API_KEY')
        api_secret = os.getenv('TWITTER_API_SECRET')
        access_token = os.getenv('TWITTER_ACCESS_TOKEN')
        access_secret = os.getenv('TWITTER_ACCESS_SECRET')
        
        # API 키 검증
        if not all([api_key, api_secret, access_token, access_secret]):
            raise ValueError(
                "Twitter API credentials not found in environment variables.\n"
                "Please set: TWITTER_API_KEY, TWITTER_API_SECRET, "
                "TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET"
            )
        
        # Tweepy 클라이언트 초기화 (OAuth 1.0a)
        try:
            # OAuth 1.0a 인증
            auth = tweepy.OAuth1UserHandler(
                api_key,
                api_secret,
                access_token,
                access_secret
            )
            
            # API v1.1 클라이언트 (인증 확인용)
            self.api = tweepy.API(auth)
            
            # API v2 클라이언트 (트윗 게시용 - Free tier에서 사용 가능)
            self.client = tweepy.Client(
                consumer_key=api_key,
                consumer_secret=api_secret,
                access_token=access_token,
                access_token_secret=access_secret
            )
            
            # 인증 확인
            self.api.verify_credentials()
            
            print(f"✅ Twitter client initialized (OAuth 1.0a + API v2) for locale: {locale}")
        except Exception as e:
            raise Exception(f"Failed to initialize Twitter client: {e}")
    
    def post_tweet(self, text, dry_run=False):
        """
        트윗 게시
        
        Args:
            text: 트윗 내용 (280자 이내)
            dry_run: True면 실제로 게시하지 않고 시뮬레이션만
        
        Returns:
            트윗 ID 또는 None
        """
        # 글자 수 체크
        if len(text) > 280:
            print(f"⚠️  Warning: Tweet is {len(text)} characters (max 280)")
            text = text[:277] + "..."
        
        if dry_run:
            print(f"\n{'='*60}")
            print(f"🔍 DRY RUN MODE - Tweet will NOT be posted")
            print(f"{'='*60}")
            print(f"\n{text}")
            print(f"\n글자 수: {len(text)}")
            print(f"{'='*60}\n")
            return None
        
        # 실제 트윗 게시 (API v2)
        try:
            response = self.client.create_tweet(text=text)
            tweet_id = response.data['id']
            
            # 사용자 정보 가져오기
            user = self.api.verify_credentials()
            
            print(f"\n{'='*60}")
            print(f"✅ Tweet posted successfully!")
            print(f"{'='*60}")
            print(f"Tweet ID: {tweet_id}")
            print(f"URL: https://twitter.com/{user.screen_name}/status/{tweet_id}")
            print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"\n{text}")
            print(f"\n글자 수: {len(text)}")
            print(f"{'='*60}\n")
            
            return tweet_id
            
        except tweepy.errors.Forbidden as e:
            print(f"\n{'='*60}")
            print(f"❌ Failed to post tweet - Forbidden (403)")
            print(f"{'='*60}")
            print(f"Error: {e}")
            print(f"\n💡 Possible causes:")
            print(f"   - App permissions not set to 'Read and Write'")
            print(f"   - Duplicate tweet (same text posted recently)")
            print(f"{'='*60}\n")
            raise
            
        except tweepy.errors.Unauthorized as e:
            print(f"\n{'='*60}")
            print(f"❌ Failed to post tweet - Unauthorized (401)")
            print(f"{'='*60}")
            print(f"Error: {e}")
            print(f"\n💡 Possible causes:")
            print(f"   - Invalid API keys or tokens")
            print(f"   - Access token needs to be regenerated")
            print(f"{'='*60}\n")
            raise
            
        except tweepy.errors.TweepyException as e:
            print(f"\n{'='*60}")
            print(f"❌ Failed to post tweet")
            print(f"{'='*60}")
            print(f"Error: {e}")
            print(f"\n{text}")
            print(f"{'='*60}\n")
            raise
    
    def get_me(self):
        """현재 인증된 사용자 정보 가져오기"""
        try:
            user = self.api.verify_credentials()
            return user
        except Exception as e:
            print(f"❌ Failed to get user info: {e}")
            return None


# 테스트
if __name__ == "__main__":
    import sys
    
    print("🐦 Twitter Client Test (OAuth 1.0a)\n")
    
    # 환경 변수 체크
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
        print("\n💡 Set them in your environment:")
        print("   set TWITTER_API_KEY=your_key")
        print("   set TWITTER_API_SECRET=your_secret")
        print("   set TWITTER_ACCESS_TOKEN=your_token")
        print("   set TWITTER_ACCESS_SECRET=your_secret")
        sys.exit(1)
    
    try:
        # 클라이언트 초기화
        client = TwitterClient('ko')
        
        # 사용자 정보 확인
        user = client.get_me()
        if user:
            print(f"📱 Authenticated as: @{user.screen_name}")
            print(f"   Name: {user.name}")
            print(f"   Followers: {user.followers_count}")
            print()
        
        # 테스트 트윗 (DRY RUN)
        test_tweet = "🧪 테스트 트윗입니다.\n\nTwitter API (OAuth 1.0a) 연동 테스트 중...\n\n#SyncTime #테스트"
        
        print("Testing with DRY RUN mode...")
        client.post_tweet(test_tweet, dry_run=True)
        
        print("\n💡 To post a real tweet, set dry_run=False")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
