window.addEventListener("load", () =>{
   if (window.Android) {
    // If running inside app → skip login and go directly to game
    window.location.href = "didi.html";
}
});

// Convert string → SHA256 hash (hex)
async function sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}



const STORED_HASH = "63f8e09e78d3fc42982680e79141ae07bfe8a54b1064492530e84a4cee0cb8b7"; // SHA256 of Hindutva

async function login() {
    let pwd = document.getElementById("pwd").value;

    // Hash user input
    const userHash = await sha256(pwd);

    if (userHash === STORED_HASH) {
        localStorage.setItem("login", "true");
        alert("soon this page will be availabe")
    } else {
        alert("Wrong Username or Password!");
    }
}
  function deselect(btn) {
    btn.style.boxShadow = "none";
  }
  function select(btn){
btn.style.boxShadow = "0px 0px 20px 10px rgba(255, 255, 255, 0.7)";}
function togglePwd() {
  let pwd = document.getElementById("pwd");
  if (pwd.type === "password") {
    pwd.type = "text";     // Show the password
  } else {
    pwd.type = "password"; // Hide the password
  }
}
