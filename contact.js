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

function tou11(elem) {
    elem.style.background = "white";
    elem.style.color = "#111";
}

function touend11(elem) {
    elem.style.background = "rgba(255,255,255,0.15)";
    elem.style.color = "white";
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

function deshad1(elem) {
    elem.style.transform = "scale(1.1)";
}

function deshad2(elem) {
    elem.style.transform = "scale(1)";
}

// ================== FORM VALIDATION ==================

function validation() {
    const form = document.getElementById("contact");

    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const feedback = form.feedback.value.trim();

    if (!name || !phone || !email || !feedback) {
        alert("Please fill all the fields!");
        return false;
    }
    return true;
}

// ================== INTERNET POPUP SYSTEM ==================

const netPopup = document.getElementById("netPopup");
const netMsg   = document.getElementById("netMsg");
const netOkBtn = document.getElementById("netOkBtn");

const NET_TEXT = {
    load:   "Internet is OFF. Please turn it ON.",
    submit: "Please turn ON the Internet before submitting.",
    repeat: "Still offline… Please reconnect again."
};

let popupVisible = false;

function openNetPopup(mode) {
    if (popupVisible) return;
    netMsg.textContent = NET_TEXT[mode];
    netPopup.style.display = "flex";
    popupVisible = true;
}

function closeNetPopup() {
    netPopup.style.display = "none";
    popupVisible = false;
}

netOkBtn.addEventListener("click", closeNetPopup);

function isOnline() {
    return navigator.onLine;
}

// Show popup on page load if offline
window.addEventListener("load", () => {
    if (!isOnline()) openNetPopup("load");
});

// Re-check every 15 seconds
setInterval(() => {
    if (!isOnline()) openNetPopup("repeat");
}, 15000);

// ================== FORM SUBMIT HANDLER ==================

const form = document.getElementById("contact");

form.addEventListener("submit", function (event) {

    if (!validation()) {
        event.preventDefault();
        return;
    }

    if (!isOnline()) {
        event.preventDefault();
        openNetPopup("submit");
        return;
    }

    // ✔ allow submit to hidden iframe
});

// ================== SUCCESS POPUP + REDIRECT ==================

function afterSubmit() {
    const popup = document.getElementById("successPopup");
    popup.classList.add("active");

    setTimeout(() => {
        localStorage.removeItem("login");
        window.location.href = "index.html";   // APK-safe redirect
    }, 2000);
}

// Detect iframe load = submission success
const iframe = document.querySelector("iframe[name='hiddenFrame']");

iframe.addEventListener("load", () => {
    afterSubmit();
});

// ================== ENTER KEY SUBMIT FIX ==================

form.addEventListener("keypress", function (e) {
    if (e.target.id === "feedback") return;

    if (e.key === "Enter") {
        e.preventDefault();
        form.querySelector("button[type='submit']").click();
    }
});