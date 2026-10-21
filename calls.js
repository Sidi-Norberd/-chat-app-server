const admin = require('firebase-admin');

// IMPORTANT : firebase-admin doit déjà être initialisé (admin.initializeApp)
// dans notifications.js. server.js charge notifications.js avant ce module,
// donc l'initialisation est faite quand listenForCalls() s'exécute.

const MAX_AGE_MS = 30000; // un appel plus vieux que 30 s n'est plus signalé

function listenForCalls() {
  const db = admin.firestore();

  db.collection('calls')
    .where('status', '==', 'ringing')
    .onSnapshot(
      async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== 'added') continue;

          const callId = change.doc.id;
          const call = change.doc.data();

          // Ignorer les vieux appels déjà présents au démarrage du serveur
          const created = call.createdAt ? call.createdAt.toMillis() : Date.now();
          if (Date.now() - created > MAX_AGE_MS) {
            await change.doc.ref.update({ status: 'missed' }).catch(() => {});
            continue;
          }

          try {
            const userDoc = await db.collection('users').doc(call.calleeId).get();
            const token = userDoc.get('fcmToken');
            if (!token) continue;

            // Message "data" uniquement + priorité haute : l'app construit
            // elle-même la notification d'appel (voir notification_service.dart)
            await admin.messaging().send({
              token,
              data: {
                type: 'call',
                callId,
                callerName: String(call.callerName || 'Appel'),
              },
              android: { priority: 'high', ttl: MAX_AGE_MS },
            });
            console.log(`Notification d'appel envoyée (appel ${callId})`);
          } catch (e) {
            console.error('Erreur notification appel :', e.message);
          }
        }
      },
      (err) => console.error('Erreur écoute appels :', err)
    );
}

module.exports = { listenForCalls };
