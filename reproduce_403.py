import requests
import json

# Configuration
BASE_URL = "http://localhost:8080"
EMAIL = "aarav@empathai.com"
PASSWORD = "GGgvwM5Gazn4"

def test_chat_flow():
    # 1. Login
    print(f"Attempting login for {EMAIL}...")
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {"email": EMAIL, "password": PASSWORD}
    
    try:
        res = requests.post(login_url, json=login_payload)
        print(f"Login Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Login Failed: {res.text}")
            return
        
        data = res.json()
        token = data.get("token")
        user = data.get("user")
        print(f"Logged in as: {user.get('name')} (Role: {user.get('role')})")
        print(f"Token: {token[:20]}...")

        # 2. Call Chat Usage (GET)
        print("\nTesting GET /api/chat/usage...")
        usage_url = f"{BASE_URL}/api/chat/usage"
        headers = {"Authorization": f"Bearer {token}"}
        res = requests.get(usage_url, headers=headers)
        print(f"Usage Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Usage Error: {res.text}")

        # 3. Send Message (POST)
        print("\nTesting POST /api/chat/message...")
        message_url = f"{BASE_URL}/api/chat/message"
        message_payload = {"message": "Tell me about photosynthesis."}
        res = requests.post(message_url, json=message_payload, headers=headers)
        print(f"Message Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Message Error: {res.text}")
        else:
            print(f"Bot Response: {res.json()}")

    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_chat_flow()
