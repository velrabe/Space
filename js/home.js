(() => {
  const container = document.getElementById("libre-animation");
  if (!container || !window.lottie) return;

  const visual = container.closest(".libre__visual");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ready = false;

  const animation = window.lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: true,
    autoplay: false,
    path: "assets/libre/hero-reel.json",
    rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
  });

  const syncPlayback = () => {
    if (!ready) return;
    if (reducedMotion.matches) {
      animation.goToAndStop(90, true);
    } else if (document.hidden) {
      animation.pause();
    } else {
      animation.play();
    }
  };

  animation.addEventListener("DOMLoaded", () => {
    ready = true;
    visual.classList.add("is-playing");
    syncPlayback();
  });

  animation.addEventListener("data_failed", () => {
    visual.classList.remove("is-playing");
  });

  document.addEventListener("visibilitychange", syncPlayback);
  reducedMotion.addEventListener("change", syncPlayback);
})();
