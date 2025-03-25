#!/usr/bin/env python3
import requests
import json
import sys

def test_api_endpoint():
    """Test the packet capture start API endpoint."""
    base_url = "http://localhost:8000"
    token = input("Enter your auth token (or press Enter for none): ").strip() or None
    interface = input("Enter network interface to capture on (or press Enter for default): ").strip() or None
    
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    # Test endpoint
    print("\nTesting /api/packets/interfaces endpoint...")
    try:
        response = requests.get(f"{base_url}/api/packets/interfaces", headers=headers)
        response.raise_for_status()
        print("Available interfaces:")
        interfaces = response.json()
        for i, iface in enumerate(interfaces):
            print(f"{i+1}. {iface['name']} - {iface.get('description', 'No description')} ({iface.get('ip', 'No IP')})")
        
        if not interface and interfaces:
            interface = interfaces[0]['name']
            print(f"Using first interface: {interface}")
    except Exception as e:
        print(f"Error getting interfaces: {e}")
    
    # Test start capture endpoint
    print("\nTesting /api/packets/start endpoint...")
    payload = {
        "interface": interface,
        "settings": None
    }
    
    print(f"Request payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{base_url}/api/packets/start",
            headers=headers,
            json=payload
        )
        
        print(f"Response status code: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response body: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response content: {response.text}")
        
        if response.status_code >= 400:
            print(f"ERROR: API call failed with status {response.status_code}")
            return False
        
        print("SUCCESS: Packet capture started successfully")
        return True
    
    except Exception as e:
        print(f"Exception: {e}")
        return False

if __name__ == "__main__":
    success = test_api_endpoint()
    sys.exit(0 if success else 1) 