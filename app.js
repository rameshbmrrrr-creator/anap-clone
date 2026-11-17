import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, deleteDoc, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLHCtvS8X7T_42cIrue4yGJA8zKb95UZI",
  authDomain: "snap-clone-5deb4.firebaseapp.com",
  projectId: "snap-clone-5deb4",
  storageBucket: "snap-clone-5deb4.firebasestorage.app",
  messagingSenderId: "408090973949",
  appId: "1:408090973949:web:440fb1008c5f659ebad094",
  measurementId: "G-5Q29SZRF8T"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = id => document.getElementById(id);
let currentUser=null, signupMode=true, mediaFile=null, cameraStream=null, activeChat=null, stopMessages=null, stopStories=null;
let peopleCache = [], friendsList = [], pendingSent = [], pendingReceived = [];

const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),3000)}
function initials(s){return (s||"?").slice(0,1).toUpperCase()}
function showAuth(){ $("authScreen").classList.remove("hidden");$("app").classList.add("hidden"); }
function showApp(){ $("authScreen").classList.add("hidden");$("app").classList.remove("hidden"); }
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page+"Page").classList.add("active");document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="stories")loadStories();if(page==="friends")loadPeople();if(page==="chat")loadPeople(true);}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

// Toggle Login / Signup
$("toggleAuth").onclick=()=>{
  signupMode=!signupMode;
  $("signupFields").classList.toggle("hidden",!signupMode);
  $("authSubmit").textContent=signupMode?"Create account":"Log in";
  $("toggleAuth").textContent=signupMode?"Already have an account? Log in":"New here? Create account";
};

// Forgot Password Logic
$("forgotPassBtn").onclick = async () => {
  const email = $("authEmail").value.trim();
  if (!email) {
    toast("Please enter your Email Address first!");
    $("authEmail").focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    toast("Password reset link sent to your email! Check Inbox/Spam.");
  } catch (err) {
    toast("Error: Make sure this email is registered.");
  }
};

// Signup & Login Form Submit
$("authForm").onsubmit=async e=>{
  e.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  
  try {
    if(signupMode){
      const name = $("authName").value.trim() || "New User"; 
      let username = $("authUsername").value.trim().toLowerCase().replace(/\s+/g, '');
      if(!username) username = email.split('@')[0];
      
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, {displayName: name});
      await setDoc(doc(db,"users",cred.user.uid),{ 
        uid: cred.user.uid, 
        name: name, 
        username: username, 
        email: email, 
        createdAt: serverTimestamp() 
      });
      toast("Account created!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      toast("Logged in!");
    }
  } catch(err) { 
    if(err.code === "auth/email-already-in-use") toast("Email is already registered. Try logging in.");
    else if(err.code === "auth/invalid-credential") toast("Wrong email or password!");
    else toast(err.message);
  }
};

onAuthStateChanged(auth,async u=>{
  if(stopMessages)stopMessages();if(stopStories)stopStories();stopCamera();
  if(!u){currentUser=null;showAuth();return;}
  currentUser=u;showApp();
  $("profileName").textContent=u.displayName||"User";
  $("profileEmailDisplay").textContent=u.email||"";
  $("newDisplayName").value=u.displayName||"";
  go("camera");
});

$("logoutBtn").onclick=()=>signOut(auth);
$("saveProfile").onclick=async()=>{const name=$("newDisplayName").value.trim();if(name.length<2)return toast("Name too short");await updateProfile(currentUser,{displayName:name});await updateDoc(doc(db,"users",currentUser.uid),{name});$("profileName").textContent=name;toast("Profile saved");};

// CAMERA, STORIES & BEAUTY SMOOTH
$("mediaFile").onchange=e=>{mediaFile=e.target.files[0]||null;if(!mediaFile)return;previewFile(mediaFile);e.target.value=""};
function previewFile(file){stopCamera();$("cameraEmpty").classList.add("hidden");$("cameraVideo").classList.add("hidden");$("imagePreview").classList.add("hidden");$("videoPreview").classList.add("hidden");const url=URL.createObjectURL(file);if(file.type.startsWith("image/")){$("imagePreview").src=url;$("imagePreview").classList.remove("hidden")}else{$("videoPreview").src=url;$("videoPreview").classList.remove("hidden")}$("publishStory").disabled=false;}
$("startCamera").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});$("cameraVideo").srcObject=cameraStream;$("cameraVideo").classList.remove("hidden");$("cameraEmpty").classList.add("hidden");$("imagePreview").classList.add("hidden");$("videoPreview").classList.add("hidden");mediaFile=null;$("publishStory").disabled=true;}catch(e){toast("Camera permission unavailable.")}};
function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
$("captureBtn").onclick=()=>{if(!cameraStream)return;const v=$("cameraVideo"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);c.toBlob(blob=>{mediaFile=new File([blob],"snap.jpg",{type:"image/jpeg"});previewFile(mediaFile)},"image/jpeg",.88)};
$("discardMedia").onclick=()=>{mediaFile=null;stopCamera();["imagePreview","videoPreview","cameraVideo"].forEach(id=>$(id).classList.add("hidden"));$("cameraEmpty").classList.remove("hidden");$("publishStory").disabled=true};

// Save to Gallery
$("downloadBtn").onclick = () => { if(!mediaFile) return; const a = document.createElement("a"); a.href = URL.createObjectURL(mediaFile); a.download = "SnapClone_" + Date.now() + ".jpg"; document.body.appendChild(a); a.click(); document.body.removeChild(a); toast("Saved to gallery!"); };

// HD Face Smoothing Feature
$("beautyBtn").onclick = () => {
  if(!mediaFile) return;
  const img = new Image();
  const url = URL.createObjectURL(mediaFile);
  img.src = url;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.filter = "brightness(1.08) contrast(0.95) saturate(1.1) blur(0.5px)";
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(blob => {
      mediaFile = new File([blob], "smooth_snap.jpg", { type: "image/jpeg" });
      previewFile(mediaFile);
      toast("✨ HD Face Smoothing Applied!");
    }, "image/jpeg", 0.92);
  };
};

$("publishStory").onclick=async()=>{if(!mediaFile||!currentUser)return;try{const path=`stories/${currentUser.uid}/${Date.now()}`;const storageRef=ref(storage,path);await uploadBytes(storageRef,mediaFile,{contentType:mediaFile.type});const url=await getDownloadURL(storageRef);await addDoc(collection(db,"stories"),{uid:currentUser.uid,ownerName:currentUser.displayName||"User",mediaUrl:url,storagePath:path,contentType:mediaFile.type,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+24*60*60*1000)});$("discardMedia").click();toast("Story posted!");go("stories");}catch(e){toast("Error posting")}};
function loadStories(){if(stopStories)stopStories();const q=query(collection(db,"stories"),where("expiresAt",">",Timestamp.now()),orderBy("expiresAt","asc"),limit(100));stopStories=onSnapshot(q,snap=>{const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(s => s.uid === currentUser.uid || friendsList.includes(s.uid));$("storiesGrid").innerHTML=rows.length?rows.map(s=>`<article class="story-card"><div style="height:100%;width:100%;position:absolute;top:0;left:0;">${s.contentType?.startsWith("image/")?`<img src="${esc(s.mediaUrl)}" style="width:100%;height:100%;object-fit:cover;">`:`<video src="${esc(s.mediaUrl)}" style="width:100%;height:100%;object-fit:cover;" controls></video>`}</div><b>${esc(s.ownerName)}</b>${s.uid===currentUser.uid?`<button data-delete-story="${s.id}" style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.5);color:#fff;border:none;border-radius:10px;padding:5px 10px;">Delete</button>`:''}</article>`).join(""):'<div style="padding:15px; color:#666;">No active stories.</div>';document.querySelectorAll("[data-delete-story]").forEach(b=>b.onclick=()=>deleteStory(b.dataset.deleteStory));});}
async function deleteStory(id){try{await deleteDoc(doc(db,"stories",id));toast("Deleted");}catch(e){}}

// FRIENDS & CHAT
async function loadPeople(forChat = false) {
  try {
    const usersSnap = await getDocs(query(collection(db, "users"), limit(100)));
    peopleCache = usersSnap.docs.map(d => d.data()).filter(p => p.uid !== currentUser.uid);
    const reqSnap = await getDocs(query(collection(db, "friendRequests"), where("users", "array-contains", currentUser.uid)));
    friendsList = []; pendingSent = []; pendingReceived = [];
    reqSnap.docs.forEach(d => {
      const data = { id: d.id, ...d.data() };
      const otherUid = data.users.find(id => id !== currentUser.uid);
      if (data.status === "accepted") friendsList.push(otherUid);
      else if (data.status === "pending") {
        if (data.from === currentUser.uid) pendingSent.push(otherUid);
        else pendingReceived.push({ reqId: d.id, uid: otherUid });
      }
    });
    renderPeople(forChat);
  } catch (e) { console.log(e); }
}

function renderPeople(forChat = false) {
  const target = forChat ? $("chatPeople") : $("usersGrid");
  const filter = (forChat ? $("peopleSearch").value : $("userSearch").value).toLowerCase();

  if (forChat) {
    const myFriends = peopleCache.filter(p => friendsList.includes(p.uid) && ((p.name || "").toLowerCase().includes(filter) || (p.username || "").toLowerCase().includes(filter)));
    target.innerHTML = myFriends.map((p, index) => {
      const c = index % 3;
      let color = "red", text = "New Snap · 13m", icon = "status-sq red";
      if(c === 1) { color = "purple"; text = "2 New Snaps · 1h"; icon = "status-sq purple"; }
      if(c === 2) { color = "blue"; text = "New Chat · 2m"; icon = "status-sq blue"; }
      
      return `
      <div class="person-row" data-open-chat="${p.uid}">
        <div class="avatar-wrap">
          <div class="avatar">${initials(p.name)}</div>
        </div>
        <div class="chat-details">
          <b>${esc(p.name || p.username)}</b>
          <div class="chat-status ${color}">
            <div class="${icon}"></div> 
            <span>${text}</span>
          </div>
        </div>
        <div class="chat-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
        </div>
      </div>
    `}).join("") || '<div style="padding:20px; text-align:center; color:#888;">No friends to show. Add some!</div>';
    document.querySelectorAll("[data-open-chat]").forEach(b => b.onclick = () => openChat(b.dataset.openChat));
    return;
  }

  let html = "";
  if (pendingReceived.length > 0) {
    html += `<h4 style="margin:10px 15px; color:#555;">Friend Requests</h4>`;
    pendingReceived.forEach(req => {
      const p = peopleCache.find(u => u.uid === req.uid);
      if (p) html += `<div style="display:flex; align-items:center; padding:10px 15px; background:#fffcf0;"><div style="width:45px;height:45px;border-radius:50%;background:#eee;margin-right:15px;display:flex;align-items:center;justify-content:center;">${initials(p.name)}</div><div style="flex:1;"><b>${esc(p.name)}</b><br><small>@${esc(p.username)}</small></div><button style="background:var(--primary);border:none;padding:8px 15px;border-radius:20px;font-weight:bold;" data-accept-req="${req.reqId}">Accept</button></div>`;
    });
  }
  const list = peopleCache.filter(p => (p.name || "").toLowerCase().includes(filter) || (p.username || "").toLowerCase().includes(filter));
  html += `<h4 style="margin:15px 15px 10px; color:#555;">Find Friends</h4>`;
  html += list.map(p => {
    let actionBtn = "";
    if (friendsList.includes(p.uid)) actionBtn = `<button style="background:#eee;border:none;padding:8px 15px;border-radius:20px;font-weight:bold;" data-start-chat="${p.uid}">Chat</button>`;
    else if (pendingSent.includes(p.uid)) actionBtn = `<button style="background:#eee;border:none;padding:8px 15px;border-radius:20px;font-weight:bold;" disabled>Requested</button>`;
    else if (pendingReceived.some(r => r.uid === p.uid)) actionBtn = `<button style="background:var(--primary);border:none;padding:8px 15px;border-radius:20px;font-weight:bold;" data-accept-req="${pendingReceived.find(r => r.uid === p.uid).reqId}">Accept</button>`;
    else actionBtn = `<button style="background:#eee;border:none;padding:8px 15px;border-radius:20px;font-weight:bold;" data-send-req="${p.uid}">+ Add</button>`;
    return `<div style="display:flex; align-items:center; padding:10px 15px; border-bottom:1px solid #f9f9f9;"><div style="width:45px;height:45px;border-radius:50%;background:#eee;margin-right:15px;display:flex;align-items:center;justify-content:center;">${initials(p.name)}</div><div style="flex:1;"><b>${esc(p.name)}</b><br><small>@${esc(p.username)}</small></div>${actionBtn}</div>`;
  }).join("") || '<div style="padding:15px; color:#666;">No users found.</div>';
  target.innerHTML = html;
  document.querySelectorAll("[data-send-req]").forEach(b => b.onclick = () => sendFriendRequest(b.dataset.sendReq));
  document.querySelectorAll("[data-accept-req]").forEach(b => b.onclick = () => respondRequest(b.dataset.acceptReq, true));
  document.querySelectorAll("[data-start-chat]").forEach(b => b.onclick = () => { go("chat"); openChat(b.dataset.startChat); });
}

async function sendFriendRequest(toUid) {
  try {
    const reqId = [currentUser.uid, toUid].sort().join("_");
    await setDoc(doc(db, "friendRequests", reqId), { users: [currentUser.uid, toUid], from: currentUser.uid, to: toUid, status: "pending", createdAt: serverTimestamp() });
    toast("Request sent!"); loadPeople(false);
  } catch (e) { toast("Error sending request"); }
}
async function respondRequest(reqId, accept) {
  try {
    if (accept) { await updateDoc(doc(db, "friendRequests", reqId), { status: "accepted" }); toast("Friend added!"); } 
    else { await deleteDoc(doc(db, "friendRequests", reqId)); }
    loadPeople(false);
  } catch (e) { toast("Error"); }
}

$("userSearch").oninput = () => renderPeople(false); $("peopleSearch").oninput = () => renderPeople(true);
function chatId(a, b) { return [a, b].sort().join("_"); }

async function openChat(uid) {
  try {
    const other = peopleCache.find(p => p.uid === uid) || (await getDoc(doc(db, "users", uid))).data();
    if (!other) return;
    activeChat = { id: chatId(currentUser.uid, uid), other };
    $("chatBlank").classList.add("hidden"); $("chatBox").classList.remove("hidden"); $("chatTitle").textContent = other.name;
    await setDoc(doc(db, "chats", activeChat.id), { members: [currentUser.uid, uid], updatedAt: serverTimestamp() }, { merge: true });
    if (stopMessages) stopMessages();
    const q = query(collection(db, "chats", activeChat.id, "messages"), orderBy("createdAt", "asc"), limit(150));
    stopMessages = onSnapshot(q, snap => {
      $("messages").innerHTML = snap.docs.map(d => { const m = d.data(), mine = m.senderId === currentUser.uid; return `<div class="bubble ${mine ? "mine" : ""}">${esc(m.text)}</div>`; }).join("");
      $("messages").scrollTop = $("messages").scrollHeight;
    });
  } catch (e) { console.log(e); }
}

$("messageForm").onsubmit = async e => {
  e.preventDefault(); const text = $("messageText").value.trim(); if (!text || !activeChat) return;
  try {
    await addDoc(collection(db, "chats", activeChat.id, "messages"), { senderId: currentUser.uid, text, createdAt: serverTimestamp() });
    await updateDoc(doc(db, "chats", activeChat.id), { lastMessage: text, updatedAt: serverTimestamp() });
    $("messageText").value = "";
  } catch (err) { toast("Error sending"); }
};
