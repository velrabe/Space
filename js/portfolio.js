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
      var hideTimer = null;
      var pointerOnTrigger = false;
      var pointerOnBubble = false;

      if (!bubble || !video || !button) {
        return;
      }

      document.body.appendChild(bubble);

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

      function updateProgress() {
        if (!progress || !Number.isFinite(video.duration) || video.duration <= 0) {
          return;
        }

        progress.value = String((video.currentTime / video.duration) * 100);
      }

      function resetVideo() {
        video.pause();
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

        if (!video.paused) {
          video.pause();
          setButtonState(false);
          return;
        }

        var playPromise = video.play();
        setButtonState(true);

        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {
            setButtonState(false);
          });
        }
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
    });
  }

  function initPortfolioInteractions() {
    initCaseAnchors();
    initPortfolioVideos();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPortfolioInteractions);
  } else {
    initPortfolioInteractions();
  }
})();
