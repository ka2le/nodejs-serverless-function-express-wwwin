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
  }
} catch (error) {
  console.error('Firebase admin initialization error:', error);
}

const db = admin.firestore();

// Define allowed origins
const allowedOrigins = [
  'http://localhost:3000', // Local IP for testing
  'https://ka2le.github.io' // Replace with your GitHub static page URL
];

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
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
        res.status(200).send(doc.data());
      } else {
        res.status(404).send({ error: 'Game not found' });
      }
    } catch (error) {
      console.error('Error retrieving game state:', error);
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
    handler(req, res);
  });
};
