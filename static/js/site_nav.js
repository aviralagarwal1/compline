/* Disclosure menus. Handles any number per page: anything declared with
   data-menu / data-menu-btn / data-menu-panel (account menu, export menu) and
   the public pages' mobile nav toggle. */
(function () {
  var menus = [];

  function setOpen(menu, open, moveFocus) {
    menu.root.classList.toggle(menu.openClass, open);
    menu.btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && moveFocus) {
      var first = menu.panel.querySelector("a, button");
      if (first) first.focus();
    }
  }

  function closeAll(except) {
    menus.forEach(function (menu) {
      if (menu !== except) setOpen(menu, false, false);
    });
  }

  function register(root, btn, panel, openClass) {
    if (!root || !btn || !panel) return;
    var menu = { root: root, btn: btn, panel: panel, openClass: openClass };
    menus.push(menu);

    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      var willOpen = !root.classList.contains(openClass);
      closeAll(menu);
      setOpen(menu, willOpen, true);
    });

    // Following a link or firing an action should always dismiss the menu.
    panel.querySelectorAll("a, button").forEach(function (element) {
      element.addEventListener("click", function () {
        setOpen(menu, false, false);
      });
    });
  }

  document.querySelectorAll("[data-menu]").forEach(function (root) {
    register(
      root,
      root.querySelector("[data-menu-btn]"),
      root.querySelector("[data-menu-panel]"),
      "is-open"
    );
  });

  var nav = document.getElementById("siteNav");
  var navBtn = document.getElementById("navMenuBtn");
  var navPanel = document.getElementById("navActionsPanel");
  if (nav && navBtn && navPanel) register(nav, navBtn, navPanel, "nav--open");

  if (!menus.length) return;

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    menus.forEach(function (menu) {
      if (menu.root.classList.contains(menu.openClass)) {
        setOpen(menu, false, false);
        menu.btn.focus();
      }
    });
  });

  document.addEventListener("click", function (event) {
    menus.forEach(function (menu) {
      if (menu.root.classList.contains(menu.openClass) && !menu.root.contains(event.target)) {
        setOpen(menu, false, false);
      }
    });
  });
})();

/* Public pages: someone who already has a session should be offered their
   workspace, not another sign-in prompt. */
(function () {
  var token = "";
  try { token = sessionStorage.getItem("compline_token") || ""; } catch (err) { return; }
  if (!token) return;
  document.querySelectorAll('a[href="/auth/google"]').forEach(function (link) {
    link.setAttribute("href", "/app");
    link.textContent = link.classList.contains("nav-cta") ? "Open workspace" : "Workspace";
  });
})();

/* Reveal-on-scroll for landing sections marked `.reveal`. They render fully
   without this - the class only adds an entrance, once, so a viewer with JS
   off or reduced motion on still sees the finished page. */
(function () {
  var targets = document.querySelectorAll(".reveal");
  if (!targets.length || typeof IntersectionObserver !== "function") return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  targets.forEach(function (el) { observer.observe(el); });
})();

/* Account button: the signed-in person's initials and first name instead of a
   generic "Account". The saved Profile name wins (pages that load it call
   setAccountIdentity, and it is kept for the session); otherwise the name
   Google gave at sign-in. With no name it stays "Account" with the icon. */
(function () {
  var btn = document.querySelector(".account-btn");
  if (!btn) return;
  var nameEl = btn.querySelector(".account-name");
  var avatar = btn.querySelector(".account-avatar");
  var icon = avatar.innerHTML;

  function tokenName() {
    try {
      var part = (sessionStorage.getItem("compline_token") || "").split(".")[1];
      if (!part) return null;
      part = part.replace(/-/g, "+").replace(/_/g, "/");
      while (part.length % 4) part += "=";
      var bytes = Uint8Array.from(atob(part), function (c) { return c.charCodeAt(0); });
      var meta = JSON.parse(new TextDecoder().decode(bytes)).user_metadata || {};
      var first = (meta.first_name || meta.given_name || "").trim();
      var last = (meta.last_name || meta.family_name || "").trim();
      var full = (meta.full_name || meta.name || meta.display_name || "").trim();
      if (!first && full) {
        var parts = full.split(/\s+/);
        first = parts[0];
        if (!last && parts.length > 1) last = parts[parts.length - 1];
      }
      return { first: first, last: last };
    } catch (err) {
      return null;
    }
  }

  function savedName() {
    try { return JSON.parse(sessionStorage.getItem("compline_name") || "null"); } catch (err) { return null; }
  }

  function initial(text) {
    var first = Array.from((text || "").trim())[0];
    return first ? first.toLocaleUpperCase() : "";
  }

  function render(name) {
    var first = name && (name.first || "").trim();
    if (!first) {
      nameEl.textContent = "Account";
      avatar.innerHTML = icon;
      btn.removeAttribute("title");
      return;
    }
    nameEl.textContent = first;
    avatar.textContent = initial(first) + initial(name.last);
    btn.title = [first, (name.last || "").trim()].filter(Boolean).join(" ");
  }

  window.setAccountIdentity = function (first, last) {
    var name = { first: (first || "").trim(), last: (last || "").trim() };
    try {
      if (name.first) sessionStorage.setItem("compline_name", JSON.stringify(name));
      else sessionStorage.removeItem("compline_name");
    } catch (err) {}
    render(name.first ? name : tokenName());
  };

  render(savedName() || tokenName());
})();
