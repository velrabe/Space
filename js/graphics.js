(function () {
  var tiles = document.querySelectorAll("[data-video-tile]");

  tiles.forEach(function (tile) {
    var video = tile.querySelector("[data-controlled-video]");
    var progress = tile.querySelector("[data-video-progress]");
    var pauseButton = tile.querySelector("[data-video-pause]");
    var soundButton = tile.querySelector("[data-video-sound]");

    if (!video || !progress || !pauseButton || !soundButton) return;

    function updateProgress() {
      if (!video.duration || Number.isNaN(video.duration)) {
        progress.value = 0;
        return;
      }

      progress.value = (video.currentTime / video.duration) * 100;
    }

    function updatePauseButton() {
      pauseButton.textContent = video.paused ? "продолжить" : "пауза";
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
      if (!video.duration || Number.isNaN(video.duration)) return;
      video.currentTime = video.duration * (Number(progress.value) / 100);
      updateProgress();
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
      video.muted = true;
      video.currentTime = 0;
      soundButton.textContent = "смотрим со звуком";
      playVideo(function () {
        video.muted = false;
      });
    });

    video.addEventListener("loadedmetadata", updateProgress);
    video.addEventListener("timeupdate", updateProgress);
    video.addEventListener("play", updatePauseButton);
    video.addEventListener("pause", updatePauseButton);
    video.addEventListener("ended", function () {
      video.muted = true;
      video.loop = true;
      soundButton.textContent = "смотреть со звуком";
      tile.classList.remove("is-controls-visible");
      video.currentTime = 0;
      playVideo();
    });

    updatePauseButton();
  });
})();
