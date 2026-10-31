(function () {
  "use strict";

  var input = document.getElementById("q");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card[data-slug]"));
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip[data-cat]"));
  var countEl = document.getElementById("count");
  var emptyEl = document.getElementById("empty");
  var state = { q: "", cat: "全部" };

  if (!cards.length) return;

  function textOf(card) {
    return (card.dataset.text || "") + " " + card.textContent;
  }

  function apply() {
    var q = state.q.trim().toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var okCat = state.cat === "全部" || card.dataset.cat === state.cat;
      var okQ = !q || textOf(card).toLowerCase().indexOf(q) !== -1;
      var show = okCat && okQ;
      card.hidden = !show;
      if (show) shown += 1;
    });
    if (countEl) {
      countEl.textContent = q || state.cat !== "全部"
        ? "找到 " + shown + " 个"
        : "共 " + shown + " 个";
    }
    if (emptyEl) emptyEl.hidden = shown !== 0;
    try {
      var url = new URL(window.location.href);
      if (q) url.searchParams.set("q", state.q.trim());
      else url.searchParams.delete("q");
      history.replaceState(null, "", url);
    } catch (e) { /* file:// 下忽略 */ }
  }

  if (input) {
    var initial = new URLSearchParams(window.location.search).get("q");
    if (initial) {
      input.value = initial;
      state.q = initial;
    }
    input.addEventListener("input", function () {
      state.q = input.value;
      apply();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        input.value = "";
        state.q = "";
        apply();
        input.blur();
      }
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      state.cat = chip.dataset.cat;
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", c === chip ? "true" : "false");
      });
      apply();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && input && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
      input.select();
    }
  });

  apply();
})();
