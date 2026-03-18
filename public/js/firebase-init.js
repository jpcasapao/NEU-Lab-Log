/* NEU Lab Log — Firebase initialisation & room config */

/* ─── FIREBASE ─────────────────────────────────────── */
firebase.initializeApp({
  apiKey:"AIzaSyA5VfYAKVy8NhXON5ktxNVaC65iC3VS5YI",
  authDomain:"neu-lab-log-c379c.firebaseapp.com",
  projectId:"neu-lab-log-c379c",
  storageBucket:"neu-lab-log-c379c.firebasestorage.app",
  messagingSenderId:"646272125764",
  appId:"1:646272125764:web:fa829e74711dcfea13e511",
  measurementId:"G-4VFY9S7HBZ"
});
const auth = firebase.auth();
const db   = firebase.firestore();
try{ firebase.analytics(); }catch(e){}

/* ─── ROOM CONFIG ──────────────────────────────────── */
const ROOMS = ['M101','M102','M103','M104','M105','M106'];
const RC = {
  M101:{bar:'#166534',bg:'#dcfce7',txt:'#14532d',icon:'🖥️',label:'Computer Lab 1'},
  M102:{bar:'#b91c1c',bg:'#fee2e2',txt:'#991b1b',icon:'⚗️',label:'Computer Lab 2'},
  M103:{bar:'#166534',bg:'#dcfce7',txt:'#14532d',icon:'🔬',label:'Computer Lab 3'},
  M104:{bar:'#b91c1c',bg:'#fee2e2',txt:'#991b1b',icon:'📡',label:'Computer Lab 4'},
  M105:{bar:'#166534',bg:'#dcfce7',txt:'#14532d',icon:'🧪',label:'Computer Lab 5'},
  M106:{bar:'#b91c1c',bg:'#fee2e2',txt:'#991b1b',icon:'💻',label:'Computer Lab 6'},
};
// QR payload: kept intentionally short for best scannability
const qrPayload = r => 'NEU-LAB:' + r;

