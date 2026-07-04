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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCaseAnchors);
  } else {
    initCaseAnchors();
  }
})();
