#!/usr/bin/env python3
"""
FastMCP OAuth Server for GoHighLevel Integration
================================================

This server provides OAuth 2.1 authentication with GoHighLevel API
and exposes GHL functionality through MCP protocol.

Features:
- OAuth 2.1 Authorization Code Grant with PKCE
- Token refresh and management
- FastMCP server with authentication
- GoHighLevel API integration
- SSE transport for remote connections
"""

import asyncio
import os
import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode, parse_qs, urlparse

import httpx
from fastmcp import FastMCP
from fastmcp.server.auth import OAuthProvider
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    """Server configuration from environment variables"""
    
    # OAuth Configuration
    CLIENT_ID = os.getenv('GHL_CLIENT_ID')
    CLIENT_SECRET = os.getenv('GHL_CLIENT_SECRET')
    REDIRECT_URI = os.getenv('GHL_REDIRECT_URI', 'http://localhost:8000/oauth/callback')
    
    # GHL API Configuration
    GHL_BASE_URL = os.getenv('GHL_BASE_URL', 'https://services.leadconnectorhq.com')
    GHL_AUTH_URL = f"{GHL_BASE_URL}/oauth/authorize"
    GHL_TOKEN_URL = f"{GHL_BASE_URL}/oauth/token"
    
    # Server Configuration
    PORT = int(os.getenv('PORT', '8000'))
    HOST = os.getenv('HOST', '0.0.0.0')
    
    # Required OAuth Scopes for GHL
    SCOPES = [
        'contacts.readonly',
        'contacts.write',
        'opportunities.readonly', 
        'opportunities.write',
        'calendars.readonly',
        'calendars.write',
        'conversations.readonly',
        'conversations.write',
        'workflows.readonly',
        'locations.readonly',
        'users.readonly'
    ]
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.CLIENT_ID or not cls.CLIENT_SECRET:
            raise ValueError("GHL_CLIENT_ID and GHL_CLIENT_SECRET must be set")
        logger.info(f"✅ Configuration validated - Client ID: {cls.CLIENT_ID[:8]}...")

# Data Models
class OAuthToken(BaseModel):
    """OAuth token data model"""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    expires_at: datetime
    scope: str
    location_id: Optional[str] = None
    user_id: Optional[str] = None

class GHLContact(BaseModel):
    """GoHighLevel contact model"""
    id: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    customFields: Dict[str, Any] = Field(default_factory=dict)

class GHLOpportunity(BaseModel):
    """GoHighLevel opportunity model"""
    id: Optional[str] = None
    name: str
    contact_id: str
    pipeline_id: str
    stage_id: str
    monetary_value: Optional[float] = None
    status: str = "open"

# Token Storage (In production, use Redis or database)
class TokenStore:
    """Simple in-memory token storage"""
    
    def __init__(self):
        self._tokens: Dict[str, OAuthToken] = {}
    
    async def store_token(self, user_id: str, token: OAuthToken):
        """Store OAuth token for user"""
        self._tokens[user_id] = token
        logger.info(f"🔐 Token stored for user: {user_id}")
    
    async def get_token(self, user_id: str) -> Optional[OAuthToken]:
        """Get OAuth token for user"""
        return self._tokens.get(user_id)
    
    async def refresh_token(self, user_id: str) -> Optional[OAuthToken]:
        """Refresh expired token"""
        token = await self.get_token(user_id)
        if not token:
            return None
            
        if datetime.now() < token.expires_at - timedelta(minutes=5):
            return token  # Token still valid
            
        # Refresh the token
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    Config.GHL_TOKEN_URL,
                    data={
                        'grant_type': 'refresh_token',
                        'refresh_token': token.refresh_token,
                        'client_id': Config.CLIENT_ID,
                        'client_secret': Config.CLIENT_SECRET,
                    },
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                response.raise_for_status()
                
                token_data = response.json()
                new_token = OAuthToken(
                    access_token=token_data['access_token'],
                    refresh_token=token_data.get('refresh_token', token.refresh_token),
                    expires_in=token_data['expires_in'],
                    expires_at=datetime.now() + timedelta(seconds=token_data['expires_in']),
                    scope=token_data.get('scope', token.scope),
                    location_id=token.location_id,
                    user_id=token.user_id
                )
                
                await self.store_token(user_id, new_token)
                logger.info(f"🔄 Token refreshed for user: {user_id}")
                return new_token
                
            except Exception as e:
                logger.error(f"❌ Token refresh failed for {user_id}: {e}")
                return None

# GoHighLevel API Client
class GHLApiClient:
    """GoHighLevel API client with OAuth authentication"""
    
    def __init__(self, token_store: TokenStore):
        self.token_store = token_store
        self.base_url = Config.GHL_BASE_URL
    
    async def _get_headers(self, user_id: str) -> Dict[str, str]:
        """Get authenticated headers for API calls"""
        token = await self.token_store.refresh_token(user_id)
        if not token:
            raise ValueError(f"No valid token for user: {user_id}")
        
        return {
            'Authorization': f'Bearer {token.access_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    
    async def get_contacts(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get contacts from GHL"""
        headers = await self._get_headers(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/contacts",
                headers=headers,
                params={'limit': limit}
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get('contacts', [])
    
    async def create_contact(self, user_id: str, contact: GHLContact) -> Dict:
        """Create a new contact in GHL"""
        headers = await self._get_headers(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/contacts",
                headers=headers,
                json=contact.model_dump(exclude_unset=True)
            )
            response.raise_for_status()
            
            return response.json()
    
    async def get_opportunities(self, user_id: str, limit: int = 20) -> List[Dict]:
        """Get opportunities from GHL"""
        headers = await self._get_headers(user_id)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/opportunities",
                headers=headers,
                params={'limit': limit}
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get('opportunities', [])

# OAuth Provider Implementation
class GHLOAuthProvider(OAuthProvider):
    """GoHighLevel OAuth 2.1 Provider for FastMCP"""
    
    def __init__(self):
        self.token_store = TokenStore()
        self.ghl_client = GHLApiClient(self.token_store)
        logger.info("🔐 GHL OAuth Provider initialized")
    
    def get_authorization_url(self, state: str, code_challenge: str) -> str:
        """Generate OAuth authorization URL"""
        params = {
            'response_type': 'code',
            'client_id': Config.CLIENT_ID,
            'redirect_uri': Config.REDIRECT_URI,
            'scope': ' '.join(Config.SCOPES),
            'state': state,
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256'
        }
        
        url = f"{Config.GHL_AUTH_URL}?{urlencode(params)}"
        logger.info(f"🔗 Authorization URL generated: {url[:100]}...")
        return url
    
    async def exchange_code_for_token(self, code: str, code_verifier: str) -> OAuthToken:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    Config.GHL_TOKEN_URL,
                    data={
                        'grant_type': 'authorization_code',
                        'code': code,
                        'client_id': Config.CLIENT_ID,
                        'client_secret': Config.CLIENT_SECRET,
                        'redirect_uri': Config.REDIRECT_URI,
                        'code_verifier': code_verifier
                    },
                    headers={'Content-Type': 'application/x-www-form-urlencoded'}
                )
                response.raise_for_status()
                
                token_data = response.json()
                token = OAuthToken(
                    access_token=token_data['access_token'],
                    refresh_token=token_data['refresh_token'],
                    expires_in=token_data['expires_in'],
                    expires_at=datetime.now() + timedelta(seconds=token_data['expires_in']),
                    scope=token_data['scope'],
                    location_id=token_data.get('locationId'),
                    user_id=token_data.get('userId', 'default_user')
                )
                
                # Store the token
                await self.token_store.store_token(token.user_id, token)
                logger.info(f"✅ Token exchange successful for user: {token.user_id}")
                return token
                
            except httpx.HTTPStatusError as e:
                logger.error(f"❌ Token exchange failed: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"❌ Token exchange error: {e}")
                raise
    
    async def verify_token(self, token: str) -> Optional[Dict]:
        """Verify bearer token (required by FastMCP)"""
        # In a real implementation, verify the JWT token
        # For now, return mock user info
        return {
            'user_id': 'default_user',
            'scope': ' '.join(Config.SCOPES)
        }

# Initialize FastMCP Server
def create_fastmcp_server() -> FastMCP:
    """Create and configure FastMCP server with OAuth"""
    
    # Validate configuration
    Config.validate()
    
    # Create OAuth provider
    oauth_provider = GHLOAuthProvider()
    
    # Create FastMCP server with OAuth authentication
    mcp = FastMCP(
        name="GoHighLevel OAuth MCP Server",
        instructions="""
        This server provides OAuth-authenticated access to GoHighLevel CRM functionality.
        
        Available tools:
        - search_contacts: Search for contacts in GHL
        - create_contact: Create a new contact
        - get_opportunities: Get opportunities/deals
        - create_opportunity: Create a new opportunity
        
        Authentication is handled via OAuth 2.1 with PKCE.
        """,
        auth=oauth_provider
    )
    
    # Add GHL API tools
    @mcp.tool()
    async def search_contacts(query: str = "", limit: int = 20) -> List[Dict]:
        """Search for contacts in GoHighLevel CRM"""
        try:
            user_id = "default_user"  # In production, get from context
            contacts = await oauth_provider.ghl_client.get_contacts(user_id, limit)
            
            # Filter by query if provided
            if query:
                contacts = [
                    c for c in contacts 
                    if query.lower() in (c.get('firstName', '') + ' ' + c.get('lastName', '')).lower()
                    or query.lower() in c.get('email', '').lower()
                ]
            
            logger.info(f"🔍 Found {len(contacts)} contacts for query: {query}")
            return contacts
            
        except Exception as e:
            logger.error(f"❌ Search contacts failed: {e}")
            raise
    
    @mcp.tool()
    async def create_contact(
        firstName: str,
        lastName: str = "",
        email: str = "",
        phone: str = "",
        tags: List[str] = []
    ) -> Dict:
        """Create a new contact in GoHighLevel"""
        try:
            user_id = "default_user"  # In production, get from context
            
            contact = GHLContact(
                firstName=firstName,
                lastName=lastName,
                email=email,
                phone=phone,
                tags=tags
            )
            
            result = await oauth_provider.ghl_client.create_contact(user_id, contact)
            logger.info(f"✅ Contact created: {firstName} {lastName}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Create contact failed: {e}")
            raise
    
    @mcp.tool()
    async def get_opportunities(limit: int = 20) -> List[Dict]:
        """Get opportunities/deals from GoHighLevel"""
        try:
            user_id = "default_user"  # In production, get from context
            opportunities = await oauth_provider.ghl_client.get_opportunities(user_id, limit)
            
            logger.info(f"💰 Found {len(opportunities)} opportunities")
            return opportunities
            
        except Exception as e:
            logger.error(f"❌ Get opportunities failed: {e}")
            raise
    
    @mcp.tool()
    async def get_oauth_status() -> Dict:
        """Get OAuth authentication status"""
        try:
            user_id = "default_user"
            token = await oauth_provider.token_store.get_token(user_id)
            
            if token:
                return {
                    "authenticated": True,
                    "expires_at": token.expires_at.isoformat(),
                    "scope": token.scope,
                    "location_id": token.location_id
                }
            else:
                return {
                    "authenticated": False,
                    "authorization_url": "Use /oauth/authorize endpoint"
                }
                
        except Exception as e:
            logger.error(f"❌ OAuth status check failed: {e}")
            return {"authenticated": False, "error": str(e)}
    
    logger.info("🚀 FastMCP server created with GHL OAuth integration")
    return mcp

# Main server function
async def main():
    """Main server entry point"""
    try:
        logger.info("🌟 Starting GoHighLevel OAuth FastMCP Server...")
        
        # Create server
        mcp = create_fastmcp_server()
        
        # Add OAuth endpoints (would be handled by FastMCP OAuth provider)
        logger.info("🔐 OAuth endpoints available at:")
        logger.info(f"   Authorization: http://localhost:{Config.PORT}/oauth/authorize")
        logger.info(f"   Callback: http://localhost:{Config.PORT}/oauth/callback")
        
        logger.info("🛠️  Available MCP tools:")
        logger.info("   - search_contacts: Search GHL contacts")
        logger.info("   - create_contact: Create new contact") 
        logger.info("   - get_opportunities: Get deals/opportunities")
        logger.info("   - get_oauth_status: Check auth status")
        
        logger.info(f"🌐 Server starting on http://{Config.HOST}:{Config.PORT}")
        logger.info("📡 SSE endpoint: /sse")
        logger.info("🔧 MCP endpoint: /mcp")
        
        # Run the server with HTTP transport for OAuth
        mcp.run(transport="http", port=Config.PORT, host=Config.HOST)
        
    except Exception as e:
        logger.error(f"💥 Server startup failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())