// // Vercel-optimized OAuth Server - api/server.js
// const express = require('express');
// const session = require('express-session');
// const MemoryStore = require('memorystore')(session);
// const { google } = require('googleapis');
// const crypto = require('crypto');
// const cors = require('cors');

// const app = express();

// // Hardcoded configuration values
// const GOOGLE_CLIENT_ID = '1038292507497-dfm20rl60dc831no8qf6s4qdrmehhsbs.apps.googleusercontent.com';
// const GOOGLE_CLIENT_SECRET = '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';
// const SESSION_SECRET = '61a3020134061725b19fd4d2ac3f825713ec95cf4259f3ce65d121792be25188';
// const SERVER_URL = 'https://legendary-fishstick-4j6vv65xr9p92j46p-3000.app.github.dev';
// const NODE_ENV = 'development';
// const PORT = 3000;

// const isVercel = process.env.VERCEL || process.env.NOW_REGION;

// const authStore = new Map();

// const oauth2Client = new google.auth.OAuth2(
//   GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET,
//   (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : SERVER_URL) + '/auth/google/callback'
// );

// app.set('trust proxy', true);

// app.use(session({
//   store: new MemoryStore({
//     checkPeriod: 86400000
//   }),
//   secret: SESSION_SECRET,
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     secure: NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000,
//     sameSite: 'lax'
//   }
// }));

// app.use(cors({
//   origin: (origin, callback) => {
//     console.log('CORS check:', { origin, allowed: true });
//     callback(null, origin === 'null' || !origin ? true : origin);
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
//   exposedHeaders: ['Access-Control-Allow-Origin']
// }));

// app.options('*', cors(), (req, res) => {
//   console.log('Handling OPTIONS:', { path: req.path, origin: req.headers.origin });
//   res.set({
//     'Access-Control-Allow-Origin': req.headers.origin || 'null',
//     'Access-Control-Allow-Credentials': 'true',
//     'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
//     'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie'
//   }).status(204).send();
// });

// app.use((req, res, next) => {
//   console.log('Request received:', {
//     method: req.method,
//     path: req.path,
//     headers: req.headers,
//     sessionId: req.session?.id || 'No session',
//     cookies: req.headers.cookie || 'No cookies'
//   });
//   next();
// });

// app.use(express.json());

// function generateKeyPair() {
//   const readKey = crypto.randomBytes(32).toString('hex');
//   const writeKey = crypto.randomBytes(32).toString('hex');
//   return { readKey, writeKey };
// }

// function getServerUrl() {
//   if (process.env.VERCEL_URL) {
//     return 'https://' + process.env.VERCEL_URL;
//   }
//   return SERVER_URL;
// }

// app.get('/', (req, res) => {
//   res.json({
//     message: 'Figma Plugin OAuth Server',
//     status: 'running',
//     environment: isVercel ? 'vercel' : 'local',
//     serverUrl: getServerUrl()
//   });
// });

// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'ok', 
//     timestamp: new Date().toISOString(),
//     environment: NODE_ENV
//   });
// });

// app.get('/auth/google', (req, res) => {
//   try {
//     const { origin, sessionId } = req.query;
    
//     if (!sessionId) {
//       console.error('Missing sessionId in /auth/google');
//       return res.status(400).send('Missing sessionId parameter');
//     }
    
//     const { readKey, writeKey } = generateKeyPair();
    
//     req.session.writeKey = writeKey;
//     req.session.origin = origin;
//     req.session.clientSessionId = sessionId;
    
//     console.log('Starting OAuth flow:', {
//       sessionId: req.session.id,
//       clientSessionId: sessionId,
//       writeKey,
//       origin,
//       cookie: req.headers.cookie || 'No cookie'
//     });
    
//     authStore.set(writeKey, {
//       readKey,
//       writeKey,
//       clientSessionId: sessionId,
//       timestamp: Date.now(),
//       sessionId: req.session.id
//     });
    
//     cleanupAuthStore();
    
//     oauth2Client.redirectUri = getServerUrl() + '/auth/google/callback';
    
//     const authUrl = oauth2Client.generateAuthUrl({
//       access_type: 'offline',
//       scope: [
//         'https://www.googleapis.com/auth/userinfo.profile',
//         'https://www.googleapis.com/auth/userinfo.email'
//       ],
//       state: writeKey,
//       prompt: 'consent'
//     });
    
//     console.log('Redirecting to OAuth URL:', authUrl);
//     res.redirect(authUrl);
    
//   } catch (error) {
//     console.error('Error starting OAuth flow:', error);
//     res.status(500).send(`
//       <h2>Authentication Error</h2>
//       <p>Failed to start authentication process.</p>
//       <p>Please close this window and try again in Figma.</p>
//       <details>
//         <summary>Error Details</summary>
//         <pre>${error.message}</pre>
//       </details>
//     `);
//   }
// });

// app.get('/auth/google/callback', async (req, res) => {
//   try {
//     const { code, state: writeKey, error } = req.query;
    
//     console.log('Callback received:', {
//       sessionId: req.session?.id || 'No session',
//       sessionWriteKey: req.session?.writeKey || 'No writeKey',
//       providedWriteKey: writeKey,
//       clientSessionId: req.session?.clientSessionId || 'No clientSessionId',
//       code,
//       error,
//       cookie: req.headers.cookie || 'No cookie'
//     });
    
//     if (error) {
//       console.error('OAuth error:', error);
//       return res.send(`
//         <html>
//           <head>
//             <title>Authentication Error</title>
//             <style>
//               body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
//               .error { color: #d73a49; }
//               .retry-btn { 
//                 background: #0366d6; color: white; border: none; 
//                 padding: 10px 20px; border-radius: 6px; margin-top: 20px;
//                 cursor: pointer; font-size: 14px;
//               }
//             </style>
//           </head>
//           <body>
//             <h2 class="error">❌ Authentication Error</h2>
//             <p>Error: ${error}</p>
//             <p>Please close this window and try again in Figma.</p>
//             <button class="retry-btn" onclick="attemptClose()">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//               setTimeout(attemptClose, 3000);
//             </script>
//           </body>
//         </html>
//       `);
//     }
    
//     if (!code || !writeKey) {
//       return res.status(400).send(`
//         <html>
//           <head><title>Invalid Request</title></head>
//           <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
//             <h2>❌ Invalid Request</h2>
//             <p>Missing authorization code or state parameter.</p>
//             <button onclick="attemptClose()" style="background: #0366d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//             </script>
//           </body>
//         </html>
//       `);
//     }
    
//     if (!req.session || req.session.writeKey !== writeKey) {
//       console.error('Write key mismatch:', { session: req.session?.writeKey || 'No session', provided: writeKey });
//       return res.status(400).send(`
//         <html>
//           <head><title>Security Error</title></head>
//           <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
//             <h2>❌ Security Error</h2>
//             <p>Invalid state parameter. This could indicate a security issue.</p>
//             <button onclick="attemptClose()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//             </script>
//           </body>
//         </html>
//       `);
//     }
    
//     const authData = authStore.get(writeKey);
//     if (!authData) {
//       return res.status(400).send(`
//         <html>
//           <head><title>Session Expired</title></head>
//           <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
//             <h2>⏰ Session Expired</h2>
//             <p>Authentication session has expired. Please try again.</p>
//             <button onclick="attemptClose()" style="background: #0366d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//             </script>
//           </body>
//         </html>
//       `);
//     }
    
//     if (authData.authenticated) {
//       console.log('Callback already processed for writeKey:', writeKey);
//       return res.send(`
//         <html>
//           <head>
//             <title>Authentication Already Completed</title>
//             <style>
//               body { 
//                 font-family: Arial, sans-serif; 
//                 margin: 40px; 
//                 text-align: center; 
//                 background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                 color: white;
//                 min-height: 80vh;
//                 display: flex;
//                 flex-direction: column;
//                 justify-content: center;
//                 align-items: center;
//               }
//               .success-icon { font-size: 64px; margin-bottom: 20px; }
//               .close-btn { 
//                 background: rgba(255,255,255,0.2); 
//                 color: white; 
//                 border: 2px solid rgba(255,255,255,0.3); 
//                 padding: 12px 24px; 
//                 border-radius: 8px; 
//                 margin-top: 20px;
//                 cursor: pointer; 
//                 font-size: 16px;
//                 backdrop-filter: blur(10px);
//                 transition: all 0.3s ease;
//               }
//               .close-btn:hover {
//                 background: rgba(255,255,255,0.3);
//                 transform: translateY(-2px);
//               }
//             </style>
//           </head>
//           <body>
//             <div class="success-icon">✅</div>
//             <h1>Authentication Already Completed</h1>
//             <p>You have already authenticated. Please close this window and return to Figma.</p>
//             <p><strong>Write Key (if needed): ${writeKey}</strong></p>
//             <button class="close-btn" onclick="attemptClose()">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function sendPostMessage() {
//                 console.log('Attempting to send postMessage with writeKey: ${writeKey}');
//                 try {
//                   window.opener?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
//                   window.top?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
//                   window.parent?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
//                   console.log('postMessage sent to opener, top, and parent');
//                 } catch (e) {
//                   console.error('Failed to send postMessage:', e);
//                 }
//               }
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   sendPostMessage();
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//               sendPostMessage();
//               setTimeout(sendPostMessage, 1000);
//               setTimeout(sendPostMessage, 3000);
//               setTimeout(attemptClose, 5000);
//             </script>
//           </body>
//         </html>
//       `);
//     }
    
//     try {
//       oauth2Client.redirectUri = getServerUrl() + '/auth/google/callback';
      
//       const { tokens } = await oauth2Client.getToken(code);
//       oauth2Client.setCredentials(tokens);
      
//       const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
//       const userInfoResponse = await oauth2.userinfo.get();
//       const userInfo = userInfoResponse.data;
      
//       authStore.set(writeKey, {
//         ...authData,
//         token: tokens.access_token,
//         refreshToken: tokens.refresh_token,
//         userInfo: {
//           id: userInfo.id,
//           name: userInfo.name,
//           email: userInfo.email,
//           picture: userInfo.picture
//         },
//         authenticated: true,
//         timestamp: Date.now()
//       });
      
//       console.log('Authentication successful for user:', userInfo.email);
      
//       res.send(`
//         <html>
//           <head>
//             <title>Authentication Successful</title>
//             <style>
//               body { 
//                 font-family: Arial, sans-serif; 
//                 margin: 40px; 
//                 text-align: center; 
//                 background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//                 color: white;
//                 min-height: 80vh;
//                 display: flex;
//                 flex-direction: column;
//                 justify-content: center;
//                 align-items: center;
//               }
//               .success-icon { font-size: 64px; margin-bottom: 20px; }
//               .user-info { 
//                 background: rgba(255,255,255,0.1); 
//                 padding: 20px; 
//                 border-radius: 10px; 
//                 margin: 20px 0; 
//                 backdrop-filter: blur(10px);
//               }
//               .close-btn { 
//                 background: rgba(255,255,255,0.2); 
//                 color: white; 
//                 border: 2px solid rgba(255,255,255,0.3); 
//                 padding: 12px 24px; 
//                 border-radius: 8px; 
//                 margin-top: 20px;
//                 cursor: pointer; 
//                 font-size: 16px;
//                 backdrop-filter: blur(10px);
//                 transition: all 0.3s ease;
//               }
//               .close-btn:hover {
//                 background: rgba(255,255,255,0.3);
//                 transform: translateY(-2px);
//               }
//               .writekey { 
//                 font-size: 14px; 
//                 background: rgba(0,0,0,0.2); 
//                 padding: 10px; 
//                 border-radius: 6px; 
//                 word-break: break-all;
//               }
//             </style>
//           </head>
//           <body>
//             <div class="success-icon">✅</div>
//             <h1>Authentication Successful!</h1>
//             <div class="user-info">
//               <h3>Welcome, ${userInfo.name}!</h3>
//               <p>Email: ${userInfo.email}</p>
//             </div>
//             <p>You can now close this window and return to Figma.</p>
//             <p class="writekey">Write Key (if prompted in Figma): <strong>${writeKey}</strong></p>
//             <button class="close-btn" onclick="attemptClose()">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function sendPostMessage() {
//                 console.log('Attempting to send postMessage with writeKey: ${writeKey}');
//                 try {
//                   window.opener?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
//                   window.top?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
//                   window.parent?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
//                   console.log('postMessage sent to opener, top, and parent');
//                 } catch (e) {
//                   console.error('Failed to send postMessage:', e);
//                 }
//               }
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   sendPostMessage();
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//               sendPostMessage();
//               setTimeout(sendPostMessage, 1000);
//               setTimeout(sendPostMessage, 3000);
//               setTimeout(attemptClose, 5000);
//             </script>
//           </body>
//         </html>
//       `);
      
//     } catch (tokenError) {
//       console.error('Error exchanging code for token:', tokenError);
//       res.status(500).send(`
//         <html>
//           <head><title>Token Exchange Error</title></head>
//           <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
//             <h2>❌ Authentication Failed</h2>
//             <p>Failed to exchange authorization code for access token.</p>
//             <p>Please close this window and try again.</p>
//             <button onclick="attemptClose()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
//             <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//             <script>
//               function attemptClose() {
//                 console.log('Attempting to close window');
//                 try {
//                   window.close();
//                   console.log('Window closed successfully');
//                 } catch (e) {
//                   console.error('Failed to close window:', e);
//                   document.getElementById('close-error').style.display = 'block';
//                 }
//               }
//             </script>
//           </body>
//         </html>
//       `);
//     }
    
//   } catch (error) {
//     console.error('Callback error:', error);
//     res.status(500).send(`
//       <html>
//         <head><title>Server Error</title></head>
//         <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
//           <h2>❌ Server Error</h2>
//           <p>An unexpected error occurred during authentication.</p>
//           <button onclick="attemptClose()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
//           <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
//           <script>
//             function attemptClose() {
//               console.log('Attempting to close window');
//               try {
//                 window.close();
//                 console.log('Window closed successfully');
//               } catch (e) {
//                 console.error('Failed to close window:', e);
//                 document.getElementById('close-error').style.display = 'block';
//               }
//             }
//           </script>
//         </html>
//       `);
//   }
// });

// app.get('/auth/check', (req, res) => {
//   try {
//     const { writeKey, sessionId } = req.query;
    
//     res.set({
//       'Access-Control-Allow-Origin': req.headers.origin || 'null',
//       'Access-Control-Allow-Credentials': 'true'
//     });
    
//     console.log('Auth check requested:', {
//       sessionId: req.session?.id || 'No session',
//       clientSessionId: sessionId,
//       writeKey,
//       cookie: req.headers.cookie || 'No cookie',
//       origin: req.headers.origin || 'No origin',
//       headers: req.headers,
//       status: 'Processing'
//     });
    
//     if (!writeKey && !sessionId) {
//       console.log('Auth check response:', { authenticated: false, message: 'No writeKey or sessionId provided' });
//       return res.status(200).json({ authenticated: false, message: 'No writeKey or sessionId provided' });
//     }
    
//     let authData = null;
//     if (writeKey) {
//       authData = authStore.get(writeKey);
//     } else if (sessionId) {
//       for (const [key, value] of authStore.entries()) {
//         if (value.clientSessionId === sessionId) {
//           authData = value;
//           break;
//         }
//       }
//     }
    
//     if (!authData) {
//       console.log('Auth check response:', { authenticated: false, message: 'Session expired or invalid writeKey/sessionId' });
//       return res.status(200).json({ authenticated: false, message: 'Session expired or invalid writeKey/sessionId' });
//     }
    
//     if (authData.authenticated && authData.token) {
//       const response = {
//         authenticated: true,
//         token: authData.token,
//         userInfo: authData.userInfo
//       };
//       console.log('Auth check response:', response);
//       return res.status(200).json(response);
//     }
    
//     console.log('Auth check response:', { authenticated: false, message: 'Authentication pending' });
//     res.status(200).json({ authenticated: false, message: 'Authentication pending' });
    
//   } catch (error) {
//     console.error('Error checking auth status:', error);
//     res.status(500).json({ error: 'Failed to check authentication status' });
//   }
// });

// app.post('/auth/cleanup', (req, res) => {
//   try {
//     const { writeKey, sessionId } = req.body;
//     let deleted = false;
//     if (writeKey && authStore.has(writeKey)) {
//       authStore.delete(writeKey);
//       console.log('Cleaned up auth data for writeKey:', writeKey);
//       deleted = true;
//     }
//     if (sessionId) {
//       for (const [key, value] of authStore.entries()) {
//         if (value.clientSessionId === sessionId) {
//           authStore.delete(key);
//           console.log('Cleaned up auth data for sessionId:', sessionId);
//           deleted = true;
//           break;
//         }
//       }
//     }
//     res.status(200).json({ success: deleted });
//   } catch (error) {
//     console.error('Error cleaning up auth data:', error);
//     res.status(500).json({ error: 'Failed to clean up auth data' });
//   }
// });

// app.post('/auth/logout', (req, res) => {
//   req.session.destroy((err) => {
//     if (err) {
//       console.error('Error destroying session:', err);
//       return res.status(500).json({ error: 'Failed to logout' });
//     }
//     res.status(200).json({ success: true });
//   });
// });

// function cleanupAuthStore() {
//   const now = Date.now();
//   const maxAge = 10 * 60 * 1000;
  
//   for (const [key, value] of authStore.entries()) {
//     if (now - value.timestamp > maxAge) {
//       authStore.delete(key);
//     }
//   }
// }

// if (!isVercel) {
//   setInterval(cleanupAuthStore, 5 * 60 * 1000);
// }

// app.use((err, req, res, next) => {
//   console.error('Server error:', err);
//   res.status(500).json({ error: 'Internal server error' });
// });

// module.exports = app;

// if (!isVercel) {
//   app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 OAuth server running on port ${PORT}`);
//     console.log(`📝 Server configured for local testing`);
//   });
// }


// Vercel-optimized OAuth Server - api/server.js
const express = require('express');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
const { google } = require('googleapis');
const crypto = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Hardcoded configuration values
const GOOGLE_CLIENT_ID = '1038292507497-dfm20rl60dc831no8qf6s4qdrmehhsbs.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const SESSION_SECRET = '61a3020134061725b19fd4d2ac3f825713ec95cf4259f3ce65d121792be25188';
const SERVER_URL = 'https://legendary-fishstick-4j6vv65xr9p92j46p-3000.app.github.dev';
const NODE_ENV = 'development';
const PORT = 3000;

const isVercel = process.env.VERCEL || process.env.NOW_REGION;

const authStore = new Map();

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : SERVER_URL) + '/auth/google/callback'
);

app.set('trust proxy', true);

app.use(session({
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS check:', { origin, allowed: true });
    callback(null, origin === 'null' || !origin ? true : origin);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Access-Control-Allow-Origin']
}));

app.options('*', cors(), (req, res) => {
  console.log('Handling OPTIONS:', { path: req.path, origin: req.headers.origin });
  res.set({
    'Access-Control-Allow-Origin': req.headers.origin || 'null',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,Cookie'
  }).status(204).send();
});

app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    sessionId: req.session?.id || 'No session',
    cookies: req.headers.cookie || 'No cookies'
  });
  next();
});

app.use(express.json());

function generateKeyPair() {
  const readKey = crypto.randomBytes(32).toString('hex');
  const writeKey = crypto.randomBytes(32).toString('hex');
  return { readKey, writeKey };
}

function getServerUrl() {
  if (process.env.VERCEL_URL) {
    return 'https://' + process.env.VERCEL_URL;
  }
  return SERVER_URL;
}

app.get('/', (req, res) => {
  res.json({
    message: 'Figma Plugin OAuth Server',
    status: 'running',
    environment: isVercel ? 'vercel' : 'local',
    serverUrl: getServerUrl()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

app.get('/auth/google', (req, res) => {
  try {
    const { origin, sessionId } = req.query;

    if (!sessionId) {
      console.error('Missing sessionId in /auth/google');
      return res.status(400).send('Missing sessionId parameter');
    }

    const { readKey, writeKey } = generateKeyPair();

    req.session.writeKey = writeKey;
    req.session.origin = origin;
    req.session.clientSessionId = sessionId;

    console.log('Starting OAuth flow:', {
      sessionId: req.session.id,
      clientSessionId: sessionId,
      writeKey,
      origin,
      cookie: req.headers.cookie || 'No cookie'
    });

    authStore.set(writeKey, {
      readKey,
      writeKey,
      clientSessionId: sessionId,
      timestamp: Date.now(),
      sessionId: req.session.id
    });

    cleanupAuthStore();

    oauth2Client.redirectUri = getServerUrl() + '/auth/google/callback';

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: writeKey,
      prompt: 'consent'
    });

    console.log('Redirecting to OAuth URL:', authUrl);
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

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state: writeKey, error } = req.query;

    console.log('Callback received:', {
      sessionId: req.session?.id || 'No session',
      sessionWriteKey: req.session?.writeKey || 'No writeKey',
      providedWriteKey: writeKey,
      clientSessionId: req.session?.clientSessionId || 'No clientSessionId',
      code,
      error,
      cookie: req.headers.cookie || 'No cookie'
    });

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
            <button class="retry-btn" onclick="attemptClose()">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
              setTimeout(attemptClose, 3000);
            </script>
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
            <button onclick="attemptClose()" style="background: #0366d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
            </script>
          </body>
        </html>
      `);
    }

    if (!req.session || req.session.writeKey !== writeKey) {
      console.error('Write key mismatch:', { session: req.session?.writeKey || 'No session', provided: writeKey });
      return res.status(400).send(`
        <html>
          <head><title>Security Error</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
            <h2>❌ Security Error</h2>
            <p>Invalid state parameter. This could indicate a security issue.</p>
            <button onclick="attemptClose()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
            </script>
          </body>
        </html>
      `);
    }

    const authData = authStore.get(writeKey);
    if (!authData) {
      return res.status(400).send(`
        <html>
          <head><title>Session Expired</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
            <h2>⏰ Session Expired</h2>
            <p>Authentication session has expired. Please try again.</p>
            <button onclick="attemptClose()" style="background: #0366d6; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
            </script>
          </body>
        </html>
      `);
    }

    if (authData.authenticated) {
      console.log('Callback already processed for writeKey:', writeKey);
      return res.send(`
        <html>
          <head>
            <title>Authentication Already Completed</title>
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
            <h1>Authentication Already Completed</h1>
            <p>You have already authenticated. Please close this window and return to Figma.</p>
            <p><strong>Write Key (if needed): ${writeKey}</strong></p>
            <button class="close-btn" onclick="attemptClose()">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function sendPostMessage() {
                console.log('Attempting to send postMessage with writeKey: ${writeKey}');
                try {
                  window.opener?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
                  window.top?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
                  window.parent?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
                  console.log('postMessage sent to opener, top, and parent');
                } catch (e) {
                  console.error('Failed to send postMessage:', e);
                }
              }
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  sendPostMessage();
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
              sendPostMessage();
              setTimeout(sendPostMessage, 1000);
              setTimeout(sendPostMessage, 3000);
              setTimeout(attemptClose, 5000);
            </script>
          </body>
        </html>
      `);
    }

    try {
      oauth2Client.redirectUri = getServerUrl() + '/auth/google/callback';

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfoResponse = await oauth2.userinfo.get();
      const userInfo = userInfoResponse.data;

      
      const apiResponse = await axios.post('https://craftmymenus.com/FigmaLaravel/public/api/send-token', {
        userId: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        writeKey: writeKey
      }, {
        headers: {
          'Content-Type': 'application/json',
          // Agar API ko authentication chahiye, to yahan headers add karein
          // 'Authorization': 'Bearer YOUR_API_TOKEN'
        }
      });

    // 2. Append API response data to authData
Object.assign(authData, apiResponse.data);

// 3. Now store complete data
authStore.set(writeKey, {
  ...authData,
 // token: tokens.access_token,
 // refreshToken: tokens.refresh_token,
  userInfo: {
    id: userInfo.id,
    name: userInfo.name,
    email: userInfo.email,
    picture: userInfo.picture
  },
  authenticated: true,
  timestamp: Date.now()
});



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
              .writekey { 
                font-size: 14px; 
                background: rgba(0,0,0,0.2); 
                padding: 10px; 
                border-radius: 6px; 
                word-break: break-all;
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
            <p class="writekey">Write Key (if prompted in Figma): <strong>${writeKey}</strong></p>
            <button class="close-btn" onclick="attemptClose()">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function sendPostMessage() {
                console.log('Attempting to send postMessage with writeKey: ${writeKey}');
                try {
                  window.opener?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
                  window.top?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
                  window.parent?.postMessage({ type: 'auth-completed', writeKey: '${writeKey}' }, '*');
                  console.log('postMessage sent to opener, top, and parent');
                } catch (e) {
                  console.error('Failed to send postMessage:', e);
                }
              }
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  sendPostMessage();
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
              sendPostMessage();
              setTimeout(sendPostMessage, 1000);
              setTimeout(sendPostMessage, 3000);
              setTimeout(attemptClose, 5000);
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
            <button onclick="attemptClose()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
            <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
            <script>
              function attemptClose() {
                console.log('Attempting to close window');
                try {
                  window.close();
                  console.log('Window closed successfully');
                } catch (e) {
                  console.error('Failed to close window:', e);
                  document.getElementById('close-error').style.display = 'block';
                }
              }
            </script>
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
          <button onclick="attemptClose()" style="background: #d73a49; color: white; border: none; padding: 10px 20px; border-radius: 6px; margin-top: 20px;">Close Window</button>
          <p id="close-error" style="color: #ff9999; display: none;">Cannot close automatically. Please close this window manually.</p>
          <script>
            function attemptClose() {
              console.log('Attempting to close window');
              try {
                window.close();
                console.log('Window closed successfully');
              } catch (e) {
                console.error('Failed to close window:', e);
                document.getElementById('close-error').style.display = 'block';
              }
            }
          </script>
        </html>
      `);
  }
});

app.get('/auth/check', async (req, res) => {
  try {
    const { writeKey, sessionId } = req.query;

    res.set({
      'Access-Control-Allow-Origin': req.headers.origin || 'null',
      'Access-Control-Allow-Credentials': 'true'
    });

    console.log('Auth check requested:', {
      sessionId: req.session?.id || 'No session',
      clientSessionId: sessionId,
      writeKey,
      cookie: req.headers.cookie || 'No cookie',
      origin: req.headers.origin || 'No origin',
      headers: req.headers,
      status: 'Processing'
    });

    if (!writeKey && !sessionId) {
      console.log('Auth check response:', { authenticated: false, message: 'No writeKey or sessionId provided' });
      return res.status(200).json({ authenticated: false, message: 'No writeKey or sessionId provided' });
    }

    let authData = null;
    if (writeKey) {
      authData = authStore.get(writeKey);
    } else if (sessionId) {
      for (const [key, value] of authStore.entries()) {
        if (value.clientSessionId === sessionId) {
          authData = value;
          break;
        }
      }
    }

    if (!authData) {
      console.log('Auth check response:', { authenticated: false, message: 'Session expired or invalid writeKey/sessionId' });
      return res.status(200).json({ authenticated: false, message: 'Session expired or invalid writeKey/sessionId' });
    }

    if (authData.authenticated && authData.token) {

      const response = {
        authenticated: true,
        token: authData.token,
        userInfo: authData.userInfo,
        
      };
      console.log('Auth check response:', response);
      return res.status(200).json(response);
    }

    console.log('Auth check response:', { authenticated: false, message: 'Authentication pending' });
    res.status(200).json({ authenticated: false, message: 'Authentication pending' });

  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

app.post('/auth/cleanup', (req, res) => {
  try {
    const { writeKey, sessionId } = req.body;
    let deleted = false;
    if (writeKey && authStore.has(writeKey)) {
      authStore.delete(writeKey);
      console.log('Cleaned up auth data for writeKey:', writeKey);
      deleted = true;
    }
    if (sessionId) {
      for (const [key, value] of authStore.entries()) {
        if (value.clientSessionId === sessionId) {
          authStore.delete(key);
          console.log('Cleaned up auth data for sessionId:', sessionId);
          deleted = true;
          break;
        }
      }
    }
    res.status(200).json({ success: deleted });
  } catch (error) {
    console.error('Error cleaning up auth data:', error);
    res.status(500).json({ error: 'Failed to clean up auth data' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.status(200).json({ success: true });
  });
});

function cleanupAuthStore() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000;

  for (const [key, value] of authStore.entries()) {
    if (now - value.timestamp > maxAge) {
      authStore.delete(key);
    }
  }
}

if (!isVercel) {
  setInterval(cleanupAuthStore, 5 * 60 * 1000);
}

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

if (!isVercel) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OAuth server running on port ${PORT}`);
    console.log(`📝 Server configured for local testing`);
  });
}
