const introLines = [
  "Welcome to my site.",
  "I’m Aliston Ma.",
  "Engineer • Designer • Builder.",
  "Blending circuits, code, and creativity."
];

let i = 0;
let j = 0;
const speed = 60; // typing speed
const introDiv = document.getElementById("intro-text");
const enterBtn = document.getElementById("enter-btn");

function typeWriter() {
  if (i < introLines.length) {
    if (j < introLines[i].length) {
      introDiv.innerHTML += introLines[i].charAt(j);
      j++;
      setTimeout(typeWriter, speed);
    } else {
      introDiv.innerHTML += "\n"; // new line
      i++;
      j = 0;
      setTimeout(typeWriter, 500); // pause between lines
    }
  } else {
    enterBtn.style.display = "inline-block"; // show enter
  }
}

typeWriter();

// Handle enter button
enterBtn.addEventListener("click", () => {
  document.getElementById("intro").style.display = "none";
  document.getElementById("sitewrap").style.display = "block";
});
