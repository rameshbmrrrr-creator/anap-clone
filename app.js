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
let currentUser=null, isAdmin=false, signupMode=true, mediaFile=null, cameraStream=null, activeChat=null, stopMessages=null, stopStories=null, adminTab="users";
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}
function initials(s){return (s||"?").slice(0,1).toUpperCase()}
function showAuth(){ $("authScreen").classList.remove("hidden");$("app").classList.add("hidden"); }
function showApp(){ $("authScreen").classList.add("hidden");$("app").classList.remove("hidden"); }
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page+"Page").classList.add("active");document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="stories")loadStories();if(page==="friends")loadPeople();if(page==="chat")loadPeople(true);if(page==="admin"&&isAdmin)loadAdmin();}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

$("toggleAuth").onclick=()=>{signupMode=!signupMode;$("signupNameWrap").classList.toggle("hidden",!signupMode);$("authSubmit").textContent=signupMode?"Create account":"Log in";$("toggleAuth").textContent=signupMode?"Already have an account? Log in":"New here? Create account";$("authPassword").autocomplete=signupMode?"new-password":"current-password"};

// यहीं पर आपका असली अकाउंट बनने और Firestore में डेटा सेव होने का कोड है
$("authForm").onsubmit=async e=>{
  e.preventDefault();
  const email=$("authEmail").value.trim(),password=$("authPassword").value;
  try{
    if(signupMode){
      const name=$("authName").value.trim();
      if(!name)throw Error("Enter a display name");
      // 1. अकाउंट बनाना
      const cred=await createUserWithEmailAndPassword(auth,email,password);
      await updateProfile(cred.user,{displayName:name});
      // 2. Firestore में डेटाबेस सेव करना
      await setDoc(doc(db,"users",cred.user.uid),{uid:cred.user.uid,name,email,photoURL:"",blocked:false,createdAt:serverTimestamp()});
      toast("Account created successfully!");
    }else {
      await signInWithEmailAndPassword(auth,email,password);
      toast("Logged in successfully!");
    }
  }catch(err){
    toast(friendly(err))
  }
};

function friendly(e){const map={"auth/email-already-in-use":"Email is already registered.","auth/invalid-credential":"Incorrect email or password.","auth/weak-password":"Use at least 8 characters.","auth/invalid-email":"Enter a valid email.","auth/too-many-requests":"Too many attempts. Try later.","permission-denied":"Permission denied. Check Firebase Rules and your account role."};return map[e.code]||e.message||"Something went wrong";}

onAuthStateChanged(auth,async u=>{stopLive();if(!u){currentUser=null;showAuth();return;}try{const token=await u.getIdTokenResult(true);isAdmin=token.claims.admin===true;currentUser=u;const profile=await getDoc(doc(db,"users",u.uid));if(profile.exists()&&profile.data().blocked){await signOut(auth);toast("This account is blocked.");return;}showApp();$("sideName").textContent=u.displayName||u.email;$("sideEmail").textContent=u.email;$("topName").textContent=u.displayName||u.email;$("sideAvatar").textContent=initials(u.displayName\vert{}\vert{}u.email);$("topAvatar").textContent=initials(u.displayName||u.email);$("profileAvatar").textContent=initials(u.displayName\vert{}\vert{}u.email);$("profileName").textContent=u.displayName||"User";$("profileEmail").textContent=u.email;$("newDisplayName").value=u.displayName||"";$("adminNav").classList.toggle("hidden",!isAdmin);$("mobileAdminNav").classList.toggle("hidden",!isAdmin);go("camera");}catch(e){toast(friendly(e));}});

function stopLive(){if(stopMessages){stopMessages();stopMessages=null}if(stopStories){stopStories=null}stopCamera();}
$("logoutBtn").onclick=()=>signOut(auth);
$("saveProfile").onclick=async()=>{const name=$("newDisplayName").value.trim();if(name.length<2)return toast("Name must be at least 2 characters");try{await updateProfile(currentUser,{displayName:name});await updateDoc(doc(db,"users",currentUser.uid),{name});$("profileName").textContent=name;$("sideName").textContent=name;$("topName").textContent=name;toast("Profile saved");}catch(e){toast(friendly(e))}};

// Camera, uploads and story creation
$("mediaFile").onchange=e=>{mediaFile=e.target.files[0]||null;if(!mediaFile)return;if(mediaFile.size>20*1024*1024){mediaFile=null;return toast("Maximum upload size is 20 MB");}previewFile(mediaFile);e.target.value=""};
function previewFile(file){stopCamera();$("cameraEmpty").classList.add("hidden");$("cameraVideo").classList.add("hidden");$("imagePreview").classList.add("hidden");$("videoPreview").classList.add("hidden");const url=URL.createObjectURL(file);if(file.type.startsWith("image/")){$("imagePreview").src=url;$("imagePreview").classList.remove("hidden")}else if(file.type.startsWith("video/")){$("videoPreview").src=url;$("videoPreview").classList.remove("hidden")}else{mediaFile=null;return toast("Choose an image or video")} $("publishStory").disabled=false;}
$("startCamera").onclick=async()=>{try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});$("cameraVideo").srcObject=cameraStream;$("cameraVideo").classList.remove("hidden");$("cameraEmpty").classList.add("hidden");$("imagePreview").classList.add("hidden");$("videoPreview").classList.add("hidden");mediaFile=null;$("publishStory").disabled=true;}catch(e){toast("Camera permission unavailable. Use upload instead.")}};
function stopCamera(){if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}
$("captureBtn").onclick=()=>{if(!cameraStream)return toast("Start the camera first");const v=$("cameraVideo"),c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;c.getContext("2d").drawImage(v,0,0);c.toBlob(blob=>{mediaFile=new File([blob],"snap.jpg",{type:"image/jpeg"});previewFile(mediaFile)},"image/jpeg",.88)};
$("discardMedia").onclick=()=>{mediaFile=null;stopCamera();["imagePreview","videoPreview","cameraVideo"].forEach(id=>$(id).classList.add("hidden"));$("cameraEmpty").classList.remove("hidden");$("publishStory").disabled=true};
$("publishStory").onclick=async()=>{if(!mediaFile||!currentUser)return;try{const safeName=mediaFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=`stories/${currentUser.uid}/${Date.now()}_${safeName}`;const storageRef=ref(storage,path);await uploadBytes(storageRef,mediaFile,{contentType:mediaFile.type});const url=await getDownloadURL
