module.exports = {
  mcp: {
    endpoint: process.env.CANVA_MCP_ENDPOINT || 'https://mcp.canva.com',
  },
  api: {
    baseUrl: process.env.CANVA_API_BASE_URL || 'https://api.canva.com/rest/v1',
  },
  oauth: {
    clientId: process.env.CANVA_CLIENT_ID,
    clientSecret: process.env.CANVA_CLIENT_SECRET,
    redirectUri: process.env.CANVA_REDIRECT_URI,
    scopes: (process.env.CANVA_SCOPES || 'design:content:read design:content:write asset:read').split(' '),
  },
  providerPriority: ['mcp', 'api', 'local'],
};
