// ===================== REAL APK DETECTION (100% RELIABLE) =====================
// Your APK user-agent starts with "Dalvik/2.x.x", browser does NOT contain this.
const UA = navigator.userAgent || "";
const isApp = UA.startsWith("Dalvik/");



// ===================== APK AUTO-LOGIN =====================
// APK ONLY → skip login completely
if (isApp) {
    localStorage.setItem("login", "true");
    window.location.href = "didi.html";   // go directly to game
}



// ===================== NORMAL WEB LOGIN =====================

// Browser only: Already logged in → go to game
if (!isApp && localStorage.getItem("login") === "true") {
    window.location.href = "didi.html";
}



// ===================== PASSWORD SYSTEM =====================

// SHA256 hash generator
async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// SHA256("Hindutva")
const STORED_HASH =
    "63f8e09e78d3fc42982680e79141ae07bfe8a54b1064492530e84a4cee0cb8b7";

async function login() {
    let pwd = document.getElementById("pwd").value;
    const userHash = await sha256(pwd);

    if (userHash === STORED_HASH) {
        localStorage.setItem("login", "true");
        window.location.href = "didi.html";
    } else {
        alert("Wrong Username or Password!");
    }
}



// ===================== UI EFFECTS =====================

function deselect(btn) {
    btn.style.boxShadow = "none";
}

function select(btn){
    btn.style.boxShadow =
        "0px 0px 20px 10px rgba(255, 255, 255, 0.7)";
}

function togglePwd() {
    let pwd = document.getElementById("pwd");
    pwd.type = (pwd.type === "password") ? "text" : "password";
}