


// ===============================
// FULLSCREEN GALLERY POPUP
// ===============================
const galleryItems = document.querySelectorAll(".gallery-img");

const popup = document.createElement("div");
popup.classList.add("fullscreen-popup");
popup.style.display = "none";
popup.innerHTML = `
    <span class="close-popup">&times;</span>
    <div class="popup-container"></div>
`;
document.body.appendChild(popup);

const popupContainer = popup.querySelector(".popup-container");
const closePopup = popup.querySelector(".close-popup");

galleryItems.forEach(item => {
    item.addEventListener("click", () => {
        popupContainer.innerHTML = "";
        if(item.tagName === "IMG"){
            const img = document.createElement("img");
            img.src = item.src;
            popupContainer.appendChild(img);
        } else if(item.tagName === "VIDEO"){
            const video = document.createElement("video");
            const source = item.querySelector("source");
            video.src = source ? source.src : item.src;
            video.controls = true;
            video.autoplay = true;
            video.loop = true;
            video.muted = false;
            popupContainer.appendChild(video);
        }
        popup.style.display = "flex";
    });
});

closePopup.addEventListener("click", () => {
    popup.style.display = "none";
    popupContainer.innerHTML = "";
});
popup.addEventListener("click", e => {
    if(e.target === popup){
        popup.style.display = "none";
        popupContainer.innerHTML = "";
    }
});

// 💎 SAFE LOADER FIX
window.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById("loader");

    setTimeout(() => {
        loader.style.opacity = "0";
        loader.style.transition = "0.6s ease";

        setTimeout(() => {
            loader.style.display = "none";
        }, 600);

    }, 1200);
});

// Initialize EmailJS
(function(){
    emailjs.init("TJx3FNm7lGoHznY_k");
})();

const form = document.getElementById("booking-form");

form.addEventListener("submit", function(e){
    e.preventDefault();

    emailjs.sendForm("service_u6o4ozr", "template_zjwsl6y", this)
    .then(function(response){
        console.log("SUCCESS!", response);

        // Show popup
        showPopup();

        form.reset();

    }, function(error){
        console.error("FAILED...", error);
        alert("Error: " + error.text);
    });
});

function showPopup() {
    const popup = document.getElementById("popup");
    popup.style.display = "block";

    setTimeout(() => {
        popup.style.display = "none";
    }, 3000);
}

