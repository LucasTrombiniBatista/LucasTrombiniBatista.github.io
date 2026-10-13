(() => {
  const root = document.documentElement;
  root.classList.add("js");

  // Data de hoje na faixa de jornal
  const dataEl = document.getElementById("data-hoje");
  if (dataEl) {
    try {
      const txt = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(new Date());
      dataEl.textContent = txt;
    } catch (_) {}
  }
  const anoEl = document.getElementById("ano");
  if (anoEl) anoEl.textContent = new Date().getFullYear();

  // Aparecer ao rolar
  const items = document.querySelectorAll(".reveal");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  // Item ativo do menu conforme a seção
  const links = [...document.querySelectorAll(".nav a")];
  const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.remove("active"));
            const link = map.get(e.target.id);
            if (link) link.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    map.forEach((_, id) => {
      const sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }
})();
