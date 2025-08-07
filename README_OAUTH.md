# GoHighLevel OAuth FastMCP Server

🚀 **A FastMCP server with OAuth 2.1 authentication for GoHighLevel API integration**

## Overview

This implementation provides:

- **OAuth 2.1 Authentication** with PKCE for secure GoHighLevel API access
- **FastMCP Framework** for modern MCP server architecture  
- **Token Management** with automatic refresh capabilities
- **GoHighLevel API Integration** for contacts, opportunities, workflows
- **SSE Transport** for remote client connections

## Features

### 🔐 OAuth 2.1 Security
- Authorization Code Grant with PKCE (Proof Key for Code Exchange)
- Secure token storage and automatic refresh
- State parameter for CSRF protection
- Scoped permissions for granular access control

### 🛠️ MCP Tools Available
- `search_contacts` - Search GoHighLevel contacts
- `create_contact` - Create new contacts
- `get_opportunities` - Retrieve deals/opportunities  
- `get_oauth_status` - Check authentication status

### 🌐 Transport Support
- **HTTP** - For OAuth flows and web interfaces
- **SSE** - For real-time client connections
- **STDIO** - For local development

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `oauth.env.example` to `.env` and configure:

```env
# OAuth Configuration (Required)
GHL_CLIENT_ID=your_ghl_client_id_here
GHL_CLIENT_SECRET=your_ghl_client_secret_here
GHL_REDIRECT_URI=http://localhost:8000/oauth/callback

# Server Configuration
PORT=8000
HOST=0.0.0.0
```

### 3. Create GoHighLevel App

1. Go to [GoHighLevel Developer Portal](https://marketplace.gohighlevel.com/)
2. Create a new OAuth application
3. Set redirect URI to: `http://localhost:8000/oauth/callback`
4. Copy Client ID and Secret to your `.env` file

### 4. Run the Server

```bash
python fastmcp_server.py
```

The server will start with:
- **OAuth endpoints**: `http://localhost:8000/oauth/*`
- **MCP endpoint**: `http://localhost:8000/mcp`
- **SSE endpoint**: `http://localhost:8000/sse`

## OAuth Flow

### For End Users

1. **Authorization**: Visit `/oauth/authorize` to start OAuth flow
2. **Consent**: Log in to GoHighLevel and grant permissions
3. **Callback**: Automatic redirect with authorization code
4. **Token Exchange**: Server exchanges code for access/refresh tokens
5. **API Access**: MCP tools now have authenticated GHL access

### For Developers

```python
from oauth_client import GHLOAuthClient

# Create OAuth client
client = GHLOAuthClient(
    client_id="your_client_id",
    client_secret="your_client_secret"
)

# Get authorization URL
auth_url = client.get_authorization_url()

# Exchange code for token
token = await client.exchange_code_for_token(code, state)
```

## MCP Client Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ghl-oauth": {
      "type": "sse",
      "url": "http://localhost:8000/sse",
      "auth": "oauth"
    }
  }
}
```

### With FastMCP Client

```python
from fastmcp import Client
from fastmcp.client.auth import OAuth

oauth = OAuth(mcp_url="http://localhost:8000/mcp")

async with Client("http://localhost:8000/mcp", auth=oauth) as client:
    # Search contacts
    contacts = await client.call_tool("search_contacts", {"query": "john"})
    
    # Create contact  
    result = await client.call_tool("create_contact", {
        "firstName": "Jane",
        "lastName": "Doe", 
        "email": "jane@example.com"
    })
```

## Configuration

### Required Scopes

The server requests these GoHighLevel permissions:

- `contacts.readonly` - Read contact data
- `contacts.write` - Create/update contacts
- `opportunities.readonly` - Read deals/opportunities
- `opportunities.write` - Create/update opportunities
- `calendars.readonly` - Read calendar data
- `calendars.write` - Manage appointments
- `conversations.readonly` - Read conversations
- `workflows.readonly` - Read automation workflows
- `locations.readonly` - Read location/sub-account data
- `users.readonly` - Read user information

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GHL_CLIENT_ID` | OAuth Client ID from GHL | ✅ |
| `GHL_CLIENT_SECRET` | OAuth Client Secret from GHL | ✅ |
| `GHL_REDIRECT_URI` | OAuth callback URL | ✅ |
| `GHL_BASE_URL` | GHL API base URL | No (default) |
| `PORT` | Server port | No (8000) |
| `HOST` | Server host | No (0.0.0.0) |

## Architecture

### Components

1. **OAuth Provider** (`GHLOAuthProvider`)
   - Handles OAuth 2.1 flow with PKCE
   - Manages token lifecycle
   - Integrates with FastMCP authentication

2. **API Client** (`GHLApiClient`) 
   - Authenticated HTTP client for GHL API
   - Automatic token refresh
   - Error handling and retries

3. **Token Store** (`TokenStore`)
   - In-memory token storage (development)
   - Production: Redis/Database recommended

4. **FastMCP Server**
   - MCP protocol implementation
   - Tool registration and execution
   - Transport layer (HTTP/SSE/STDIO)

### Security Features

- **PKCE** - Prevents authorization code interception
- **State Parameter** - CSRF protection
- **Secure Token Storage** - Encrypted at rest (production)
- **Automatic Refresh** - Prevents token expiration
- **Scoped Permissions** - Principle of least privilege

## Development

### Testing OAuth Flow

```bash
python oauth_client.py
```

This will:
1. Open browser for authorization
2. Handle callback and token exchange
3. Test API calls with token
4. Verify token refresh

### Adding New Tools

```python
@mcp.tool()
async def your_new_tool(param: str) -> dict:
    """Your tool description"""
    user_id = "default_user"  # Get from context
    
    # Use authenticated GHL client
    result = await oauth_provider.ghl_client.your_api_call(user_id, param)
    return result
```

### Production Deployment

1. **Database**: Replace in-memory storage with PostgreSQL/Redis
2. **HTTPS**: Use SSL certificates for OAuth security  
3. **Secrets**: Use proper secret management (AWS Secrets, etc.)
4. **Monitoring**: Add logging, metrics, health checks
5. **Scaling**: Consider multiple server instances

## Troubleshooting

### Common Issues

**❌ "Invalid client credentials"**
- Verify `GHL_CLIENT_ID` and `GHL_CLIENT_SECRET`
- Check GoHighLevel app configuration

**❌ "Redirect URI mismatch"**  
- Ensure `GHL_REDIRECT_URI` matches app settings
- Check for trailing slashes or protocol differences

**❌ "Token expired"**
- Server automatically refreshes tokens
- Check refresh token validity
- Re-authorize if refresh token expired

**❌ "Insufficient permissions"**
- Verify required scopes in app configuration
- User must grant all requested permissions

### Debug Mode

Set environment variables:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

## Comparison with Static API

| Feature | Static API Key | OAuth 2.1 |
|---------|---------------|-----------|
| **Security** | Medium | High |
| **User Control** | None | Full consent |
| **Token Expiry** | Never | 24 hours |
| **Refresh** | N/A | Automatic |
| **Revocation** | Manual | User-controlled |
| **Compliance** | Basic | Enterprise-ready |

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality  
4. Update documentation
5. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [FastMCP Documentation](https://fastmcp.com/docs)
- 🔗 [GoHighLevel API Docs](https://highlevel.stoplight.io/)
- 💬 [GitHub Issues](https://github.com/your-repo/issues)

---

**Built with ❤️ using FastMCP and GoHighLevel APIs**