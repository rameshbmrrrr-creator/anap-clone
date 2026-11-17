import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
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
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}
function initials(s){return (s||"?").slice(0,1).toUpperCase()}
function showAuth(){ $("authScreen").classList.remove("hidden");$("app").classList.add("hidden"); }
function showApp(){ $("authScreen").classList.add("hidden");$("app").classList.remove("hidden"); }
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page+"Page").classList.add("active");document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="stories")loadStories();if(page==="friends")loadPeople();if(page==="chat")loadPeople(true);}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

$("toggleAuth").onclick=()=>{signupMode=!signupMode;$("signupNameWrap").classList.toggle("hidden",!signupMode);$("authSubmit").textContent=signupMode?"Create account":"Log in";$("toggleAuth").textContent=signupMode?"Already have an account? Log in":"New here? Create account";$("authPassword").autocomplete=signupMode?"new-password":"current-password"};

$("authForm").onsubmit=async e=>{
  e.preventDefault();
  let username = $("authUsername").value.trim().toLowerCase().replace(/\s+/g, '');
  const password = $("authPassword").value;
  const dummyEmail = username + "@snapclone.local";

  try {
    if(signupMode){
      const name = $("authName").value.trim() || "New User"; 
      if(!username) throw Error("Please enter a username");
      const cred = await createUserWithEmailAndPassword(auth, dummyEmail, password);
      await updateProfile(cred.user, {displayName: name});
      await setDoc(doc(db,"users",cred.user.uid),{ uid: cred.user.uid, name: name, username: username, dummyEmail: dummyEmail, createdAt: serverTimestamp() });
      toast("Account created successfully!");
    } else {
      await signInWithEmailAndPassword(auth, dummyEmail, password);
      toast("Logged in successfully!");
    }
  } catch(err) { toast(err.message.includes("use") ? "Username is already taken." : "Invalid username or password."); }
};

onAuthStateChanged(auth,async u=>{if(stopMessages)stopMessages();if(stopStories)stopStories();stopCamera();if(!u){currentUser=null;showAuth();return;}currentUser=u;showApp();$("sideName").textContent=u.displayName||"User";$("topName").textContent=u.displayName||"User";$("sideAvatar").textContent=initials(u.displayName);$("topAvatar").textContent=initials(u.displayName);$("profileAvatar").textContent=initials(u.displayName);$("profileName").textContent=u.displayName||"User";$("newDisplayName").value=u.displayName||"";go("camera");});

$("logoutBtn").onclick=()=>signOut(auth);
$("saveProfile").onclick=async()=>{const name=$("newDisplayName").value.trim();if(name.length<2)return toast("Name too short");await updateProfile(currentUser,{displayName:name});await updateDoc(doc(db,"users",currentUser.uid),{name});$("profileName").textContent=name;$("topName").textContent=name;$("topAvatar").textContent=initials(name);toast("Profile saved");};

// CAMERA & STORIES
$("mediaFile").onchange=e=>{mediaFile=e.target.files[0]||null;if(!mediaFile)return;previewFile(mediaFile);e.target.value=""};
function previewFile(file){stopCamera();$("cameraEmpty").classList.add("hidden");$("cameraVideo").classList.add("hidden");$("imagePreview").classList.add("hidden");$("videoPreview").classList.add("hidden");const url=URL.createObjectURL(file);if(file.type.startsWith("image/")){$("imagePreview").src=url;$("imagePreview").classList.remove("hidden")}else if(file.type.startsWith("video/")){$("videoPreview").src=url;$("videoPreview").classList.remove("hidden")} $("publishStory").disabled=false;}
$("startCamera").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});$("cameraVideo").srcObject=cameraStream;$("cameraVideo").classList.remove("hidden");$("cameraEmpty").classList.add("hidden");$("imagePreview").classList.add("hidden");$("videoPreview").classList.add("hidden");mediaFile=null;$("publishStory").disabled=true;}catch(e){toast("Camera permission unavailable.")}};
function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
$("captureBtn").onclick=()=>{if(!cameraStream)return;const v=$("cameraVideo"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);c.toBlob(blob=>{mediaFile=new File([blob],"snap.jpg",{type:"image/jpeg"});previewFile(mediaFile)},"image/jpeg",.88)};
$("discardMedia").onclick=()=>{mediaFile=null;stopCamera();["imagePreview","videoPreview","cameraVideo"].forEach(id=>$(id).classList.add("hidden"));$("cameraEmpty").classList.remove("hidden");$("publishStory").disabled=true};
$("publishStory").onclick=async()=>{if(!mediaFile||!currentUser)return;try{const path=`stories/${currentUser.uid}/${Date.now()}`;const storageRef=ref(storage,path);await uploadBytes(storageRef,mediaFile,{contentType:mediaFile.type});const url=await getDownloadURL(storageRef);await addDoc(collection(db,"stories"),{uid:currentUser.uid,ownerName:currentUser.displayName||"User",mediaUrl:url,storagePath:path,contentType:mediaFile.type,createdAt:serverTimestamp(),expiresAt:Timestamp.fromMillis(Date.now()+24*60*60*1000)});$("discardMedia").click();toast("Story posted!");go("stories");}catch(e){toast("Error posting story")}};

function loadStories(){if(stopStories)stopStories();const q=query(collection(db,"stories"),where("expiresAt",">",Timestamp.now()),orderBy("expiresAt","asc"),limit(100));stopStories=onSnapshot(q,snap=>{const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(s => s.uid === currentUser.uid || friendsList.includes(s.uid));$("storiesGrid").innerHTML=rows.length?rows.map(s=>`<article class="story-card"><div class="story-media">${s.contentType?.startsWith("image/")?`<img src="${esc(s.mediaUrl)}">`:`<video src="${esc(s.mediaUrl)}" controls></video>`}</div><b>${esc(s.ownerName)}</b><small>${s.uid===currentUser.uid?"Your story":"Friend's story"}</small>${s.uid===currentUser.uid?`<button data-delete-story="${s.id}">Delete</button>`:''}</article>`).join(""):'<div style="padding:15px; color:#666;">No active stories.</div>';document.querySelectorAll("[data-delete-story]").forEach(b=>b.onclick=()=>deleteStory(b.dataset.deleteStory));});}
async function deleteStory(id){try{await deleteDoc(doc(db,"stories",id));toast("Story deleted");}catch(e){toast("Error deleting story")}}

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
    target.innerHTML = myFriends.map(p => `
      <div class="person-row" data-open-chat="${p.uid}" style="cursor:pointer;">
        <div class="avatar">${initials(p.name)}</div>
        <div style="flex:1;">
          <b style="display:block;">${esc(p.name || p.username)}</b>
          <small style="color:#eb144c; font-weight:bold; font-size:12px;">🟥 Tap to chat</small>
        </div>
        <div style="font-size:22px; color:#ccc;">📷</div>
      </div>
    `).join("") || '<div style="padding:15px; color:#666;">No friends yet.</div>';
    document.querySelectorAll("[data-open-chat]").forEach(b => b.onclick = () => openChat(b.dataset.openChat));
    return;
  }

  let html = "";
  if (pendingReceived.length > 0) {
    html += `<h4 style="margin:10px 15px; color:#555;">Friend Requests</h4>`;
    pendingReceived.forEach(req => {
      const p = peopleCache.find(u => u.uid === req.uid);
      if (p) html += `<article class="person-card" style="background:#fffcf0;"><div class="avatar">${initials(p.name)}</div><div class="person-info"><b>${esc(p.name)}</b><small>@${esc(p.username)}</small></div><button class="primary" data-accept-req="${req.reqId}">Accept</button></article>`;
    });
  }

  const list = peopleCache.filter(p => (p.name || "").toLowerCase().includes(filter) || (p.username || "").toLowerCase().includes(filter));
  html += `<h4 style="margin:15px 15px 10px; color:#555;">Find Friends</h4>`;
  html += list.map(p => {
    let actionBtn = "";
    if (friendsList.includes(p.uid)) actionBtn = `<button class="primary" data-start-chat="${p.uid}">Chat ✓</button>`;
    else if (pendingSent.includes(p.uid)) actionBtn = `<button class="secondary" disabled>Requested</button>`;
    else if (pendingReceived.some(r => r.uid === p.uid)) actionBtn = `<button class="primary" data-accept-req="${pendingReceived.find(r => r.uid === p.uid).reqId}">Accept</button>`;
    else actionBtn = `<button class="primary" data-send-req="${p.uid}">+ Add</button>`;
    return `<article class="person-card"><div class="avatar">${initials(p.name)}</div><div class="person-info"><b>${esc(p.name)}</b><small>@${esc(p.username)}</small></div>${actionBtn}</article>`;
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
