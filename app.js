<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>SnapClone</title>
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#ffffff">
  <script>
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  </script>
  <style>
    :root { --primary: #fffc00; --bg: #fff; --text: #111; --gray: #f9f9f9; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); overflow: hidden; }
    .hidden { display: none !important; }
    
    /* App Layout */
    #app { display: flex; flex-direction: column; height: 100vh; background: #fff; }
    .content { flex: 1; overflow-y: hidden; position: relative; display: flex; flex-direction: column;}
    .page { display: none; height: 100%; overflow-y: auto; }
    .page.active { display: block; }
    
    /* 👻 EXACT SNAPCHAT CHAT UI REPLICA 👻 */
    #chatBlank { position: relative; background: #fff; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .snap-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; }
    .snap-header-left, .snap-header-right { display: flex; gap: 10px; align-items: center; }
    .snap-icon-btn { width: 38px; height: 38px; border-radius: 50%; background: #f2f2f2; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; color: #111; font-weight:bold; }
    .snap-icon-btn.yellow { background: var(--primary); position: relative; }
    .snap-badge { position: absolute; top: -2px; right: -2px; background: #ed3b55; color: #fff; font-size: 10px; font-weight: bold; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
    
    .snap-pills { display: flex; gap: 8px; padding: 5px 15px 12px; overflow-x: auto; border-bottom: 1px solid #f0f0f0; }
    .snap-pills::-webkit-scrollbar { display: none; }
    .snap-pill { padding: 6px 14px; background: #f2f2f2; border-radius: 20px; font-size: 14px; font-weight: 600; color: #111; white-space: nowrap; display:flex; align-items:center; gap:5px; }
    .snap-pill.dark { background: #111; color: #fff; }
    
    .snap-fab { position: absolute; bottom: 20px; right: 20px; width: 55px; height: 55px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.15); cursor: pointer; z-index: 10; }
    
    .person-row { display: flex; align-items: center; padding: 10px 15px; border-bottom: 1px solid #f9f9f9; background: #fff; cursor: pointer; }
    .avatar-wrap { position: relative; margin-right: 15px; }
    .avatar-wrap .avatar { width: 52px; height: 52px; border-radius: 50%; background: #eee; border: 2.5px solid #a33cf7; padding: 2px; background-clip: content-box; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; color: #333; }
    .chat-details { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
    .chat-details b { font-size: 17px; font-weight: 600; color: #000; letter-spacing: -0.3px; margin-bottom: 2px;}
    .chat-status { display: flex; align-items: center; font-size: 12.5px; font-weight: 600; }
    .status-sq { width: 12px; height: 12px; border-radius: 3px; display: inline-block; margin-right: 6px; }
    .status-sq.red { background: #ed3b55; }
    .status-sq.purple { background: #a33cf7; }
    .status-sq.blue { background: #007aff; border-radius: 50%; }
    .chat-status.red { color: #ed3b55; }
    .chat-status.purple { color: #a33cf7; }
    .chat-status.blue { color: #007aff; }
    .chat-action { padding-left: 10px; color: #333; display: flex; align-items: center; }

    /* Other App Styles (Camera, Story, Nav) */
    .nav-bar { display: flex; justify-content: space-around; align-items:center; background: #fff; padding: 12px 0; border-top: 1px solid #eee; padding-bottom: env(safe-area-inset-bottom, 15px); }
    .nav-item { font-size: 26px; cursor: pointer; opacity: 0.4; transition: 0.2s; filter: grayscale(100%); }
    .nav-item.active { opacity: 1; transform: scale(1.15); filter: none; }
    #toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #111; color: #fff; padding: 12px 24px; border-radius: 25px; font-size: 14px; opacity: 0; transition: 0.3s; z-index: 9999; font-weight: bold; }
    #toast.show { opacity: 1; top: 40px; }
    #cameraContainer { position: relative; height: 100%; background: #000; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center;}
    video, img.preview { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
    .cam-controls { position: absolute; bottom: 30px; z-index: 10; display: flex; gap: 15px; width: 100%; justify-content: center; align-items: center; }
    #captureBtn { width: 80px; height: 80px; border-radius: 50%; border: 6px solid #fff; background: rgba(255,255,255,0.3); cursor: pointer; }
    .chat-container { display: flex; flex-direction: column; height: 100%; background: #fff;}
    .messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
    .bubble { max-width: 75%; border-radius: 20px; padding: 12px 16px; font-size: 16px; border-bottom-left-radius: 4px; border: 1px solid #eee; background: #fff; align-self: flex-start;}
    .bubble.mine { border-bottom-left-radius: 20px; border-bottom-right-radius: 4px; background: #eb144c; color: white; border: none; align-self: flex-end;} 
    .chat-input { display: flex; gap: 10px; padding: 15px; background: #fff; border-top: 1px solid #eee; }
    .chat-input input { flex: 1; padding: 14px; border: 1px solid #ddd; border-radius: 25px; outline: none; background: #f5f5f5;}
    .chat-input button { background: var(--primary); border: none; padding: 10px 20px; border-radius: 25px; font-weight: bold; }
    #storiesGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 10px; }
    .story-card { border-radius: 12px; overflow: hidden; position: relative; height: 250px; background: #000; display: flex; flex-direction: column;}
    .story-media img, .story-media video { height: 100%; width: 100%; object-fit: cover; opacity: 0.8; }
    .story-card b { position: absolute; bottom: 10px; left: 10px; color: white; text-shadow: 1px 1px 4px rgba(0,0,0,0.9); z-index: 2; font-size: 15px;}
    button.primary { background: var(--primary); color: #000; border: none; padding: 8px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; }
    
    /* Auth */
    #authScreen { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--primary); padding: 20px; }
    .auth-box { background: #fff; padding: 30px; border-radius: 20px; width: 100%; max-width: 400px; text-align: center; }
    .auth-box input { width: 100%; padding: 14px; margin: 10px 0; border: 1px solid #ddd; border-radius: 12px; background: #f5f5f5;}
    .auth-box button { width: 100%; padding: 15px; background: var(--primary); border: none; border-radius: 12px; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <div id="toast">Message</div>
  
  <div id="authScreen">
    <div class="auth-box">
      <h1 style="margin-top:0;">👻 SnapClone</h1>
      <form id="authForm">
        <div id="signupNameWrap"><input type="text" id="authName" placeholder="Display Name"></div>
        <input type="text" id="authUsername" placeholder="Username" required autocomplete="off">
        <input type="password" id="authPassword" placeholder="Password" required minlength="8">
        <button type="submit" id="authSubmit">Create account</button>
      </form>
      <div id="toggleAuth" style="margin-top:15px; color:#555; text-decoration:underline; cursor:pointer;">Already have an account? Log in</div>
    </div>
  </div>

  <div id="app" class="hidden">
    <div class="content">
      
      <!-- Camera -->
      <div id="cameraPage" class="page active">
        <div id="cameraContainer">
          <div id="cameraEmpty" style="color:#fff; text-align:center; z-index:5;">
            <button class="primary" id="startCamera" style="padding:12px 24px; font-size:16px;">Turn on Camera</button>
            <p>OR</p>
            <input type="file" id="mediaFile" accept="image/*,video/*" style="color:#fff;">
          </div>
          <video id="cameraVideo" class="hidden" autoplay playsinline></video>
          <img id="imagePreview" class="preview hidden">
          <video id="videoPreview" class="preview hidden" controls></video>
          <div class="cam-controls">
            <button class="primary hidden" id="discardMedia" style="background:#fff; width:45px; height:45px; border-radius:50%;">X</button>
            <button id="captureBtn"></button>
            <button class="primary hidden" id="downloadBtn" style="background:#fff; width:45px; height:45px; border-radius:50%;">⬇️</button>
            <button class="primary hidden" id="publishStory" disabled style="padding: 12px 20px;">➤ Send</button>
          </div>
        </div>
      </div>

      <div id="storiesPage" class="page">
        <h2 style="margin:10px 15px;">Discover</h2>
        <div id="storiesGrid"></div>
      </div>

      <div id="friendsPage" class="page">
        <div style="padding:15px;"><input type="text" id="userSearch" placeholder="🔍 Search new friends..." style="width:100%; padding:14px; border-radius:15px; border:1px solid #ddd; font-size:15px; outline:none; background:#f5f5f5;"></div>
        <div id="usersGrid"></div>
      </div>

      <!-- EXACT SNAPCHAT CHAT PAGE -->
      <div id="chatPage" class="page" style="padding:0;">
        <div id="chatBlank">
          <!-- Top Header -->
          <div class="snap-header">
            <div class="snap-header-left">
              <div class="snap-icon-btn" id="profileGoBtn">👤</div>
              <div class="snap-icon-btn">🔍</div>
            </div>
            <h2 style="margin:0; font-size:20px; font-weight:700;">Chat</h2>
            <div class="snap-header-right">
              <div class="snap-icon-btn yellow">👤+<div class="snap-badge">5</div></div>
              <div class="snap-icon-btn">•••</div>
            </div>
          </div>
          <!-- Pills -->
          <div class="snap-pills">
            <div class="snap-pill">Unread 9+</div>
            <div class="snap-pill">🤖 Ai</div>
            <div class="snap-pill">Near Me</div>
            <div class="snap-pill dark">Stories 8</div>
          </div>
          
          <div style="padding: 0 15px 5px;"><input type="text" id="peopleSearch" placeholder="Search chats..." style="width:100%; padding:8px 15px; border-radius:20px; border:none; background:#f2f2f2; font-size:14px; outline:none;"></div>
          
          <!-- Chat List -->
          <div id="chatPeople" style="flex:1; overflow-y:auto; padding-bottom:80px;"></div>
          
          <!-- Yellow FAB -->
          <div class="snap-fab">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
        </div>
        
        <div id="chatBox" class="chat-container hidden">
          <div style="display:flex; align-items:center; gap:15px; border-bottom:1px solid #eee; padding:15px;">
            <button class="primary" onclick="document.getElementById('chatBox').classList.add('hidden'); document.getElementById('chatBlank').classList.remove('hidden');" style="background:#f0f0f0; border-radius:50%; width:40px;height:40px; padding:0;">←</button>
            <h3 id="chatTitle" style="margin:0; font-size:18px;">Chat</h3>
          </div>
          <div id="messages" class="messages"></div>
          <form id="messageForm" class="chat-input">
            <input type="text" id="messageText" placeholder="Send a chat..." required autocomplete="off">
            <button type="submit">Send</button>
          </form>
        </div>
      </div>

      <!-- Profile -->
      <div id="profilePage" class="page">
        <h2 style="text-align:center;">Settings</h2>
        <div style="padding:20px; text-align:center;">
          <h3 id="profileName">Name</h3>
          <input type="text" id="newDisplayName" style="width:100%; padding:12px; border-radius:12px; border:1px solid #ddd; margin-bottom:15px; background:#f9f9f9;">
          <button id="saveProfile" class="primary" style="width:100%; padding:14px; font-size:16px; margin-bottom:15px;">Save Profile</button>
          <button id="logoutBtn" style="width:100%; background:#eee; padding:14px; font-size:16px; border:none; border-radius:12px; font-weight:bold; color:red;">Log Out</button>
        </div>
      </div>

    </div>

    <!-- Bottom Nav -->
    <nav class="nav-bar">
      <div class="nav-item" data-page="stories">📍</div>
      <div class="nav-item" data-page="chat" style="position:relative;">💬<div style="position:absolute; top:-5px; right:-5px; background:#ed3b55; color:#fff; font-size:11px; font-weight:bold; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff;">10</div></div>
      <div class="nav-item active" data-page="camera" style="font-size:32px;">📷</div>
      <div class="nav-item" data-page="friends">👥</div>
      <div class="nav-item" data-page="stories">▶️</div>
    </nav>
  </div>

  <script type="module" src="app.js"></script>
  <script>
    document.getElementById("profileGoBtn").onclick = () => document.querySelectorAll("[data-page='profile']")[0]?.click();
    document.getElementById("startCamera").addEventListener("click", () => {
      document.getElementById("captureBtn").classList.remove("hidden");
      document.getElementById("publishStory").classList.add("hidden");
      document.getElementById("discardMedia").classList.add("hidden");
      document.getElementById("downloadBtn").classList.add("hidden");
    });
    document.getElementById("captureBtn").addEventListener("click", () => {
      document.getElementById("publishStory").classList.remove("hidden");
      document.getElementById("discardMedia").classList.remove("hidden");
      document.getElementById("downloadBtn").classList.remove("hidden");
      document.getElementById("captureBtn").classList.add("hidden");
    });
    document.getElementById("discardMedia").addEventListener("click", () => {
      document.getElementById("captureBtn").classList.remove("hidden");
      document.getElementById("publishStory").classList.add("hidden");
      document.getElementById("discardMedia").classList.add("hidden");
      document.getElementById("downloadBtn").classList.add("hidden");
    });
    document.getElementById("mediaFile").addEventListener("change", () => {
      setTimeout(() => {
        document.getElementById("publishStory").classList.remove("hidden");
        document.getElementById("discardMedia").classList.remove("hidden");
        document.getElementById("downloadBtn").classList.remove("hidden");
        document.getElementById("captureBtn").classList.add("hidden");
      }, 500);
    });
  </script>
</body>
</html>
