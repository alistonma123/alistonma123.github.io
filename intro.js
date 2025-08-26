const introLines = [
  "Welcome to my site.",
  "I’m Aliston Ma.",
  "Engineer • Designer • Builder.",
  "Click Enter Below to Proceed"
];

let i = 0;
let j = 0;
const speed = 60;
const introDiv = document.getElementById("intro-text");
const enterBtn = document.getElementById("enter-btn");
const cursor = document.getElementById("cursor");

// Check if intro was already shown before
if (localStorage.getItem("introSeen") === "true") {
  document.getElementById("intro").style.display = "none";
  if (window.startCanvas) window.startCanvas();
} else {
  typeWriter();
}

function typeWriter() {
  if (i < introLines.length) {
    if (j < introLines[i].length) {
      introDiv.innerHTML += introLines[i].charAt(j);
      j++;
      setTimeout(typeWriter, speed);
    } else {
      introDiv.innerHTML += "\n";
      i++;
      j = 0;
      setTimeout(typeWriter, 600);
    }
  } else {
    cursor.style.display = "none";
    enterBtn.classList.add("show");
  }
}

enterBtn.addEventListener("click", () => {
  document.getElementById("intro").classList.add("fade-out");
  localStorage.setItem("introSeen", "true");
  setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    if (window.startCanvas) window.startCanvas();
  }, 1000);
});
