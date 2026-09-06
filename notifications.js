// À ajouter sur ton serveur Node.js existant (ex. sur Render).
// Écoute les nouveaux messages Firestore et envoie une notification FCM
// au destinataire.

const admin = require('firebase-admin');

// Sur Render, la clé de compte de service est stockée dans la variable
// d'environnement FIREBASE_SERVICE_ACCOUNT_BASE64 (le JSON encodé en base64).
// En local, tu peux aussi placer un fichier serviceAccountKey.json à côté
// de ce fichier et décommenter la ligne alternative plus bas.
const serviceAccountJson = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
  'base64'
).toString('utf8');
const serviceAccount = JSON.parse(serviceAccountJson);

// Alternative pour un test en local sans variable d'environnement :
// const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function listenForNewMessages() {
  db.collectionGroup('messages').onSnapshot((snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type !== 'added') return;

      const message = change.doc.data();
      const conversationId = change.doc.ref.parent.parent.id;

      const convDoc = await db.collection('conversations').doc(conversationId).get();
      const participants = convDoc.data().participants;
      const recipientUid = participants.find((uid) => uid !== message.senderId);
      if (!recipientUid) return;

      const recipientDoc = await db.collection('users').doc(recipientUid).get();
      const fcmToken = recipientDoc.data()?.fcmToken;
      if (!fcmToken) return;

      const senderDoc = await db.collection('users').doc(message.senderId).get();
      const senderName = senderDoc.data()?.displayName || 'Quelqu\'un';

      try {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: senderName,
            body: message.type === 'audio' ? 'Message vocal' : message.text,
          },
          data: { conversationId },
        });
      } catch (err) {
        console.error('Erreur envoi notification FCM:', err);
      }
    });
  });
}

module.exports = { listenForNewMessages };
