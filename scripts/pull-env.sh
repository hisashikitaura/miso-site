#!/bin/sh
# Write .env.local from the Firebase "Miso Site" web app config (requires `firebase login`).
set -e
cd "$(dirname "$0")/.."
APP_ID="${MISO_FIREBASE_APP_ID:-1:349958284384:web:b32c266e1ff1d8e2204f05}"
firebase apps:sdkconfig WEB "$APP_ID" --project kith-diary 2>/dev/null | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const c=JSON.parse(s.match(/\{[\s\S]*\}/)[0]);
  const m={API_KEY:c.apiKey,AUTH_DOMAIN:c.authDomain,PROJECT_ID:c.projectId,STORAGE_BUCKET:c.storageBucket,MESSAGING_SENDER_ID:c.messagingSenderId,APP_ID:c.appId};
  require("fs").writeFileSync(".env.local",Object.entries(m).map(([k,v])=>`VITE_FIREBASE_${k}=${v}`).join("\n")+"\n");
  console.log("wrote .env.local");
});'
