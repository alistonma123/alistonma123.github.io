const introLines = [
  "Welcome to my site.",
  "I’m Aliston Ma.",
  "Engineer • Designer • Coder.",
  " Click Enter Below to Proceed."
];

let i = 0;
let j = 0;
const speed = 60;
const introDiv = document.getElementById("intro-text");
const enterBtn = document.getElementById("enter-btn");

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
    enterBtn.classList.add("show");
  }
}

typeWriter();

enterBtn.addEventListener("click", () => {
  document.getElementById("intro").classList.add("fade-out");
  setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    document.getElementById("sitewrap").style.display = "block";
    if (window.startCanvas) window.startCanvas();
  }, 1000);
});
