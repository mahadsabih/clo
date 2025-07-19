// Vercel-optimized OAuth Server - api/server.js
const express = require('express');
const session = require('express-session');
const { google } = require('googleapis');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// For Vercel, we need to handle the serverless environment
const isVercel = process.env.VERCEL || process.env.NOW_REGION;

// In-memory store for temporary auth data 
// Note: In production with Vercel, consider using Upstash Redis or similar
const authStore = new Map();

// Google OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.SERVER_URL}/auth/google/callback`
);

// CORS configuration for Vercel
app.use(cors({
  origin: [
    'https://www.figma.com',
    'https://figma.com',
    process.env.SERVER_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Session configuration for Vercel
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Always use secure cookies on Vercel
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'none' // Required for cross-origin cookies
  }
}));

app.use(express.json());

// Generate read/write key pairs for secure OAuth flow
function generateKeyPair() {
  const readKey = crypto.randomBytes(32).toString('hex');
  const writeKey = crypto.randomBytes(32).toString('hex');
  return { readKey, writeKey };
}

// Utility function to get server URL
function getServerUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.SERVER_URL || 'http://localhost:3000';
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Figma Plugin OAuth Server',
    status: 'running',
    environment: isVercel ? 'vercel' : 'local',
    serverUrl: getServerUrl()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start OAuth flow
app.get('/auth/google', (req, res) => {
  try {
    const { origin } = req.query;
    
    // Generate key pair for this auth session
    const { readKey, writeKey } = generateKeyPair();
    
    // Store the write key in session for verification later
    req.session.writeKey = writeKey;
    req.session.origin = origin;
    
    // Store the key pair in our temporary store
    authStore.set(writeKey, {
      readKey,
      writeKey,
      timestamp: Date.now(),
      sessionId: req.session.id
    });
    
    // Clean up old entries (older than 10 minutes)
    cleanupAuthStore();
    
    // Update OAuth callback URL for current deployment
    oauth2Client.redirectUri = `${getServerUrl()}/auth/google/callback`;
    
    // Generate OAuth URL with state parameter containing write key
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: writeKey,
      prompt: 'consent' // Force consent screen for refresh tokens
    });
    
    console.log('Starting OAuth flow with write key:', writeKey);
    res.redirect(authUrl);
    
  } catch (error) {
    console.error('Error starting OAuth flow:', error);
    res.status(500).send(`
      <h2>Authentication Error</h2>
      <p>Failed to start authentication process.</p>
      <p>Please close this window and try again in Figma.</p>
      <details>
        <summary>Error Details</summary>
        <pre>${error.message}</pre>
      </details>
    `);
  }
});

// OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state: writeKey, error } = req.query;
    
    if (error) {
      console.error('OAuth error:', error);
      return res.send(`
        <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
              .error { color: #d73a49; }
              .retry-btn { 
                background: #0366d6; color: white; border: none; 
                padding: 10px 20px; border-radius: 6px; margin-top: 20px;
                cursor: pointer; font-size: 14px;
              }
            </style>
          </head>
          <body>
            <h2 class="error">❌ Authentication Error</h2>
            <p>Error: ${error}</p>
            <p>Please close this window and try again in Figma.</p>
            <button class="retry-btn" onclick="window.close()">Close Window</button>
          </body>
        </html>
      `);
    }
    
    if (!code || !writeKey) {
      return res.status(400).send(`
        <html>
          <head><title>Invalid Request</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
            <h2>❌ Invalid Request</h2>
            <p>Missing authorization code or state parameter.</p>
            <button onclick="window.close()" style="background: #0366d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
          </body>
        </html>
      `);
    }
    
    // Verify write key matches what we stored in session
    if (req.session.writeKey !== writeKey) {
      console.error('Write key mismatch:', { session: req.session.writeKey, provided: writeKey });
      return res.status(400).send(`
        <html>
          <head><title>Security Error</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
            <h2>❌ Security Error</h2>
            <p>Invalid state parameter. This could indicate a security issue.</p>
            <button onclick="window.close()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
          </body>
        </html>
      `);
    }
    
    // Get the stored auth data
    const authData = authStore.get(writeKey);
    if (!authData) {
      return res.status(400).send(`
        <html>
          <head><title>Session Expired</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
            <h2>⏰ Session Expired</h2>
            <p>Authentication session has expired. Please try again.</p>
            <button onclick="window.close()" style="background: #0366d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
          </body>
        </html>
      `);
    }
    
    try {
      // Update OAuth client redirect URI
      oauth2Client.redirectUri = `${getServerUrl()}/auth/google/callback`;
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      
      // Get user information
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfoResponse = await oauth2.userinfo.get();
      const userInfo = userInfoResponse.data;
      
      // Store the authentication result using write key
      authStore.set(writeKey, {
        ...authData,
        token: tokens.access_token,
        refreshToken: tokens.refresh_token,
        userInfo: {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture
        },
        authenticated: true,
        timestamp: Date.now()
      });
      
      console.log('Authentication successful for user:', userInfo.email);
      
      res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 40px; 
                text-align: center; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 80vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              .success-icon { font-size: 64px; margin-bottom: 20px; }
              .user-info { 
                background: rgba(255,255,255,0.1); 
                padding: 20px; 
                border-radius: 10px; 
                margin: 20px 0; 
                backdrop-filter: blur(10px);
              }
              .close-btn { 
                background: rgba(255,255,255,0.2); 
                color: white; 
                border: 2px solid rgba(255,255,255,0.3); 
                padding: 12px 24px; 
                border-radius: 8px; 
                margin-top: 20px;
                cursor: pointer; 
                font-size: 16px;
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
              }
              .close-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
              }
            </style>
          </head>
          <body>
            <div class="success-icon">✅</div>
            <h1>Authentication Successful!</h1>
            <div class="user-info">
              <h3>Welcome, ${userInfo.name}!</h3>
              <p>Email: ${userInfo.email}</p>
            </div>
            <p>You can now close this window and return to Figma.</p>
            <button class="close-btn" onclick="window.close()">Close Window</button>
            <script>
              // Auto-close after 3 seconds
              setTimeout(() => {
                try {
                  window.close();
                } catch(e) {
                  console.log('Could not auto-close window');
                }
              }, 3000);
            </script>
          </body>
        </html>
      `);
      
    } catch (tokenError) {
      console.error('Error exchanging code for token:', tokenError);
      res.status(500).send(`
        <html>
          <head><title>Token Exchange Error</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
            <h2>❌ Authentication Failed</h2>
            <p>Failed to exchange authorization code for access token.</p>
            <p>Please close this window and try again.</p>
            <button onclick="window.close()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send(`
      <html>
        <head><title>Server Error</title></head>
        <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
          <h2>❌ Server Error</h2>
          <p>An unexpected error occurred during authentication.</p>
          <button onclick="window.close()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
        </body>
      </html>
    `);
  }
});

// Check authentication status (polling endpoint)
app.get('/auth/check', (req, res) => {
  try {
    const sessionId = req.session.id;
    const writeKey = req.session.writeKey;
    
    if (!writeKey) {
      return res.json({ authenticated: false, message: 'No active session' });
    }
    
    const authData = authStore.get(writeKey);
    
    if (!authData) {
      return res.json({ authenticated: false, message: 'Session expired' });
    }
    
    if (authData.authenticated && authData.token) {
      // Return the token and clean up
      const result = {
        authenticated: true,
        token: authData.token,
        userInfo: authData.userInfo
      };
      
      // Clean up the auth data after successful retrieval
      authStore.delete(writeKey);
      req.session.writeKey = null;
      
      return res.json(result);
    }
    
    res.json({ authenticated: false, message: 'Authentication pending' });
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

// Utility function to clean up old auth store entries
function cleanupAuthStore() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [key, value] of authStore.entries()) {
    if (now - value.timestamp > maxAge) {
      authStore.delete(key);
    }
  }
}

// Clean up old entries periodically (but not on every request in serverless)
if (!isVercel) {
  setInterval(cleanupAuthStore, 5 * 60 * 1000);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
module.exports = app;

// For local development
if (!isVercel) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 OAuth server running on port ${PORT}`);
    console.log(`📝 Make sure to set up your environment variables`);
  });
}
