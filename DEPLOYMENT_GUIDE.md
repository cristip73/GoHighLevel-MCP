# Deployment Guide - FastMCP GoHighLevel Server

🚀 **Deploy pe mcpghl.kilostop.ro cu Dokploy + Nixpacks**

## 📋 Deployment Steps

### 1. Pregătire Repository

```bash
# Asigură-te că ești pe branch-ul corect
git add .
git commit -m "Add FastMCP Static Server for deployment"
git push origin oauth-fastmcp-implementation
```

### 2. Dokploy Configuration

**În Dokploy Dashboard:**

1. **Create New Project**
   - Name: `fastmcp-ghl-server`
   - Domain: `mcpghl.kilostop.ro`

2. **Git Configuration**
   - Repository: `https://github.com/your-username/ghl-mcp-060825`
   - Branch: `oauth-fastmcp-implementation`
   - Build Path: `/`

3. **Build Configuration**
   - Builder: `Nixpacks`
   - Nixpacks Config: `nixpacks.toml` (already created)
   - Start Command: `python fastmcp_static_server.py`

4. **Environment Variables**
   ```
   GHL_API_KEY=pit-073a3acb-e25e-42f1-a59e-9aff93b90435
   GHL_LOCATION_ID=beHVzRjFV0tTtY3BxII2
   GHL_BASE_URL=https://services.leadconnectorhq.com
   PORT=8000
   HOST=0.0.0.0
   NODE_ENV=production
   PYTHONUNBUFFERED=1
   ```

5. **Port Configuration**
   - Internal Port: `8000`
   - External Port: `80` (HTTP) / `443` (HTTPS)

### 3. Domain & SSL

1. **DNS Configuration**
   - Point `mcpghl.kilostop.ro` to VPS IP
   - Wait for DNS propagation

2. **SSL Certificate**
   - Dokploy auto-generates Let's Encrypt SSL
   - Enable "Force HTTPS" in settings

### 4. Health Checks

**Dokploy Health Check:**
- Path: `/health` (if implemented)
- Interval: 30s
- Timeout: 10s

## 🔧 Files Created for Deployment

### `fastmcp_static_server.py`
- **Simplified server** using static PIT token
- **No OAuth complexity** - direct API access
- **Same MCP functionality** as original server
- **Production ready** with proper error handling

### `nixpacks.toml`
- **Nixpacks configuration** for Python 3.13
- **Dependency installation** via pip
- **Build verification** with py_compile
- **Start command** configuration

### `Dockerfile`
- **Alternative deployment** method
- **Multi-stage build** for efficiency
- **Security** with non-root user
- **Health checks** included

### `deploy.env`
- **Production environment** variables
- **Your specific** GHL credentials
- **Ready to copy-paste** into Dokploy

## 🚀 Deployment Commands

### Option 1: Via Dokploy UI (Recommended)

1. Login to Dokploy dashboard
2. Create new project with above settings
3. Deploy automatically triggers on git push

### Option 2: Via Git Push

```bash
# Push to trigger auto-deployment
git push origin oauth-fastmcp-implementation
```

### Option 3: Manual Docker Deploy

```bash
# Build image
docker build -t fastmcp-ghl .

# Run container
docker run -p 8000:8000 --env-file deploy.env fastmcp-ghl
```

## 🧪 Testing Deployment

### 1. Server Health
```bash
curl https://mcpghl.kilostop.ro/health
```

### 2. MCP Endpoints
```bash
# SSE endpoint
curl https://mcpghl.kilostop.ro/sse

# MCP endpoint  
curl https://mcpghl.kilostop.ro/mcp
```

### 3. GHL API Test
```bash
curl -X POST https://mcpghl.kilostop.ro/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "test_connection"}}'
```

## 🔧 Configuration for Clients

### Claude Desktop
```json
{
  "mcpServers": {
    "ghl-static": {
      "type": "sse",
      "url": "https://mcpghl.kilostop.ro/sse"
    }
  }
}
```

### Cursor IDE
```json
{
  "mcpServers": {
    "ghl-static": {
      "type": "sse", 
      "url": "https://mcpghl.kilostop.ro/sse"
    }
  }
}
```

### OpenAI ChatGPT Custom Connectors
```
Server URL: https://mcpghl.kilostop.ro/sse/
Tools: search_contacts, create_contact, get_opportunities
```

## 🛠️ Available Tools After Deployment

1. **`test_connection`** - Test GHL API connectivity
2. **`search_contacts`** - Search contacts by query
3. **`create_contact`** - Create new contacts
4. **`get_opportunities`** - Retrieve deals/opportunities  
5. **`get_pipelines`** - Get available sales pipelines

## 🔍 Troubleshooting

### Common Issues

**❌ "Connection failed"**
- Check GHL_API_KEY is valid
- Verify GHL_LOCATION_ID is correct
- Ensure API key has required permissions

**❌ "Server not responding"**
- Check Dokploy logs
- Verify port 8000 is exposed
- Check DNS resolution

**❌ "SSL certificate error"**
- Wait for Let's Encrypt provisioning
- Check domain DNS settings
- Verify Dokploy SSL configuration

### Logs & Debugging

```bash
# Dokploy logs
dokploy logs fastmcp-ghl-server

# Manual server test
python fastmcp_static_server.py
```

## ✅ Deployment Checklist

- [ ] Repository pushed to git
- [ ] Dokploy project created
- [ ] Environment variables set
- [ ] Domain DNS configured
- [ ] SSL certificate active
- [ ] Health checks passing
- [ ] MCP endpoints responding
- [ ] GHL API connection tested
- [ ] Client configurations updated

## 🎯 Post-Deployment

1. **Update client configurations** with new server URL
2. **Test all MCP tools** through clients
3. **Monitor server logs** for errors
4. **Set up monitoring** alerts if needed

**🎉 Server ready at: https://mcpghl.kilostop.ro**