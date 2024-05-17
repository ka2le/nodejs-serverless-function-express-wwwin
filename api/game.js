const admin = require('firebase-admin');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config(); // Load environment variables from .env file

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase admin initialized successfully.');
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error);
}

// Verify that environment variables are loaded correctly
console.log('Environment Variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Loaded' : 'Not Loaded');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);

const db = admin.firestore();

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000', // Local React app
  'http://localhost:3001', // Local React app
  'https://ka2le.github.io', // Replace with your GitHub static page URL
];

// Toggle CORS flag
const temporarilyDisableCors = false;

// CORS configuration
const corsOptions = {
  origin: temporarilyDisableCors ? true : function (origin, callback) {
    console.log('Origin:', origin);
    if (!origin) return callback(new Error('Origin not allowed by CORS'));
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

// Middleware to check Referer header
const refererCheck = (req, res, next) => {
  const referer = req.headers.referer;
  console.log('Referer:', referer);
  if ((!referer || !allowedOrigins.some(origin => referer.startsWith(origin))) && (!temporarilyDisableCors)) {
    res.status(403).send({ error: 'Access denied' });
    return;
  }
  next();
};

const handler = async (req, res) => {
  console.log('Received request:', req.method, req.url);
  if (req.method === 'POST') {
    const { gameId, gameState } = req.body;
    console.log('POST request body:', req.body);
    try {
      if (!gameId || !gameState) {
        res.status(400).send({ error: 'Missing gameId or gameState in the request body' });
        return;
      }
      await db.collection('games').doc(gameId).set({ state: gameState });
      res.status(200).send({ message: 'Game state saved successfully!' });
    } catch (error) {
      console.error('Error saving game state:', error);
      res.status(500).send({ error: 'Failed to save game state', details: error.message });
    }
  } else if (req.method === 'GET') {
    const { gameId } = req.query;
    console.log('GET request query:', req.query);
    try {
      if (!gameId) {
        res.status(400).send({ error: 'Missing gameId in query parameters' });
        return;
      }
      const doc = await db.collection('games').doc(gameId).get();
      if (doc.exists) {
        console.log('Game state retrieved successfully:', doc.data());
        res.status(200).send(doc.data());
      } else {
        console.log('Game not found for gameId:', gameId);
        res.status(404).send({ error: 'Game not found' });
      }
    } catch (error) {
      console.error('Error retrieving game state:', error);
      console.error('Error stack trace:', error.stack);
      res.status(500).send({ error: 'Failed to retrieve game state', details: error.message });
    }
  } else {
    res.status(405).send({ error: 'Method not allowed' });
  }
};

const corsHandler = cors(corsOptions);
module.exports = (req, res) => {
  corsHandler(req, res, (err) => {
    if (err) {
      console.error('CORS error:', err);
      res.status(500).send({ error: 'CORS error', details: err.message });
      return;
    }
    refererCheck(req, res, () => {
      handler(req, res);
    });
  });
};
