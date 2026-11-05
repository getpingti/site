(function () {
  "use strict";

  var input = document.getElementById("q");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".card[data-slug]"));
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip[data-cat]"));
  var countEl = document.getElementById("count");
  var emptyEl = document.getElementById("empty");
  var grid = document.getElementById("grid");
  var state = { q: "", cat: "全部" };

  if (!cards.length) return;

  /* JS 分列瀑布流：把可见卡片按顺序轮流分到各列，
     阅读顺序变成横向（第一行从左到右是 1、2、3……），
     不再像 CSS 多列那样先填满第一列。列数与 CSS 断点一致：>1100 三列、>860 两列、其余一列。 */
  var colCount = 0;
  var stash = document.createElement("div");
  stash.style.display = "none";

  function desiredCols() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    return w > 1100 ? 3 : w > 860 ? 2 : 1;
  }

  function layout() {
    if (!grid) return;
    var n = desiredCols();
    colCount = n;
    grid.classList.add("js-masonry");
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    var cols = [];
    for (var i = 0; i < n; i++) {
      var col = document.createElement("div");
      col.className = "masonry-col";
      grid.appendChild(col);
      cols.push(col);
    }
    var vi = 0;
    cards.forEach(function (card) {
      if (card.hidden) {
        stash.appendChild(card);
      } else {
        cols[vi % n].appendChild(card);
        vi += 1;
      }
    });
  }

  if (grid && emptyEl && emptyEl.parentNode === grid) {
    grid.parentNode.insertBefore(emptyEl, grid.nextSibling);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (grid && desiredCols() !== colCount) layout();
    }, 150);
  });

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
    layout();
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
