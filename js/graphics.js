(function () {
  var tiles = document.querySelectorAll("[data-video-tile]");

  tiles.forEach(function (tile) {
    var video = tile.querySelector("[data-controlled-video]");
    var progress = tile.querySelector("[data-video-progress]");
    var pauseButton = tile.querySelector("[data-video-pause]");
    var soundButton = tile.querySelector("[data-video-sound]");
    var sliderMode = "progress";

    if (!video || !progress || !pauseButton || !soundButton) return;

    function updateSlider() {
      if (sliderMode === "volume") {
        progress.value = video.volume * 100;
        return;
      }

      if (!video.duration || Number.isNaN(video.duration)) {
        progress.value = 0;
        return;
      }

      progress.value = (video.currentTime / video.duration) * 100;
    }

    function updatePauseButton() {
      pauseButton.classList.toggle("is-paused", video.paused);
      pauseButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
    }

    function setSliderMode(mode) {
      sliderMode = mode;

      if (sliderMode === "volume") {
        progress.setAttribute("aria-label", "Volume");
        progress.value = video.volume * 100;
        return;
      }

      progress.setAttribute("aria-label", "Scrub video");
      updateSlider();
    }

    function playVideo(onStarted) {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise
          .then(function () {
            if (onStarted) onStarted();
          })
          .catch(function () {
            if (onStarted) onStarted();
          });
        return;
      }

      if (onStarted) onStarted();
    }

    function showControls() {
      tile.classList.add("is-controls-visible");
    }

    function hideControlsIfAmbient() {
      if (!video.muted) return;
      if (tile.contains(document.activeElement)) return;
      tile.classList.remove("is-controls-visible");
    }

    tile.addEventListener("mouseenter", showControls);
    tile.addEventListener("click", showControls);
    tile.addEventListener("mouseleave", hideControlsIfAmbient);
    tile.addEventListener("focusin", showControls);
    tile.addEventListener("focusout", function () {
      window.setTimeout(hideControlsIfAmbient, 0);
    });

    progress.addEventListener("input", function () {
      if (sliderMode === "volume") {
        var nextVolume = Number(progress.value) / 100;
        video.volume = Math.min(1, Math.max(0, nextVolume));
        video.muted = video.volume === 0;
        return;
      }

      if (!video.duration || Number.isNaN(video.duration)) return;
      video.currentTime = video.duration * (Number(progress.value) / 100);
      updateSlider();
    });

    pauseButton.addEventListener("click", function () {
      if (video.paused) {
        playVideo();
      } else {
        video.pause();
      }
    });

    soundButton.addEventListener("click", function () {
      tile.classList.add("is-controls-visible");
      video.loop = false;
      video.volume = 1;
      video.muted = true;
      video.currentTime = 0;
      setSliderMode("volume");
      playVideo(function () {
        video.muted = false;
      });
    });

    video.addEventListener("loadedmetadata", updateSlider);
    video.addEventListener("timeupdate", updateSlider);
    video.addEventListener("play", updatePauseButton);
    video.addEventListener("pause", updatePauseButton);
    video.addEventListener("ended", function () {
      video.muted = true;
      video.loop = true;
      setSliderMode("progress");
      tile.classList.remove("is-controls-visible");
      video.currentTime = 0;
      playVideo();
    });

    updatePauseButton();
    setSliderMode("progress");
  });
})();
