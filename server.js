const express = require('express');
const { listenForNewMessages } = require('./notifications');

const app = express();
const PORT = process.env.PORT || 3000;

// Render (plan gratuit) exige que le service écoute un port HTTP,
// même si le vrai travail (écoute Firestore) tourne en tâche de fond.
app.get('/', (req, res) => {
  res.send('Serveur de notifications actif.');
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  listenForNewMessages();
  console.log('Écoute des nouveaux messages Firestore démarrée.');
});
