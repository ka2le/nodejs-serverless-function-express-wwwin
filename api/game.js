const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

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

const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { gameId, gameState } = req.body;
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
