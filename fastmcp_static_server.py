#!/usr/bin/env python3
"""
FastMCP Static Token Server for GoHighLevel Integration
======================================================

This server uses static PIT tokens for GoHighLevel API access
and exposes GHL functionality through MCP protocol.

Features:
- Static PIT token authentication (simpler than OAuth)
- FastMCP server implementation
- GoHighLevel API integration
- SSE transport for remote connections
- Ready for Docker/Nixpacks deployment
"""

import asyncio
import os
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

import httpx
from fastmcp import FastMCP
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
    
    # Static Token Configuration
    GHL_API_KEY = os.getenv('GHL_API_KEY', 'pit-073a3acb-e25e-42f1-a59e-9aff93b90435')
    GHL_LOCATION_ID = os.getenv('GHL_LOCATION_ID', 'beHVzRjFV0tTtY3BxII2')
    GHL_BASE_URL = os.getenv('GHL_BASE_URL', 'https://services.leadconnectorhq.com')
    
    # Server Configuration
    PORT = int(os.getenv('PORT', '8000'))
    HOST = os.getenv('HOST', '0.0.0.0')
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if not cls.GHL_API_KEY or not cls.GHL_LOCATION_ID:
            raise ValueError("GHL_API_KEY and GHL_LOCATION_ID must be set")
        logger.info(f"✅ Configuration validated - API Key: {cls.GHL_API_KEY[:8]}...")
        logger.info(f"✅ Location ID: {cls.GHL_LOCATION_ID}")

# Data Models
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

# GoHighLevel API Client with Static Token
class GHLStaticClient:
    """GoHighLevel API client with static PIT token"""
    
    def __init__(self):
        self.api_key = Config.GHL_API_KEY
        self.location_id = Config.GHL_LOCATION_ID
        self.base_url = Config.GHL_BASE_URL
        
    def _get_headers(self) -> Dict[str, str]:
        """Get authenticated headers for API calls"""
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Version': '2021-07-28'
        }
    
    async def test_connection(self) -> Dict:
        """Test API connection"""
        headers = self._get_headers()
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/contacts",
                    headers=headers,
                    params={'locationId': self.location_id, 'limit': 1}
                )
                response.raise_for_status()
                
                logger.info("✅ GHL API connection successful")
                return {'status': 'connected', 'api_key': f"{self.api_key[:8]}..."}
                
            except Exception as e:
                logger.error(f"❌ GHL API connection failed: {e}")
                raise
    
    async def get_contacts(self, limit: int = 20, query: str = "") -> List[Dict]:
        """Get contacts from GHL"""
        headers = self._get_headers()
        params = {
            'locationId': self.location_id,
            'limit': limit
        }
        
        if query:
            params['query'] = query
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/contacts",
                headers=headers,
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            contacts = data.get('contacts', [])
            logger.info(f"📞 Retrieved {len(contacts)} contacts")
            return contacts
    
    async def create_contact(self, contact: GHLContact) -> Dict:
        """Create a new contact in GHL"""
        headers = self._get_headers()
        
        contact_data = contact.model_dump(exclude_unset=True)
        contact_data['locationId'] = self.location_id
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/contacts",
                headers=headers,
                json=contact_data
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"✅ Contact created: {contact.firstName} {contact.lastName}")
            return result
    
    async def get_opportunities(self, limit: int = 20) -> List[Dict]:
        """Get opportunities from GHL"""
        headers = self._get_headers()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/opportunities",
                headers=headers,
                params={
                    'locationId': self.location_id,
                    'limit': limit
                }
            )
            response.raise_for_status()
            
            data = response.json()
            opportunities = data.get('opportunities', [])
            logger.info(f"💰 Retrieved {len(opportunities)} opportunities")
            return opportunities
    
    async def get_pipelines(self) -> List[Dict]:
        """Get pipelines from GHL"""
        headers = self._get_headers()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/opportunities/pipelines",
                headers=headers,
                params={'locationId': self.location_id}
            )
            response.raise_for_status()
            
            data = response.json()
            pipelines = data.get('pipelines', [])
            logger.info(f"📊 Retrieved {len(pipelines)} pipelines")
            return pipelines

# Initialize FastMCP Server
def create_fastmcp_server() -> FastMCP:
    """Create and configure FastMCP server"""
    
    # Validate configuration
    Config.validate()
    
    # Create GHL client
    ghl_client = GHLStaticClient()
    
    # Create FastMCP server (no auth needed for static token)
    mcp = FastMCP(
        name="GoHighLevel Static MCP Server",
        instructions="""
        This server provides authenticated access to GoHighLevel CRM functionality using static PIT tokens.
        
        Available tools:
        - test_connection: Test GHL API connection
        - search_contacts: Search for contacts in GHL
        - create_contact: Create a new contact
        - get_opportunities: Get opportunities/deals
        - get_pipelines: Get available pipelines
        
        Authentication is handled via static PIT token.
        """,
    )
    
    # Add GHL API tools
    @mcp.tool()
    async def test_connection() -> Dict:
        """Test connection to GoHighLevel API"""
        try:
            result = await ghl_client.test_connection()
            return {
                "status": "success",
                "message": "Connected to GoHighLevel API",
                "details": result
            }
        except Exception as e:
            logger.error(f"❌ Connection test failed: {e}")
            return {
                "status": "error", 
                "message": f"Connection failed: {str(e)}"
            }
    
    @mcp.tool()
    async def search_contacts(query: str = "", limit: int = 20) -> Dict:
        """Search for contacts in GoHighLevel CRM"""
        try:
            contacts = await ghl_client.get_contacts(limit=limit, query=query)
            
            return {
                "status": "success",
                "count": len(contacts),
                "contacts": contacts,
                "query": query
            }
            
        except Exception as e:
            logger.error(f"❌ Search contacts failed: {e}")
            return {
                "status": "error",
                "message": f"Search failed: {str(e)}"
            }
    
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
            contact = GHLContact(
                firstName=firstName,
                lastName=lastName,
                email=email,
                phone=phone,
                tags=tags
            )
            
            result = await ghl_client.create_contact(contact)
            
            return {
                "status": "success",
                "message": f"Contact created: {firstName} {lastName}",
                "contact": result
            }
            
        except Exception as e:
            logger.error(f"❌ Create contact failed: {e}")
            return {
                "status": "error",
                "message": f"Contact creation failed: {str(e)}"
            }
    
    @mcp.tool()
    async def get_opportunities(limit: int = 20) -> Dict:
        """Get opportunities/deals from GoHighLevel"""
        try:
            opportunities = await ghl_client.get_opportunities(limit=limit)
            
            return {
                "status": "success",
                "count": len(opportunities),
                "opportunities": opportunities
            }
            
        except Exception as e:
            logger.error(f"❌ Get opportunities failed: {e}")
            return {
                "status": "error",
                "message": f"Failed to get opportunities: {str(e)}"
            }
    
    @mcp.tool()
    async def get_pipelines() -> Dict:
        """Get available pipelines from GoHighLevel"""
        try:
            pipelines = await ghl_client.get_pipelines()
            
            return {
                "status": "success",
                "count": len(pipelines),
                "pipelines": pipelines
            }
            
        except Exception as e:
            logger.error(f"❌ Get pipelines failed: {e}")
            return {
                "status": "error",
                "message": f"Failed to get pipelines: {str(e)}"
            }
    
    logger.info("🚀 FastMCP server created with GHL static token integration")
    return mcp

# Main server function
async def main():
    """Main server entry point"""
    try:
        logger.info("🌟 Starting GoHighLevel Static FastMCP Server...")
        
        # Create server
        mcp = create_fastmcp_server()
        
        # Test connection on startup
        ghl_client = GHLStaticClient()
        await ghl_client.test_connection()
        
        logger.info("🛠️  Available MCP tools:")
        logger.info("   - test_connection: Test GHL API connection")
        logger.info("   - search_contacts: Search GHL contacts")
        logger.info("   - create_contact: Create new contact") 
        logger.info("   - get_opportunities: Get deals/opportunities")
        logger.info("   - get_pipelines: Get available pipelines")
        
        logger.info(f"🌐 Server starting on http://{Config.HOST}:{Config.PORT}")
        logger.info("📡 SSE endpoint: /sse")
        logger.info("🔧 MCP endpoint: /mcp")
        
        # Run the server with HTTP transport
        mcp.run(transport="http", port=Config.PORT, host=Config.HOST)
        
    except Exception as e:
        logger.error(f"💥 Server startup failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())