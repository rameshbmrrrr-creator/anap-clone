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
let peopleCache = [], friendsList = [], pendingSent = [], pendingReceived = [];

const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}
function initials(s){return (s||"?").slice(0,1).toUpperCase()}
function showAuth(){ $("authScreen").classList.remove("hidden");$("app").classList.add("hidden"); }
function showApp(){ $("authScreen").classList.add("hidden");$("app").classList.remove("hidden"); }
function go(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page+"Page").classList.add("active");document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="stories")loadStories();if(page==="friends")loadPeople();if(page==="chat")loadPeople(true);if(page==="admin"&&isAdmin)loadAdmin();}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.page)));

$("toggleAuth").onclick=()=>{signupMode=!
