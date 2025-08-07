#!/usr/bin/env python3
"""
OAuth Client for GoHighLevel Integration
========================================

This module provides OAuth 2.1 client functionality for connecting to 
GoHighLevel API with PKCE (Proof Key for Code Exchange).

Usage:
    python oauth_client.py
    
This will start an OAuth flow to authenticate with GoHighLevel.
"""

import asyncio
import base64
import hashlib
import secrets
import webbrowser
from urllib.parse import urlencode, parse_qs, urlparse
import logging
from typing import Optional

import httpx
from fastmcp import Client
from fastmcp.client.auth import OAuth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GHLOAuthClient:
    """OAuth 2.1 client for GoHighLevel with PKCE"""
    
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str = "http://localhost:8000/oauth/callback",
        base_url: str = "https://services.leadconnectorhq.com"
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.base_url = base_url
        self.auth_url = f"{base_url}/oauth/authorize"
        self.token_url = f"{base_url}/oauth/token"
        
        # PKCE parameters
        self.code_verifier = None
        self.code_challenge = None
        self.state = None
    
    def _generate_pkce_params(self):
        """Generate PKCE code verifier and challenge"""
        # Generate code verifier (43-128 characters)
        self.code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(32)
        ).decode('utf-8').rstrip('=')
        
        # Generate code challenge
        challenge_bytes = hashlib.sha256(self.code_verifier.encode('utf-8')).digest()
        self.code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')
        
        # Generate state parameter
        self.state = secrets.token_urlsafe(32)
        
        logger.info("🔐 PKCE parameters generated")
    
    def get_authorization_url(self, scopes: list = None) -> str:
        """Get OAuth authorization URL"""
        if scopes is None:
            scopes = [
                'contacts.readonly',
                'contacts.write', 
                'opportunities.readonly',
                'opportunities.write',
                'calendars.readonly',
                'calendars.write',
                'conversations.readonly',
                'workflows.readonly',
                'locations.readonly',
                'users.readonly'
            ]
        
        self._generate_pkce_params()
        
        params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(scopes),
            'state': self.state,
            'code_challenge': self.code_challenge,
            'code_challenge_method': 'S256'
        }
        
        auth_url = f"{self.auth_url}?{urlencode(params)}"
        logger.info(f"🔗 Authorization URL: {auth_url}")
        return auth_url
    
    async def exchange_code_for_token(self, authorization_code: str, state: str) -> dict:
        """Exchange authorization code for access token"""
        
        # Verify state parameter
        if state != self.state:
            raise ValueError("Invalid state parameter - possible CSRF attack")
        
        if not self.code_verifier:
            raise ValueError("Code verifier not found - authorization flow not started")
        
        token_data = {
            'grant_type': 'authorization_code',
            'code': authorization_code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'code_verifier': self.code_verifier
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=token_data,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                response.raise_for_status()
                
                token_response = response.json()
                logger.info("✅ Token exchange successful")
                logger.info(f"   Access Token: {token_response['access_token'][:20]}...")
                logger.info(f"   Expires In: {token_response['expires_in']} seconds")
                logger.info(f"   Scope: {token_response.get('scope', 'N/A')}")
                
                return token_response
                
            except httpx.HTTPStatusError as e:
                logger.error(f"❌ Token exchange failed: {e.response.status_code}")
                logger.error(f"   Response: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"❌ Token exchange error: {e}")
                raise
    
    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token using refresh token"""
        
        token_data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=token_data,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                response.raise_for_status()
                
                token_response = response.json()
                logger.info("🔄 Token refresh successful")
                return token_response
                
            except httpx.HTTPStatusError as e:
                logger.error(f"❌ Token refresh failed: {e.response.status_code}")
                logger.error(f"   Response: {e.response.text}")
                raise

async def test_oauth_flow():
    """Test OAuth flow with GoHighLevel"""
    
    # Configuration - replace with your actual values
    CLIENT_ID = "your_client_id_here"
    CLIENT_SECRET = "your_client_secret_here"
    
    if CLIENT_ID == "your_client_id_here":
        logger.error("❌ Please update CLIENT_ID and CLIENT_SECRET in oauth_client.py")
        return
    
    # Create OAuth client
    oauth_client = GHLOAuthClient(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET
    )
    
    # Step 1: Get authorization URL and open in browser
    auth_url = oauth_client.get_authorization_url()
    logger.info("🌐 Opening authorization URL in browser...")
    webbrowser.open(auth_url)
    
    # Step 2: User manually enters authorization code
    print("\n" + "="*60)
    print("OAUTH AUTHORIZATION REQUIRED")
    print("="*60)
    print("1. A browser window should have opened")
    print("2. Log in to GoHighLevel and authorize the application")
    print("3. Copy the authorization code from the redirect URL")
    print("4. Paste it below")
    print("="*60)
    
    auth_code = input("Enter authorization code: ").strip()
    state = input("Enter state parameter: ").strip()
    
    if not auth_code:
        logger.error("❌ No authorization code provided")
        return
    
    try:
        # Step 3: Exchange code for token
        logger.info("🔄 Exchanging authorization code for access token...")
        token_data = await oauth_client.exchange_code_for_token(auth_code, state)
        
        # Step 4: Test API call with token
        logger.info("🧪 Testing API call with access token...")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{oauth_client.base_url}/contacts",
                headers={
                    'Authorization': f"Bearer {token_data['access_token']}",
                    'Accept': 'application/json'
                },
                params={'limit': 5}
            )
            
            if response.status_code == 200:
                contacts = response.json()
                logger.info(f"✅ API test successful - Found {len(contacts.get('contacts', []))} contacts")
                
                # Show first contact as example
                if contacts.get('contacts'):
                    contact = contacts['contacts'][0]
                    logger.info(f"   Example contact: {contact.get('firstName', 'N/A')} {contact.get('lastName', 'N/A')}")
            else:
                logger.error(f"❌ API test failed: {response.status_code} - {response.text}")
        
        # Step 5: Test token refresh
        if token_data.get('refresh_token'):
            logger.info("🔄 Testing token refresh...")
            refreshed_token = await oauth_client.refresh_token(token_data['refresh_token'])
            logger.info("✅ Token refresh successful")
        
        logger.info("🎉 OAuth flow completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ OAuth flow failed: {e}")

async def test_fastmcp_oauth():
    """Test FastMCP client with OAuth"""
    
    logger.info("🧪 Testing FastMCP OAuth client...")
    
    # Create OAuth configuration for FastMCP
    oauth = OAuth(mcp_url="http://localhost:8000/mcp")
    
    try:
        async with Client("http://localhost:8000/mcp", auth=oauth) as client:
            # Test connection
            logger.info("🔌 Testing MCP connection...")
            await client.ping()
            logger.info("✅ MCP connection successful")
            
            # List available tools
            tools = await client.list_tools()
            logger.info(f"🛠️  Available tools: {[tool.name for tool in tools]}")
            
            # Test a tool call
            if tools:
                tool_name = tools[0].name
                logger.info(f"🧪 Testing tool: {tool_name}")
                
                # This would depend on the specific tool
                # result = await client.call_tool(tool_name, {})
                # logger.info(f"✅ Tool call result: {result}")
            
    except Exception as e:
        logger.error(f"❌ FastMCP OAuth test failed: {e}")

async def main():
    """Main function to run OAuth tests"""
    
    logger.info("🚀 GoHighLevel OAuth Client Test")
    logger.info("=" * 50)
    
    print("Choose test option:")
    print("1. Test OAuth flow manually")
    print("2. Test FastMCP OAuth client")
    print("3. Both")
    
    choice = input("Enter choice (1-3): ").strip()
    
    if choice in ['1', '3']:
        await test_oauth_flow()
    
    if choice in ['2', '3']:
        await test_fastmcp_oauth()
    
    logger.info("🏁 Tests completed")

if __name__ == "__main__":
    asyncio.run(main())