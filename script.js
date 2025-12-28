// APK user agent detection
const UA = navigator.userAgent || "";
const isApp = UA.startsWith("Dalvik/");

// Skip login entirely inside APK
if (isApp) {
    localStorage.setItem("login", "true");
    location.replace("didi.html");
}

// Auto-login when redirected from APK → Web
// Auto-login when redirected from APK → Web
if (!isApp && new URLSearchParams(location.search).get("from") === "apk") {
    localStorage.setItem("login", "true");
    location.replace("didi.html");
}

if (!isApp && localStorage.getItem("login") === "true") {
    location.replace("didi.html");
}

// SHA256
async function sha256(str) {
    const data = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

const STORED_HASH = "e9199cc4714b0479ae0d054e1e3745a971bdaa8ee7d860b6882a324f7bfd194e";

async function login() {
    let pwd = document.getElementById("pwd").value;
    const hash = await sha256(pwd);

    if (hash === STORED_HASH) {
        localStorage.setItem("login", "true");
        window.location.href = "didi.html";
    } else {
        alert("Wrong Username or Password!");
    }
}

function deselect(btn){ btn.style.boxShadow = "none"; }
function select(btn){ btn.style.boxShadow = "0px 0px 20px 10px rgba(255,255,255,0.7)"; }

function togglePwd() {
    const pwd = document.getElementById("pwd");
    pwd.type = pwd.type === "password" ? "text" : "password";
}