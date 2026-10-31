(function () {
  var C = window.SITE_CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var map = function (arr, fn) { return (arr || []).map(fn).join(""); };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.title = C.meta.title;
  var desc = document.createElement("meta");
  desc.name = "description"; desc.content = C.meta.description;
  document.head.appendChild(desc);

  $("#brand").innerHTML = esc(C.brand.mark) + " " + esc(C.brand.name);
  $("#nav").innerHTML = map(C.nav, function (n) {
    return '<a href="#' + esc(n.id) + '" data-id="' + esc(n.id) + '">' + esc(n.label) + "</a>";
  });

  var h = C.hero, a = C.about, cu = C.curriculum, e = C.enroll, pr = C.prepare, f = C.faq, ins = C.instructor;

  // ---- 주차·날짜 계산 ----
  var S = C.schedule;
  var DOW = ["일", "월", "화", "수", "목", "금", "토"];
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var dkey = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var fmtDate = function (d) { return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + DOW[d.getDay()] + ")"; };
  var fmtShort = function (d) { return (d.getMonth() + 1) + "/" + d.getDate() + " (" + DOW[d.getDay()] + ")"; };
  var addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  var sp = S.start.split("-");
  var startDate = new Date(+sp[0], +sp[1] - 1, +sp[2]);

  var weeks = cu.units.map(function (u, i) {
    var date = addDays(startDate, 7 * i), due = null;
    if (u.assignment) {
      var dd = addDays(date, u.assignment.daysAfter || 0), t = (u.assignment.time || "23:59").split(":");
      due = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate(), +t[0], +t[1]);
    }
    return { i: i, n: i + 1, u: u, date: date, due: due };
  });
  var byClass = {}, byDue = {};
  weeks.forEach(function (w) {
    byClass[dkey(w.date)] = w;
    if (w.due) byDue[dkey(w.due)] = w;
  });

  var fmtDue = function (d) {
    return fmtDate(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  var remain = function (ms) {
    if (ms <= 0) return { text: "마감되었습니다", state: "closed" };
    var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
    var t = d > 0 ? d + "일 " + hh + "시간 남음" : hh > 0 ? hh + "시간 " + mm + "분 남음" : Math.max(mm, 1) + "분 남음";
    return { text: (d > 0 ? "D-" + d + " · " : "") + t, state: d < 1 ? "soon" : "open" };
  };

  var assignHtml = function (w) {
    var as = w.u.assignment;
    if (!as) return "";
    var ts = w.due.getTime();
    return '<div class="assign"><h4>📝 과제 · ' + esc(as.title) + "</h4><p>" + esc(as.desc) + "</p>" +
      '<div class="due"><span>마감 ' + esc(fmtDue(w.due)) + '</span><b class="countdown" data-due="' + ts + '"></b></div>' +
      (as.submitUrl
        ? '<a class="btn sm submit" data-due="' + ts + '" href="' + esc(as.submitUrl) + '" target="_blank" rel="noopener noreferrer">제출하기</a>'
        : '<button type="button" class="btn sm submit" data-week="' + w.n + '" data-due="' + ts + '">제출하기</button>') +
      "</div>";
  };
  var weekBodyHtml = function (w) {
    var vids = w.u.videos || [];
    return '<dl class="wk-meta"><div><dt>날짜</dt><dd>' + esc(fmtDate(w.date)) + "</dd></div>" +
      "<div><dt>시간</dt><dd>" + esc(S.time) + "</dd></div>" +
      "<div><dt>장소</dt><dd>" + esc(S.place) + "</dd></div></dl>" +
      "<h4>학습 내용</h4><ul>" + map(w.u.content, function (c) { return "<li>" + esc(c) + "</li>"; }) + "</ul>" +
      "<h4>참고 영상</h4>" + (vids.length
        ? '<ul class="videos">' + map(vids, function (v) {
            return '<li><a href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">▶ ' + esc(v.title) + "</a></li>";
          }) + "</ul>"
        : '<p class="muted">등록된 영상이 없습니다.</p>') +
      assignHtml(w);
  };

  var html = "";

  // 첫 화면
  html += '<section class="hero"><div class="petals" id="petals"></div><div class="hero-card">' +
    (h.badge ? '<span class="eyebrow">' + esc(h.badge) + "</span>" : "") +
    "<h1>" + esc(h.title) + "</h1>" +
    '<p class="subtitle">' + esc(h.subtitle) + "</p>" +
    '<p class="sub">' + esc(h.description) + "</p>" +
    '<div class="btn-row">' +
    '<a class="btn" href="#' + esc(h.primary.target) + '">' + esc(h.primary.label) + "</a>" +
    '<a class="btn ghost" href="#' + esc(h.secondary.target) + '">' + esc(h.secondary.label) + "</a>" +
    "</div></div></section>";

  // 강의 정보 한눈에
  html += '<section class="overview"><div class="grid cols-4">' + map(C.overview, function (o) {
    return '<div class="card ov-card"><div class="icon">' + esc(o.icon) + "</div><span>" + esc(o.label) + "</span><b>" + esc(o.value) + "</b></div>";
  }) + "</div></section>";

  // 통계
  html += '<section class="stats"><div class="grid cols-4">' + map(C.stats, function (s) {
    return '<div class="card stat-card"><div class="num"><span class="count" data-target="' + esc(s.value) + '">' + esc(s.value) + "</span><small>" + esc(s.suffix) + "</small></div><span>" + esc(s.label) + "</span></div>";
  }) + "</div></section>";

  // 프로그램 소개 + 장점 슬라이드
  html += '<section id="about"><h2 class="section-title">' + esc(a.title) + "</h2>" +
    '<p class="section-lead">' + esc(a.lead) + "</p>" +
    '<div class="slider" role="region" aria-roledescription="carousel" aria-label="강의의 장점">' +
    '<div class="slides" id="slides" tabindex="0">' + map(a.slides, function (s) {
      return '<article class="card slide"><div class="icon">' + esc(s.icon) + "</div><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></article>";
    }) + "</div>" +
    '<div class="slider-ctrl"><button class="arrow" id="prev" aria-label="이전">‹</button>' +
    '<div class="dots" id="dots">' + map(a.slides, function (_, i) {
      return '<button class="dot" data-i="' + i + '" aria-label="' + (i + 1) + '번째 슬라이드"></button>';
    }) + '</div><button class="arrow" id="next" aria-label="다음">›</button></div></div></section>';

  // 커리큘럼
  html += '<section id="curriculum"><h2 class="section-title">' + esc(cu.title) + "</h2>" +
    '<p class="section-lead">' + esc(cu.lead) + "</p>" +
    '<div class="acc-tools"><button class="chip-btn" id="expandAll" type="button">모두 펼치기</button></div>' +
    '<div class="timeline">' + map(weeks, function (w) {
      return '<details class="card wk-item" id="week-' + w.n + '"><summary>' +
        '<span class="wk-no">' + w.n + '주차</span><span class="wk-title">' + esc(w.u.title) + "</span>" +
        (w.u.assignment ? '<span class="chip">📝 과제</span>' : "") +
        '<span class="wk-date">' + esc(fmtShort(w.date)) + "</span></summary>" +
        '<div class="wk-body">' + weekBodyHtml(w) + "</div></details>";
    }) + "</div>" +
    '<h3 class="sub-title">' + esc(cu.calendarTitle) + "</h3>" +
    '<p class="section-lead">' + esc(cu.calendarLead) + "</p>" +
    '<div class="cal-wrap"><div class="card cal"><div class="cal-head">' +
    '<button class="arrow" id="calPrev" type="button" aria-label="이전 달">‹</button>' +
    '<b id="calTitle"></b>' +
    '<button class="arrow" id="calNext" type="button" aria-label="다음 달">›</button>' +
    '<button class="chip-btn" id="calToday" type="button">오늘</button></div>' +
    '<div class="cal-grid" id="calGrid"></div></div>' +
    '<div class="card cal-detail" id="calDetail" aria-live="polite"></div></div></section>';

  // 수강 안내
  html += '<section id="enroll"><h2 class="section-title">' + esc(e.title) + "</h2>" +
    '<p class="section-lead">' + esc(e.lead) + "</p>" +
    '<div class="grid two">' +
    '<div class="card"><dl class="info-list" style="margin:0">' + map(e.items, function (i) {
      return '<div class="info-row"><dt>' + esc(i.label) + "</dt><dd>" + esc(i.value) + "</dd></div>";
    }) + "</dl></div>" +
    '<div class="card"><div class="steps">' + map(e.steps, function (s) {
      return '<div class="step"><h3>' + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></div>";
    }) + '</div><p class="note">' + esc(e.note) + "</p></div></div></section>";

  // 수강 준비
  html += '<section id="prepare"><h2 class="section-title">' + esc(pr.title) + "</h2>" +
    '<p class="section-lead">' + esc(pr.lead) + "</p>" +
    '<div class="grid cols-4">' + map(pr.items, function (i) {
      return '<article class="card about-card"><div class="icon">' + esc(i.icon) + "</div><h3>" + esc(i.title) + "</h3><p>" + esc(i.text) + "</p></article>";
    }) + "</div></section>";

  // FAQ
  html += '<section id="faq"><h2 class="section-title">' + esc(f.title) + "</h2>" +
    '<div class="faq-list">' + map(f.items, function (i) {
      return '<details class="card"><summary>' + esc(i.q) + "</summary><p>" + esc(i.a) + "</p></details>";
    }) + "</div></section>";

  $("#app").innerHTML = html;

  // 푸터: 교수자 사진·소개·연락처
  $("#instructor").innerHTML =
    '<div class="footer-inner"><div class="footer-profile">' +
    '<div class="avatar" id="avatar"><img src="' + esc(ins.photo) + '" alt="' + esc(ins.name) + ' 교수자 사진"></div>' +
    "<div><h2>" + esc(ins.name) + ' <small>' + esc(ins.affiliation) + " · " + esc(ins.role) + "</small></h2>" +
    "<p>" + esc(ins.bio) + "</p>" +
    '<div class="tags left">' + map(ins.areas, function (t) { return '<span class="tag">' + esc(t) + "</span>"; }) + "</div>" +
    "</div></div>" +
    '<ul class="contact">' + map(ins.contact, function (c) {
      var v = c.href ? '<a href="' + esc(c.href) + '">' + esc(c.value) + "</a>" : esc(c.value);
      return "<li><b>" + esc(c.label) + "</b>" + v + "</li>";
    }) + "</ul></div>" +
    '<p class="copy">' + esc(C.footer.text) + "</p>";

  // 사진이 없으면 꽃 아이콘으로 대체
  var img = $("#avatar img");
  img.addEventListener("error", function () { $("#avatar").textContent = "🌸"; });

  // ---- 마감 카운트다운 ----
  var updateCountdowns = function () {
    var now = Date.now();
    document.querySelectorAll(".countdown").forEach(function (el) {
      var r = remain(+el.dataset.due - now);
      el.textContent = r.text;
      el.className = "countdown " + r.state;
    });
    document.querySelectorAll(".submit").forEach(function (el) {
      var closed = +el.dataset.due - now <= 0;
      el.classList.toggle("disabled", closed);
      el.textContent = closed ? "제출 마감" : "제출하기";
      if (closed) { el.removeAttribute("href"); el.setAttribute("aria-disabled", "true"); el.disabled = true; }
    });
  };

  // ---- 주차 아코디언 ----
  var expandBtn = $("#expandAll");
  expandBtn.addEventListener("click", function () {
    var all = document.querySelectorAll("details.wk-item");
    var open = expandBtn.dataset.open !== "1";
    all.forEach(function (d) { d.open = open; });
    expandBtn.dataset.open = open ? "1" : "0";
    expandBtn.textContent = open ? "모두 접기" : "모두 펼치기";
  });

  // ---- 월간 달력 ----
  var today = new Date(), todayKey = dkey(today);
  var lastKey = dkey(addDays(startDate, 7 * (weeks.length - 1)));
  var selKey = todayKey <= lastKey && todayKey >= dkey(startDate)
    ? todayKey
    : (function () {
        for (var k = 0; k < weeks.length; k++) if (dkey(weeks[k].date) >= todayKey) return dkey(weeks[k].date);
        return dkey(startDate);
      })();
  var sel = selKey.split("-");
  var calY = +sel[0], calM = +sel[1] - 1;
  var grid = $("#calGrid"), detail = $("#calDetail");

  var renderDetail = function () {
    var p = selKey.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var w = byClass[selKey], dw = byDue[selKey], out = '<h3>' + esc(fmtDate(d)) + "</h3>";
    if (w) {
      out += '<p class="detail-title"><span class="wk-no">' + w.n + "주차</span> " + esc(w.u.title) + "</p>" + weekBodyHtml(w);
    } else {
      out += '<p class="muted">이날은 수업이 없습니다.</p>';
    }
    if (dw && dw !== w) {
      out += '<div class="due-note"><b>' + dw.n + "주차 과제 마감일</b>" + assignHtml(dw) + "</div>";
    }
    detail.innerHTML = out;
    updateCountdowns();
  };

  var renderCal = function (focusKey) {
    $("#calTitle").textContent = calY + "년 " + (calM + 1) + "월";
    var first = new Date(calY, calM, 1), n = new Date(calY, calM + 1, 0).getDate();
    var h2 = DOW.map(function (d, i) { return '<div class="dow' + (i === 0 ? " sun" : "") + '">' + d + "</div>"; }).join("");
    for (var b = 0; b < first.getDay(); b++) h2 += '<span class="blank"></span>';
    for (var day = 1; day <= n; day++) {
      var k = calY + "-" + pad(calM + 1) + "-" + pad(day), w = byClass[k], dw = byDue[k];
      var cls = "day" + (w ? " has-class" : "") + (dw ? " has-due" : "") + (k === todayKey ? " today" : "") + (k === selKey ? " sel" : "");
      h2 += '<button type="button" class="' + cls + '" data-key="' + k + '"' + (k === selKey ? ' aria-pressed="true"' : "") + ">" +
        '<span class="dn">' + day + "</span>" +
        (w ? '<span class="tagc">' + w.n + "주차</span>" : "") +
        (dw ? '<span class="flag">📝 마감</span>' : "") + "</button>";
    }
    grid.innerHTML = h2;
    if (focusKey) { var el = grid.querySelector('[data-key="' + focusKey + '"]'); if (el) el.focus(); }
  };

  grid.addEventListener("click", function (ev) {
    var b = ev.target.closest(".day");
    if (!b) return;
    selKey = b.dataset.key;
    renderCal(selKey);
    renderDetail();
  });
  var shiftMonth = function (delta) {
    var d = new Date(calY, calM + delta, 1);
    calY = d.getFullYear(); calM = d.getMonth();
    renderCal();
  };
  $("#calPrev").addEventListener("click", function () { shiftMonth(-1); });
  $("#calNext").addEventListener("click", function () { shiftMonth(1); });
  $("#calToday").addEventListener("click", function () {
    calY = today.getFullYear(); calM = today.getMonth(); selKey = todayKey;
    renderCal(); renderDetail();
  });
  renderCal();
  renderDetail();
  updateCountdowns();
  setInterval(updateCountdowns, 30000);

  // participate.js에서 쓰는 공용 도구
  window.EduApp = {
    S: S, weeks: weeks, esc: esc, map: map, dkey: dkey, fmtDate: fmtDate, fmtShort: fmtShort,
    fmtDue: fmtDue, remain: remain, updateCountdowns: updateCountdowns
  };

  // 벚꽃잎
  var petals = $("#petals");
  for (var i = 0; i < 14; i++) {
    var p = document.createElement("span");
    p.className = "petal";
    p.style.left = Math.random() * 100 + "%";
    p.style.animationDuration = 7 + Math.random() * 7 + "s";
    p.style.animationDelay = -Math.random() * 10 + "s";
    petals.appendChild(p);
  }

  // 숫자 카운트업
  var counters = document.querySelectorAll(".count");
  var runCount = function (el) {
    var end = parseFloat(el.dataset.target), start = null, dur = 1200;
    if (isNaN(end)) return;
    var tick = function (t) {
      if (start === null) start = t;
      var k = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCount(en.target); obs.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { c.textContent = "0"; io.observe(c); });
  }

  // 장점 슬라이드
  var track = $("#slides"), dots = document.querySelectorAll(".dot");
  var slides = track.children;
  var step = function () {
    return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth;
  };
  var current = function () {
    // 화면이 넓어 마지막 슬라이드까지 맞춰 스크롤할 수 없을 때도 끝에 닿으면 마지막으로 봅니다.
    if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2 && track.scrollLeft > 0) return slides.length - 1;
    return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / step())));
  };
  var go = function (i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: i * step(), behavior: reduceMotion ? "auto" : "smooth" });
  };
  var syncDots = function () {
    var c = current();
    dots.forEach(function (d, i) { d.classList.toggle("on", i === c); });
    $("#prev").disabled = c === 0;
    $("#next").disabled = c === slides.length - 1;
  };
  $("#prev").addEventListener("click", function () { go(current() - 1); });
  $("#next").addEventListener("click", function () { go(current() + 1); });
  dots.forEach(function (d) { d.addEventListener("click", function () { go(+d.dataset.i); }); });
  track.addEventListener("scroll", syncDots, { passive: true });
  track.addEventListener("keydown", function (ev) {
    if (ev.key === "ArrowLeft") { ev.preventDefault(); go(current() - 1); }
    if (ev.key === "ArrowRight") { ev.preventDefault(); go(current() + 1); }
  });
  window.addEventListener("resize", syncDots);
  syncDots();

  // 모바일 메뉴
  var nav = $("#nav"), toggle = $("#menuToggle");
  var setMenu = function (open) {
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open);
  };
  toggle.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (ev) { if (ev.target.tagName === "A") setMenu(false); });

  // 현재 위치 메뉴 강조
  var links = nav.querySelectorAll("a");
  var onScroll = function () {
    // 참여 기능(participate.js)이 나중에 추가하는 섹션도 찾을 수 있도록 매번 조회합니다.
    var secs = C.nav.map(function (n) { return document.getElementById(n.id); }).filter(Boolean);
    var y = window.scrollY + 120, cur = "";
    secs.forEach(function (s) { if (s.offsetTop <= y) cur = s.id; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = "instructor";
    links.forEach(function (l) { l.classList.toggle("active", l.dataset.id === cur); });
    $("#toTop").classList.toggle("show", window.scrollY > 500);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // 맨 위로
  $("#toTop").addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
})();
