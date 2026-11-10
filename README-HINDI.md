# SnapClone Firebase + Admin — सेटअप गाइड (Hindi)

यह प्रोजेक्ट Firebase backend के साथ है। वेबसाइट को चालू करने के लिए आपको अपना Firebase project बनाकर config भरना होगा। मैं आपके Google/Firebase खाते में लॉगिन करके project अपने-आप नहीं बना सकता।

## 1. Firebase project बनाएं
1. https://console.firebase.google.com/ खोलें और Add project करें।
2. Project में Web App जोड़ें। Firebase config कॉपी करें।
3. `firebase-config.js` में placeholders की जगह अपना config डालें।
4. Authentication → Sign-in method → Email/Password enable करें।
5. Firestore Database बनाएं।
6. Storage enable करें। यदि Billing/Blaze plan की जरूरत दिखे, Firebase के वर्तमान plan/region नियम देखें।

## 2. Firebase CLI से Rules और Functions deploy करें
अपने कंप्यूटर पर Node.js और Firebase CLI install करें:
```bash
npm install -g firebase-tools
firebase login
firebase use --add
```
Project folder में:
```bash
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,storage,functions
```
Cloud Functions deploy करने के लिए project में billing/Blaze plan आवश्यक हो सकता है। Firebase console के निर्देशों का पालन करें।

## 3. अपना Admin account बनाएं
1. वेबसाइट पर अपना email/password डालकर सामान्य account बनाएं।
2. Firebase Console → Authentication → Users में अपना user खोलकर UID कॉपी करें।
3. Service Accounts से Admin SDK service-account JSON डाउनलोड करें। इसे किसी के साथ साझा न करें और website folder/public hosting में कभी upload न करें।
4. Node.js script चलाएं:
```bash
cd scripts
npm install
```
Windows PowerShell:
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\service-account.json"
$env:ADMIN_UID="PASTE_YOUR_UID"
node .\set-admin.mjs
```
macOS/Linux:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/secure/service-account.json"
export ADMIN_UID="PASTE_YOUR_UID"
node set-admin.mjs
```
फिर वेबसाइट से sign out करके दोबारा sign in करें। Admin Panel दिखना चाहिए।

## 4. Website को local पर चलाएं
Project root में:
```bash
python -m http.server 8000
```
फिर `http://localhost:8000` खोलें। Camera के लिए localhost या HTTPS जरूरी है।

## Admin Panel में
- Users list; block/unblock; delete Auth account/profile
- Stories देखना/हटाना
- User reports देखना/resolve करना
- Recent chats और messages पढ़ना (moderation access)

## महत्वपूर्ण सुरक्षा बातें
- Admin role custom claim से आता है। कभी भी client-side email check या Firestore user document में `isAdmin: true` लिखकर Admin न बनाएं।
- Service-account JSON, private keys और Firebase Admin credentials सार्वजनिक न करें।
- इस sample में admin moderation role को सभी chat messages पढ़ने की अनुमति है। इसे अपनी Privacy Policy/Terms में साफ बताएं और लागू कानूनों का पालन करें।
- User deletion function Auth user और profile document हटाता है; उसकी पुरानी stories, chat messages और Storage files की पूरी cascade cleanup अभी शामिल नहीं है। नियमित cleanup job/retention policy जोड़ें।
- Stories Firestore query में expiresAt से filter होती हैं; पुरानी documents और Storage media को पूरी तरह हटाने के लिए scheduled cleanup function जोड़ना होगा। Firestore TTL केवल document हटाता है, Storage file नहीं।
- यह starter implementation है, production launch से पहले App Check, email verification, password reset UI, rate limiting, moderation process, privacy policy, backups, abuse controls और security review जोड़ें।
- Firebase config में apiKey होना सामान्य है; security Firestore/Storage Rules और Auth पर निर्भर है। Service account key कभी frontend में न डालें।
- Chat list में demo friend accounts नहीं हैं: chat करने के लिए दूसरे users को पहले register करना होगा।
