// ================== PLATFORM DETECTION ==================
const UA = navigator.userAgent || "";
const isApp = UA.startsWith("Dalvik/");
const isBrowser = /Mozilla\/5\.0/.test(UA);

// ================== LOGIN GUARD (BROWSER ONLY) ==================
if (isBrowser) {
    const login = localStorage.getItem("login");   // <-- LOGIN CHECK
    if (login !== "true") {
        location.replace("index.html");
    }
}

// ================== BFCache SAFETY (BROWSER ONLY) ==================
window.addEventListener("pageshow", (e) => {
    if (e.persisted && isBrowser) {
        const login = localStorage.getItem("login");   // <-- LOGIN CHECK
        if (login !== "true") {
            location.replace("index.html");
        }
    }
});

// ================== TOUCH & VISUAL EFFECTS ==================
function tou1(elem) {
    elem.style.background = "white";
    elem.style.color = "#111";
    elem.style.transform = "scale(1.05)";
}
function touend1(elem) {
    elem.style.background = "rgba(255,255,255,0.15)";
    elem.style.color = "white";
    elem.style.transform = "scale(1)";
}
function inpu(elem) {
    elem.style.background = "white";
    elem.style.color = "black";
}
function deinpu(elem) {
    elem.style.background = "transparent";
    elem.style.color = "white";
}
function shad(elem) {
    elem.style.boxShadow = "0 0 20px 15px rgba(255,255,255,0.5)";
    elem.style.border = "2px solid black";
}
function deshad(elem) {
    elem.style.boxShadow = "none";
    elem.style.border = "none";
}

// ================== FORM VALIDATION ==================
function validation() {
    const form = document.getElementById("contact");
    if (!form) return false;

    if (
        !form.name.value.trim() ||
        !form.phone.value.trim() ||
        !form.email.value.trim() ||
        !form.feedback.value.trim()
    ) {
        alert("Please fill all the fields!");
        return false;
    }
    return true;
}

// ================== INTERNET POPUP SYSTEM ==================
const netPopup = document.getElementById("netPopup");
const netMsg = document.getElementById("netMsg");
const netOkBtn = document.getElementById("netOkBtn");

const NET_TEXT = {
    load: "Internet is OFF. Please turn it ON.",
    submit: "Please turn ON the Internet before submitting.",
    repeat: "Still offline… Please reconnect again."
};

let popupVisible = false;

function openNetPopup(mode) {
    if (popupVisible || !netPopup) return;
    netMsg.textContent = NET_TEXT[mode];
    netPopup.style.display = "flex";
    popupVisible = true;
}

function closeNetPopup() {
    if (!netPopup) return;
    netPopup.style.display = "none";
    popupVisible = false;
}

if (netOkBtn) netOkBtn.addEventListener("click", closeNetPopup);

function isOnline() {
    return navigator.onLine;
}

window.addEventListener("load", () => {
    if (!isOnline()) openNetPopup("load");
});

setInterval(() => {
    if (!isOnline()) openNetPopup("repeat");
}, 15000);

// ================== FORM SUBMIT ==================
const form = document.getElementById("contact");

if (form) {
    form.addEventListener("submit", (event) => {

        if (!validation()) {
            event.preventDefault();
            return;
        }

        if (!isOnline()) {
            event.preventDefault();
            openNetPopup("submit");
            return;
        }

        // allow submit to iframe
    });

    form.addEventListener("keypress", (e) => {
        if (e.target.id === "feedback") return;
        if (e.key === "Enter") {
            e.preventDefault();
            form.querySelector("button[type='submit']").click();
        }
    });
}

// ================== SUCCESS + REDIRECT ==================
function afterSubmit() {
    const popup = document.getElementById("successPopup");
    if (popup) popup.classList.add("active");

    setTimeout(() => {
        // DO NOT remove login here
        location.replace("didi.html");
    }, 2000);
}

const iframe = document.querySelector("iframe[name='hiddenFrame']");
if (iframe) {
    iframe.addEventListener("load", afterSubmit);
}

// ================== AUTO EXIT AFTER 2 MIN (ONLY PLACE LOGIN IS CLEARED) ==================
const AUTO_EXIT_DELAY = 2 * 60 * 1000;
const HIDDEN_KEY = "contactHiddenAt";

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        localStorage.setItem(HIDDEN_KEY, Date.now());
    } else {
        const hiddenAt = Number(localStorage.getItem(HIDDEN_KEY));
        localStorage.removeItem(HIDDEN_KEY);

        if (isBrowser && hiddenAt && Date.now() - hiddenAt >= AUTO_EXIT_DELAY) {
            localStorage.removeItem("login");   // <-- ONLY LOGIN REMOVAL
            location.replace("index.html");
        }
    }
});