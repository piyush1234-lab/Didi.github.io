// ================== APK DETECTION (WEBINTOAPP) ==================
// Your APK user-agent is:  Dalvik/2.1.0 (...)
// So this check is 100% reliable.

const UA = navigator.userAgent || "";
const isApp = /^Dalvik\/\d+\.\d+/i.test(UA);

// If APK → skip login fully
if (isApp) {
    localStorage.setItem("login", "true");
    window.location.href = "didi.html";   // go directly to game
}



// ================== NORMAL WEB LOGIN (BROWSER ONLY) ==================

// Auto redirect if already logged in (browser only)
if (!isApp && localStorage.getItem("login") === "true") {
    window.location.href = "didi.html";
}



// ================== SHA-256 Password System ==================

async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// SHA256 of "Hindutva"
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



// ================== UI EFFECTS ==================

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