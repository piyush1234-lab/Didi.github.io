// Touch and visual effects
function tou1(elem) {
    elem.style.background = "white";
    elem.style.color = "#111";
    elem.style.transform = "scale(1.05)";
}

function touend1(elem) {
    elem.style.background = "rgba(255, 255, 255, 0.15)";
    elem.style.color = "white";
    elem.style.transform = "scale(1)";
}

function tou11(elem) {
    elem.style.background = "white";
    elem.style.color = "#111";
}

function touend11(elem) {
    elem.style.background = "rgba(255, 255, 255, 0.15)";
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
    elem.style.boxShadow = "0px 0px 20px 15px rgba(255,255,255,0.5)";
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

// Form validation
function validation(event) {
    const form = document.getElementById("contact");

    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    const feedback = form.feedback.value.trim();

    if (name === "" || phone === "" || email === "" || feedback === "") {
        event.preventDefault();
        alert("Please fill all the fields!");
        return false;
    }

    return true;
}

function showSuccessPopup() {
  const popup = document.getElementById("successPopup");
  popup.classList.add("active");

  setTimeout(() => {
    window.location.href = "index.html";  // redirect
  }, 2000);
}
document.getElementById("contact").addEventListener("keypress", function(e) {
    if (e.target.id === "feedback") return;  // Allow normal typing inside textarea

    if (e.key === "Enter") {
        e.preventDefault();
        document.querySelector("button[type='submit']").click();
    }
});

// INTERNET POPUP SYSTEM WITH 3 MODES //

const netPopup = document.getElementById("netPopup");
const netMsg = document.getElementById("netMsg");
const netOkBtn = document.getElementById("netOkBtn");

// Popup texts (edit anytime)
const NET_TEXT = {
    load:   "Internet is OFF. Please turn it ON.",
    submit: "Please turn ON the Internet before submitting.",
    repeat: "Still offline… Please reconnect again."
};

let popupVisible = false;

function openNetPopup(mode) {
    if (popupVisible) return;        // prevents duplicate popups
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

// On page load
window.addEventListener("load", () => {
    if (!isOnline()) {
        openNetPopup("load");
    }
});

// Every 5 seconds
setInterval(() => {
    if (!isOnline()) {
        openNetPopup("repeat");
    }
}, 15000);

// FORM SUBMIT HANDLER // 

document.getElementById("contact").addEventListener("submit", function (event) {

    if (!validation(event)) return;

    if (!isOnline()) {
        event.preventDefault();
        openNetPopup("submit");
        return false;
    }

    // If online → allow submission to iframe
});

// SUCCESS POPUP + REDIRECT AFTER SUBMIT //

function afterSubmit() {
    // Getform returns a small HTML page → this triggers iframe load
    document.getElementById("successPopup").classList.add("active");

    setTimeout(() => {
        localStorage.removeItem("login");
 window.location.replace("index.html");   // correct redirect
    }, 2000);
}
// FORM SUBMIT
document.getElementById("contact").addEventListener("submit", function (event) {

    if (!validation(event)) {
        event.preventDefault();
        return false;
    }

    if (!isOnline()) {
        event.preventDefault();
        openNetPopup("submit");
        return false;
    }

    // Allow submit silently to iframe
});

// Detect iframe load = SUCCESS
document.querySelector("iframe[name='hiddenFrame']").addEventListener("load", () => {
    afterSubmit();
});