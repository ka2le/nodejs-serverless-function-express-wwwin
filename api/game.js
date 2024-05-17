const admin = require('firebase-admin');

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
  const { gameId, gameState } = req.body;

  if (req.method === 'POST') {
    try {
      await db.collection('games').doc(gameId).set({ state: gameState });
      res.status(200).send({ message: 'Game state saved successfully!' });
    } catch (error) {
      res.status(500).send({ error: 'Failed to save game state' });
    }
  } else if (req.method === 'GET') {
    try {
      const doc = await db.collection('games').doc(gameId).get();
      if (doc.exists) {
        res.status(200).send(doc.data());
      } else {
        res.status(404).send({ error: 'Game not found' });
      }
    } catch (error) {
      res.status(500).send({ error: 'Failed to retrieve game state' });
    }
  } else {
    res.status(405).send({ error: 'Method not allowed' });
  }
};
