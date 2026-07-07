(function () {
  var copiedTimer = null;
  var copiedButton = null;

  function fallbackCopyText(text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    document.body.removeChild(field);
    return Promise.resolve();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopyText(text);
      });
    }

    return fallbackCopyText(text);
  }

  function getTooltipText() {
    return document.documentElement.lang === "ru"
      ? "ссылка на кейс скопирована"
      : "case link copied";
  }

  function getLabelText() {
    return document.documentElement.lang === "ru"
      ? "Скопировать ссылку на кейс"
      : "Copy case link";
  }

  function buildCaseUrl(caseId) {
    var url = new URL(window.location.href);
    url.hash = caseId;
    return url.toString();
  }

  function initCaseAnchors() {
    var titles = document.querySelectorAll(".case-card[id] .case-card__title");

    titles.forEach(function (title) {
      var card = title.closest(".case-card[id]");
      if (!card || title.querySelector(".case-anchor-button")) {
        return;
      }

      var button = document.createElement("button");
      var tooltip = document.createElement("span");

      button.type = "button";
      button.className = "case-anchor-button";
      button.setAttribute("aria-label", getLabelText());
      button.textContent = "#";

      tooltip.className = "case-anchor-button__tooltip";
      tooltip.textContent = getTooltipText();
      button.appendChild(tooltip);

      button.addEventListener("click", function () {
        copyText(buildCaseUrl(card.id)).then(function () {
          window.clearTimeout(copiedTimer);
          if (copiedButton && copiedButton !== button) {
            copiedButton.classList.remove("is-copied");
          }

          copiedButton = button;
          button.classList.add("is-copied");
          copiedTimer = window.setTimeout(function () {
            button.classList.remove("is-copied");
            copiedButton = null;
          }, 1800);
        });
      });

      title.appendChild(button);
    });
  }

  function initPortfolioVideos() {
    var wrappers = document.querySelectorAll(".portfolio-video-tooltip");

    wrappers.forEach(function (wrapper) {
      var bubble = wrapper.querySelector(".portfolio-video-tooltip__bubble");
      var video = bubble ? bubble.querySelector("video") : null;
      var button = bubble
        ? bubble.querySelector("[data-portfolio-video-play]")
        : null;
      var progress = bubble
        ? bubble.querySelector("[data-portfolio-video-progress]")
        : null;
      var soundButton = bubble
        ? bubble.querySelector("[data-portfolio-video-sound]")
        : null;
      var hideTimer = null;
      var pointerOnTrigger = false;
      var pointerOnBubble = false;

      if (!bubble || !video || !button || !soundButton) {
        return;
      }

      document.body.appendChild(bubble);
      video.loop = true;
      video.muted = true;

      function isBubbleVisible() {
        return bubble.classList.contains("is-visible");
      }

      function getPlayLabel(isPlaying) {
        if (document.documentElement.lang === "ru") {
          return isPlaying ? "Поставить видео на паузу" : "Воспроизвести видео";
        }

        return isPlaying ? "Pause video" : "Play video";
      }

      function setButtonState(isPlaying) {
        button.classList.toggle("is-playing", isPlaying);
        button.setAttribute("aria-label", getPlayLabel(isPlaying));
      }

      function playVideo(onStarted, onFailed) {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise
            .then(function () {
              if (onStarted) onStarted();
            })
            .catch(function () {
              if (onFailed) onFailed();
            });
          return;
        }

        if (onStarted) onStarted();
      }

      function updateProgress() {
        if (!progress || !Number.isFinite(video.duration) || video.duration <= 0) {
          return;
        }

        progress.value = String((video.currentTime / video.duration) * 100);
      }

      function resetVideo() {
        video.pause();
        video.muted = true;
        video.loop = true;
        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = 0;
        }
        if (progress) {
          progress.value = "0";
        }
        setButtonState(false);
      }

      function positionBubble() {
        var rect = wrapper.getBoundingClientRect();
        var margin = 12;
        var gap = 10;
        var width = bubble.offsetWidth;
        var height = bubble.offsetHeight;
        var left = rect.left + rect.width / 2 - width / 2;
        var top = rect.top - height - gap;

        if (top < margin) {
          top = rect.bottom + gap;
        }

        if (top + height > window.innerHeight - margin) {
          top = Math.max(margin, window.innerHeight - height - margin);
        }

        left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

        bubble.style.left = left + "px";
        bubble.style.top = top + "px";
      }

      function showBubble() {
        window.clearTimeout(hideTimer);
        bubble.classList.add("is-visible");
        positionBubble();
        window.requestAnimationFrame(positionBubble);
      }

      function hasActiveFocus() {
        return wrapper.contains(document.activeElement) || bubble.contains(document.activeElement);
      }

      function hideBubble() {
        bubble.classList.remove("is-visible");
        resetVideo();
      }

      function scheduleHide() {
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(function () {
          if (!pointerOnTrigger && !pointerOnBubble && !hasActiveFocus()) {
            hideBubble();
          }
        }, 260);
      }

      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        pointerOnBubble = true;
        showBubble();

        if (!video.paused) {
          video.pause();
          setButtonState(false);
          return;
        }

        playVideo(null, function () {
          setButtonState(false);
        });
        setButtonState(true);
      });

      soundButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        pointerOnBubble = true;
        showBubble();
        video.loop = false;
        video.volume = 1;
        video.muted = false;
        video.currentTime = 0;
        updateProgress();
        playVideo(null, function () {
          video.muted = true;
          video.loop = true;
          setButtonState(false);
        });
      });

      if (progress) {
        progress.addEventListener("input", function () {
          if (!Number.isFinite(video.duration) || video.duration <= 0) {
            return;
          }

          video.currentTime = (Number(progress.value) / 100) * video.duration;
        });
      }

      video.addEventListener("loadedmetadata", updateProgress);
      video.addEventListener("timeupdate", updateProgress);
      video.addEventListener("play", function () {
        setButtonState(true);
      });
      video.addEventListener("pause", function () {
        setButtonState(false);
      });
      video.addEventListener("ended", function () {
        video.muted = true;
        video.loop = true;
        video.currentTime = 0;
        updateProgress();
        if (isBubbleVisible()) {
          playVideo();
          return;
        }

        resetVideo();
      });

      function enterTrigger() {
        pointerOnTrigger = true;
        showBubble();
      }

      function leaveTrigger() {
        pointerOnTrigger = false;
        scheduleHide();
      }

      function enterBubble() {
        pointerOnBubble = true;
        showBubble();
      }

      function leaveBubble() {
        pointerOnBubble = false;
        scheduleHide();
      }

      wrapper.addEventListener("pointerenter", enterTrigger);
      wrapper.addEventListener("mouseenter", enterTrigger);
      wrapper.addEventListener("mouseover", enterTrigger);
      wrapper.addEventListener("pointerleave", leaveTrigger);
      wrapper.addEventListener("mouseleave", leaveTrigger);
      wrapper.addEventListener("click", function (event) {
        event.preventDefault();
        enterTrigger();
      });
      bubble.addEventListener("pointerenter", enterBubble);
      bubble.addEventListener("mouseenter", enterBubble);
      bubble.addEventListener("mouseover", enterBubble);
      bubble.addEventListener("pointerleave", leaveBubble);
      bubble.addEventListener("mouseleave", leaveBubble);
      wrapper.addEventListener("focusin", showBubble);
      wrapper.addEventListener("focus", showBubble);
      wrapper.addEventListener("focusout", function () {
        window.setTimeout(scheduleHide, 0);
      });
      wrapper.addEventListener("blur", function () {
        window.setTimeout(scheduleHide, 0);
      });
      bubble.addEventListener("focusin", showBubble);
      bubble.addEventListener("focusout", function () {
        window.setTimeout(scheduleHide, 0);
      });
      window.addEventListener("resize", function () {
        if (isBubbleVisible()) {
          positionBubble();
        }
      });
      window.addEventListener(
        "scroll",
        function () {
          if (isBubbleVisible()) {
            positionBubble();
          }
        },
        true
      );

      setButtonState(false);
      updateProgress();
    });
  }

  function initCaseCarousels() {
    var carousels = document.querySelectorAll("[data-case-carousel]");

    carousels.forEach(function (carousel) {
      var slides = Array.prototype.slice.call(
        carousel.querySelectorAll("[data-case-carousel-slide]")
      );
      var previousButton = carousel.querySelector("[data-case-carousel-prev]");
      var nextButton = carousel.querySelector("[data-case-carousel-next]");
      var activeIndex = slides.findIndex(function (slide) {
        return slide.classList.contains("is-active");
      });
      var autoplayTimer = null;
      var resumeTimer = null;
      var autoplayDelay = 3000;
      var manualResumeDelay = 5000;

      if (slides.length < 2 || !previousButton || !nextButton) {
        return;
      }

      if (activeIndex < 0) {
        activeIndex = 0;
      }

      function showSlide(nextIndex) {
        activeIndex = (nextIndex + slides.length) % slides.length;
        slides.forEach(function (slide, index) {
          var isActive = index === activeIndex;
          slide.classList.toggle("is-active", isActive);
          slide.setAttribute("aria-hidden", isActive ? "false" : "true");
        });
      }

      function stopAutoplay() {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }

      function startAutoplay() {
        stopAutoplay();
        autoplayTimer = window.setInterval(function () {
          showSlide(activeIndex + 1);
        }, autoplayDelay);
      }

      function pauseAutoplayAfterManualAction() {
        stopAutoplay();
        window.clearTimeout(resumeTimer);
        resumeTimer = window.setTimeout(function () {
          showSlide(activeIndex + 1);
          startAutoplay();
        }, manualResumeDelay);
      }

      previousButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        showSlide(activeIndex - 1);
        pauseAutoplayAfterManualAction();
      });

      nextButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        showSlide(activeIndex + 1);
        pauseAutoplayAfterManualAction();
      });

      carousel.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          showSlide(activeIndex - 1);
          pauseAutoplayAfterManualAction();
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          showSlide(activeIndex + 1);
          pauseAutoplayAfterManualAction();
        }
      });

      showSlide(activeIndex);
      startAutoplay();
    });
  }

  function initTelegramFab() {
    var icons = Array.prototype.slice.call(document.querySelectorAll("[data-fab-icon]"));
    var angle = 0;
    var lastScrollY = window.scrollY;

    if (!icons.length) {
      return;
    }

    function onScroll() {
      var currentScrollY = window.scrollY;
      var delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      angle += delta * 0.55;

      icons.forEach(function (icon) {
        icon.style.transform = "rotate(" + angle + "deg)";
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initPortfolioInteractions() {
    initCaseAnchors();
    initPortfolioVideos();
    initCaseCarousels();
    initTelegramFab();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPortfolioInteractions);
  } else {
    initPortfolioInteractions();
  }
})();
