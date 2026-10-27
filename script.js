(() => {
  const root = document.documentElement;
  root.classList.add("js");

  // Data de hoje na faixa de jornal
  const dataEl = document.getElementById("data-hoje");
  if (dataEl) {
    try {
      const loc = document.documentElement.lang === "en" ? "en-US" : "pt-BR";
      const txt = new Intl.DateTimeFormat(loc, {
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

  // Atividade no GitHub (lê só o JSON estático gerado pela Action)
  const gh = document.getElementById("gh-activity");
  if (gh && window.fetch) {
    const en = root.lang === "en";
    const loc = en ? "en-US" : "pt-BR";
    const fmt = (n) => n.toLocaleString(loc);
    const set = (key, txt) => {
      const el = gh.querySelector(`[data-gh="${key}"]`);
      if (el) el.textContent = txt;
    };
    const parse = (iso) => new Date(iso + "T12:00:00");
    const dayFmt = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short" });
    const monthFmt = new Intl.DateTimeFormat(loc, { month: "short" });

    fetch(gh.dataset.src, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const days = Array.isArray(d.days) ? d.days : [];
        if (!days.length) throw 0;

        let active = 0, longest = 0, run = 0, best = days[0];
        days.forEach((day) => {
          if (day[1] > 0) { active++; run++; longest = Math.max(longest, run); } else run = 0;
          if (day[1] > best[1]) best = day;
        });
        // Sequência atual: hoje ainda zerado não quebra a sequência
        let current = 0, i = days.length - 1;
        if (days[i][1] === 0) i--;
        for (; i >= 0 && days[i][1] > 0; i--) current++;

        set("meta", `${fmt(Number(d.publicRepos) || 0)} ${en ? "public repositories" : "repositórios públicos"} · @${d.login}`);
        set("total", fmt(Number(d.total) || 0));
        set("active", fmt(active));
        set("current", fmt(current));
        set("longest", fmt(longest));
        set("best", fmt(best[1]));
        set("best-date", dayFmt.format(parse(best[0])).replace(".", ""));

        // Heatmap: colunas = semanas, linhas = dias da semana
        const grid = gh.querySelector(".gh-grid");
        const months = gh.querySelector(".gh-months");
        const offset = parse(days[0][0]).getDay();
        const word = en ? "contributions on" : "contribuições em";
        let lastMonth = -1;
        days.forEach(([iso, count, level], idx) => {
          const date = parse(iso);
          const col = Math.floor((idx + offset) / 7) + 1;
          const cell = document.createElement("span");
          cell.className = "gh-cell";
          cell.dataset.level = String(Math.min(4, Math.max(0, level | 0)));
          cell.style.gridColumn = col;
          cell.style.gridRow = date.getDay() + 1;
          cell.title = `${count} ${word} ${dayFmt.format(date)}`;
          grid.appendChild(cell);
          if (date.getDate() <= 7 && date.getMonth() !== lastMonth && col > 1) {
            lastMonth = date.getMonth();
            const m = document.createElement("span");
            m.className = "label muted";
            m.style.gridColumn = `${col} / span 4`;
            m.textContent = monthFmt.format(date).replace(".", "");
            months.appendChild(m);
          }
        });
        gh.hidden = false;
        const scroller = gh.querySelector(".gh-scroll");
        scroller.scrollLeft = scroller.scrollWidth;
      })
      .catch(() => { gh.hidden = true; });
  }
})();
