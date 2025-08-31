const express = require('express');
const axios = require('axios');
const app = express();

// === EDIT THESE VALUES ===
const CLIENT_ID = 'YOUR_CLIENT_ID';           // <-- Clover App ID
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';   // <-- Clover App Secret
const REDIRECT_URI = 'http://localhost:3000/clover/callback'; // Must match in Clover app settings
// =========================

// Root route just to confirm server is running
app.get('/', (req, res) => {
  res.send(`
    <h2>Clover OAuth Test Server Running</h2>
    <p>Go to <a href="/clover/connect">/clover/connect</a> to start the OAuth flow.</p>
  `);
});

// Route to trigger the Clover OAuth authorization (can use in your browser)
app.get('/clover/connect', (req, res) => {
  const scope = 'read_orders read_payments';
  const oauthUrl = `https://sandbox.dev.clover.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;

  // Redirect the user to Clover OAuth2
  res.redirect(oauthUrl);
});

// OAuth2 callback route for Clover to redirect to after login
app.get('/clover/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code found in query.');

  try {
    // Exchange code for access token
    const response = await axios.post(
      'https://sandbox.dev.clover.com/oauth/token',
      null,
      {
        params: {
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        }
      }
    );

    const { access_token, merchant_id } = response.data;
    console.log('Access Token:', access_token);
    console.log('Merchant ID:', merchant_id);

    // Show success HTML message
    res.send(`
      <h2>✅ Clover Account Connected!</h2>
      <p><strong>Merchant ID:</strong> ${merchant_id}</p>
      <p><strong>Access Token:</strong> (Check your terminal for security reasons)</p>
      <p>You can now close this window or continue building your app!</p>
    `);
  } catch (error) {
    console.error('Token Exchange Error:', error?.response?.data || error.message);
    res.status(500).send('<h2>Token exchange failed.</h2><p>Check your terminal for details.</p>');
  }
});

// Start the server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
