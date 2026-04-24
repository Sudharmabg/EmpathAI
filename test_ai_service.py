import requests
import json

url = "http://localhost:8000/chat"
payload = {
    "student_name": "Test Student",
    "grade": "Class 10",
    "message": "Hello, how are you?",
    "history": []
}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
