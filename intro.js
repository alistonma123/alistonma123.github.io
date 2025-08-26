document.addEventListener("DOMContentLoaded", () => {
  const introLines = [
    "Welcome to my site.",
    "I’m Aliston Ma.",
    " Engineer • Designer • Coder ",
    "Click Enter Below to Proceed"
  ];

  let i = 0, j = 0;
  const speed = 60;

  const introDiv = document.getElementById("intro-text");
  const enterBtn = document.getElementById("enter-btn");
  const cursor = document.getElementById("cursor");
  const root = document.getElementById("intro-root");

  // OPTIONAL: skip intro on repeat visits. Comment these 2 lines out if you want it every time.
  try { if (localStorage.getItem("introSeen") === "true") return location.replace("main.html"); } catch (e) {}

  function typeWriter() {
    if (i < introLines.length) {
      if (j < introLines[i].length) {
        introDiv.innerHTML += introLines[i].charAt(j++);
        setTimeout(typeWriter, speed);
      } else {
        introDiv.innerHTML += "\n";
        i++; j = 0;
        setTimeout(typeWriter, 600);
      }
    } else {
      cursor.style.display = "none";
      enterBtn.classList.add("show");
    }
  }
  typeWriter();

  function go() {
    try { localStorage.setItem("introSeen", "true"); } catch (e) {}
    root.classList.add("fade-out");
    setTimeout(() => location.href = "main.html", 800);
  }

  enterBtn.addEventListener("click", go);
  document.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
});
