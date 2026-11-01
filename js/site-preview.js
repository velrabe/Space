(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const previews = [];

  function initPreview(host) {
    const frame = host.querySelector("iframe");
    const up = host.querySelector('[data-preview-step="-1"]');
    const down = host.querySelector('[data-preview-step="1"]');
    let page = null;
    let view = null;
    let targets = [0];
    let direction = 1;
    let visible = false;
    let manual = false;
    let loaded = false;
    let scrolling = false;
    let destination = null;
    let lastManualTarget = null;
    let timer = 0;
    let settleTimer = 0;
    let refresh = 0;

    function scaleFrame() {
      frame.style.transform = `scale(${host.clientWidth / 1440})`;
    }

    function canAnimate() {
      return page && visible && !document.hidden && !motion.matches && !manual;
    }

    function nearestIndex(position) {
      return targets.reduce(
        (best, target, index) =>
          Math.abs(target - position) < Math.abs(targets[best] - position)
            ? index
            : best,
        0,
      );
    }

    function updateArrows() {
      const position = page ? page.scrollTop : 0;
      const canGoUp = Boolean(page && position > 2);
      const canGoDown = Boolean(
        page && position < targets[targets.length - 1] - 2,
      );
      up.disabled = !canGoUp;
      down.disabled = !canGoDown;
      up.setAttribute("aria-hidden", String(!canGoUp));
      down.setAttribute("aria-hidden", String(!canGoDown));
      host.classList.toggle("can-scroll-up", canGoUp);
      host.classList.toggle("can-scroll-down", canGoDown);
    }

    function stop() {
      window.clearTimeout(timer);
      window.clearTimeout(settleTimer);
      timer = 0;
      settleTimer = 0;
      // Interrupt the browser's current scroll before handing control to a new action.
      if (scrolling && view)
        view.scrollTo({ top: page.scrollTop, behavior: "instant" });
      scrolling = false;
      destination = null;
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = 0;
      if (canAnimate() && !scrolling && targets.length > 1) {
        timer = window.setTimeout(advance, 3000);
      }
    }

    function updateTargets() {
      if (!page) return;
      const maximum = Math.max(0, page.scrollHeight - 810);
      const offsets = [0];
      frame.contentDocument
        .querySelectorAll("[data-preview-section]")
        .forEach((section) => {
          if (
            section.id === "hero" ||
            section.querySelector("[data-preview-section]")
          )
            return;
          const rect = section.getBoundingClientRect();
          const top = rect.top + page.scrollTop;
          const inset = section.classList.contains("feature")
            ? Math.max(24, (810 - rect.height) / 2)
            : 24;
          offsets.push(Math.min(maximum, Math.max(0, Math.round(top - inset))));
        });
      offsets.push(maximum);
      targets = offsets
        .sort((a, b) => a - b)
        .filter(
          (offset, index, sorted) =>
            index === 0 || offset - sorted[index - 1] > 4,
        );
      if (targets[targets.length - 1] !== maximum)
        targets[targets.length - 1] = maximum;
      if (lastManualTarget !== null)
        lastManualTarget = targets[nearestIndex(lastManualTarget)];
      updateArrows();
    }

    function finishScroll() {
      window.clearTimeout(settleTimer);
      settleTimer = 0;
      scrolling = false;
      destination = null;
      updateArrows();
      schedule();
    }

    function onScroll() {
      updateArrows();
      if (!scrolling) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finishScroll, 160);
    }

    function moveTo(next) {
      if (!page) return;
      const target = targets[Math.max(0, Math.min(next, targets.length - 1))];
      stop();
      if (Math.abs(target - page.scrollTop) < 2) {
        schedule();
        return;
      }
      if (motion.matches || !visible || document.hidden) {
        view.scrollTo({ top: target, behavior: "instant" });
        updateArrows();
        schedule();
        return;
      }
      destination = target;
      scrolling = true;
      view.scrollTo({ top: target, behavior: "smooth" });
      // Older browsers may not emit scrollend; scroll events debounce this fallback.
      settleTimer = window.setTimeout(finishScroll, 1200);
    }

    function advance() {
      if (!canAnimate() || targets.length < 2) return;
      const index = nearestIndex(page.scrollTop);
      if (index >= targets.length - 1) direction = -1;
      if (index <= 0) direction = 1;
      moveTo(index + direction);
    }

    function takeManualControl() {
      if (!page) return;
      if (!manual) lastManualTarget = targets[nearestIndex(page.scrollTop)];
      manual = true;
      stop();
    }

    function manualStep(step) {
      if (!page) return;
      takeManualControl();
      direction = step;
      const index = nearestIndex(lastManualTarget ?? page.scrollTop);
      const next = Math.max(0, Math.min(index + step, targets.length - 1));
      lastManualTarget = targets[next];
      moveTo(next);
    }

    [up, down].forEach((button) => {
      button.addEventListener("pointerdown", takeManualControl);
      button.addEventListener("focus", takeManualControl);
      button.addEventListener("click", () =>
        manualStep(Number(button.dataset.previewStep)),
      );
    });
    host.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      manual = false;
      lastManualTarget = null;
      direction = 1;
      schedule();
    });
    host.addEventListener("pointerleave", schedule);

    frame.addEventListener("load", () => {
      const doc = frame.contentDocument;
      if (!doc || !doc.querySelector("[data-preview-section]")) return;
      page = doc.scrollingElement;
      view = frame.contentWindow;
      updateTargets();
      up.hidden = false;
      down.hidden = false;
      host.classList.add("is-ready");
      view.addEventListener("scroll", onScroll, { passive: true });
      doc.addEventListener("scrollend", () => {
        if (
          scrolling &&
          destination !== null &&
          Math.abs(page.scrollTop - destination) < 2
        )
          finishScroll();
      });
      doc.addEventListener(
        "load",
        () => {
          window.cancelAnimationFrame(refresh);
          refresh = window.requestAnimationFrame(updateTargets);
        },
        true,
      );
      doc.fonts.ready.then(updateTargets);
      schedule();
    });

    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (loaded || !entries.some((entry) => entry.isIntersecting)) return;
        loaded = true;
        frame.src = host.dataset.previewSrc;
        loadObserver.disconnect();
      },
      { rootMargin: "160px" },
    );
    loadObserver.observe(host);

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        visible =
          entries[0].isIntersecting && entries[0].intersectionRatio >= 0.1;
        if (visible) schedule();
        else stop();
      },
      { threshold: [0, 0.1] },
    );
    visibilityObserver.observe(host);

    new ResizeObserver(scaleFrame).observe(host);
    scaleFrame();
    previews.push(() => {
      stop();
      schedule();
    });
  }

  document.querySelectorAll("[data-site-preview]").forEach(initPreview);
  document.addEventListener("visibilitychange", () =>
    previews.forEach((sync) => sync()),
  );
  motion.addEventListener("change", () => previews.forEach((sync) => sync()));
})();
