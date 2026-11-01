/*
 * 수강생 참여 기능 — 환영 폭죽, 안내 팝업, 회원 가입, 실시간 투표, 로그인·출석·과제 제출
 * 데이터는 store.js(EduStore)를 통해 저장합니다.
 */
(function () {
  var C = window.SITE_CONFIG, A = window.EduApp, St = window.EduStore;
  if (!C || !A || !St) return;

  var esc = A.esc, map = A.map, weeks = A.weeks;
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var fmtTime = function (ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  var fmtSize = function (b) { return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + "KB" : (b / 1048576).toFixed(1) + "MB"; };
  var todayKey = A.dkey(new Date());
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var toastTimer;
  var toast = function (msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2800);
  };

  var scrollToId = function (id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  // ---------- 세션(로그인) ----------
  var getSession = function () { return St.get("session", null); };
  var voterId = function () {
    var s = getSession();
    if (s) return "s:" + s.studentId;
    var d = St.get("device", null);
    if (!d) { d = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); St.set("device", d); }
    return "d:" + d;
  };

  // ---------- 섹션 삽입 ----------
  var ap = C.apply, po = C.poll, cl = C.classroom;

  var fieldHtml = function (f) {
    var id = "f-" + f.name, req = f.required ? ' <i class="req">*</i>' : "";
    var input;
    if (f.type === "checkbox") {
      return '<div class="field check" data-field="' + esc(f.name) + '"><label><input type="checkbox" id="' + id + '" name="' + esc(f.name) + '"> ' + esc(f.label) + req +
        '</label><p class="err" id="err-' + esc(f.name) + '"></p></div>';
    }
    if (f.type === "select") {
      input = '<select id="' + id + '" name="' + esc(f.name) + '"><option value="">선택해 주세요</option>' +
        map(f.options, function (o) { return '<option value="' + esc(o) + '">' + esc(o) + "</option>"; }) + "</select>";
    } else if (f.type === "textarea") {
      input = '<textarea id="' + id + '" name="' + esc(f.name) + '" rows="4" placeholder="' + esc(f.placeholder || "") + '"></textarea>';
    } else {
      input = '<input id="' + id + '" name="' + esc(f.name) + '" type="' + esc(f.type || "text") + '" placeholder="' + esc(f.placeholder || "") + '" autocomplete="' + (f.type === "password" ? "new-password" : "off") + '">';
    }
    return '<div class="field" data-field="' + esc(f.name) + '"><label for="' + id + '">' + esc(f.label) + req + "</label>" + input +
      '<p class="err" id="err-' + esc(f.name) + '"></p></div>';
  };

  var applyHtml =
    '<section id="apply"><h2 class="section-title">' + esc(ap.title) + '</h2><p class="section-lead">' + esc(ap.lead) + "</p>" +
    '<div class="grid two"><form class="card form" id="applyForm" novalidate>' + map(ap.fields, fieldHtml) +
    '<div class="form-errors" id="formErrors" role="alert" hidden></div>' +
    '<button class="btn" type="submit">' + esc(ap.submitLabel) + "</button></form>" +
    '<div class="card" id="applyResult" aria-live="polite"></div></div></section>';

  var pollHtml =
    '<section id="poll"><h2 class="section-title">' + esc(po.title) + '</h2><p class="section-lead">' + esc(po.lead) + "</p>" +
    '<div class="grid two"><form class="card" id="pollForm"><fieldset class="poll-opts"><legend class="sr">' + esc(po.title) + "</legend>" +
    map(po.options, function (o, i) {
      return '<label class="opt"><input type="radio" name="topic" value="' + i + '"><span>' + esc(o) + "</span></label>";
    }) + '</fieldset><button class="btn" id="pollBtn" type="submit">투표하기</button><p class="muted" id="pollMsg" aria-live="polite"></p></form>' +
    '<div class="card"><h3 class="poll-h">투표 결과 <span class="live">● LIVE</span></h3><div id="pollBars">' +
    map(po.options, function (o) {
      return '<div class="bar-row"><div class="bar-label"><span>' + esc(o) + '</span><b>0표 · 0%</b></div><div class="track"><div class="fill" style="width:0"></div></div></div>';
    }) + '</div><p class="muted" id="pollTotal"></p></div></div></section>';

  var classHtml =
    '<section id="classroom"><h2 class="section-title">' + esc(cl.title) + '</h2><p class="section-lead">' + esc(cl.lead) + "</p>" +
    '<div id="classBody"></div></section>';

  var faqEl = document.getElementById("faq");
  faqEl.insertAdjacentHTML("beforebegin", applyHtml + pollHtml + classHtml);

  // 공용 요소 (토스트, 대화상자, 캔버스)
  var exts = (cl.upload.accept || []).map(function (x) { return "." + x; }).join(",");
  document.body.insertAdjacentHTML("beforeend",
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
    '<dialog class="dlg" id="loginDlg"><form id="loginForm" novalidate><h3>로그인</h3>' +
    '<p class="muted">학번과 이름으로 로그인합니다. 서버가 없는 사이트라 정보는 이 브라우저에만 저장됩니다.</p>' +
    '<div class="field"><label for="lg-id">학번</label><input id="lg-id" name="studentId" inputmode="numeric" autocomplete="off"></div>' +
    '<div class="field"><label for="lg-name">이름</label><input id="lg-name" name="name" autocomplete="off"></div>' +
    '<p class="err" id="loginErr"></p><div class="dlg-actions"><button type="button" class="chip-btn" data-close>취소</button>' +
    '<button class="btn sm" type="submit">로그인</button></div></form></dialog>' +
    '<dialog class="dlg popup" id="popupDlg"><div class="popup-emoji">🌸</div><h3>' + esc(C.popup.title) + "</h3>" +
    "<ul>" + map(C.popup.lines, function (l) { return "<li>" + esc(l) + "</li>"; }) + "</ul>" +
    '<div class="dlg-actions"><a class="btn sm" id="popupCta" href="#' + esc(C.popup.cta.target) + '">' + esc(C.popup.cta.label) + "</a></div>" +
    '<div class="popup-foot"><label><input type="checkbox" id="hideToday"> ' + esc(C.popup.hideLabel) + '</label>' +
    '<button type="button" class="chip-btn" data-close>' + esc(C.popup.closeLabel) + "</button></div></dialog>");

  var loginDlg = $("#loginDlg"), popupDlg = $("#popupDlg");
  [loginDlg, popupDlg].forEach(function (d) {
    d.addEventListener("click", function (ev) {
      if (ev.target === d || (ev.target.closest && ev.target.closest("[data-close]"))) d.close();
    });
  });

  // ---------- 헤더 로그인 버튼 ----------
  var authBtn = $("#authBtn");
  var renderAuth = function () {
    var s = getSession();
    authBtn.textContent = s ? s.name + "님 · 로그아웃" : "로그인";
  };
  var openLogin = function () {
    $("#loginErr").textContent = "";
    $("#loginForm").reset();
    loginDlg.showModal();
    $("#lg-id").focus();
  };
  var logout = function () { St.set("session", null); toast("로그아웃되었습니다."); };
  authBtn.addEventListener("click", function () { if (getSession()) logout(); else openLogin(); });

  $("#loginForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var id = $("#lg-id").value.trim(), name = $("#lg-name").value.trim(), err = $("#loginErr");
    var miss = [];
    if (!id) miss.push("학번");
    if (!name) miss.push("이름");
    if (miss.length) { err.textContent = "빠진 항목: " + miss.join(", "); return; }
    if (!/^[0-9]{6,10}$/.test(id)) { err.textContent = "학번은 숫자 6–10자리로 입력해 주세요."; return; }
    var roster = C.roster || {};
    if (roster.restrict && (roster.students || []).length &&
        !roster.students.some(function (r) { return String(r.studentId) === id && r.name === name; })) {
      err.textContent = "수강생 명단에 없는 학번·이름입니다. 담당 교수자에게 문의해 주세요.";
      return;
    }
    var people = St.get("people", {});
    people[id] = name;
    St.set("people", people);
    St.set("session", { studentId: id, name: name });
    loginDlg.close();
    toast(name + "님, 환영합니다 🌸");
  });

  // ---------- 회원 가입 ----------
  var form = $("#applyForm");
  var clearErrors = function () {
    form.querySelectorAll(".err").forEach(function (p) { p.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); });
    $("#formErrors").hidden = true;
  };
  var fieldEl = function (name) { return form.elements[name]; };

  var validate = function () {
    var vals = {}, missing = [], invalid = [];
    ap.fields.forEach(function (f) {
      var el = fieldEl(f.name), msg = "";
      var v = f.type === "checkbox" ? el.checked : f.type === "password" ? el.value : (el.value || "").trim(); // 비밀번호는 공백도 그대로 둡니다
      vals[f.name] = v;
      if (f.required && !v) {
        msg = f.type === "checkbox" ? "동의가 필요합니다." : f.type === "select" ? "선택해 주세요." : "입력해 주세요.";
        missing.push(f);
      } else if (v && f.pattern && !new RegExp(f.pattern).test(v)) {
        msg = f.hint || "형식을 확인해 주세요."; invalid.push(f);
      } else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        msg = "이메일 형식을 확인해 주세요."; invalid.push(f);
      } else if (v && f.minLength && v.length < f.minLength) {
        msg = f.hint || "너무 짧습니다."; invalid.push(f);
      } else if (v && f.matches && v !== fieldEl(f.matches).value) {
        msg = f.hint || "값이 서로 다릅니다."; invalid.push(f);
      }
      if (msg) {
        $("#err-" + f.name).textContent = msg;
        el.setAttribute("aria-invalid", "true");
      }
    });
    return { vals: vals, missing: missing, invalid: invalid };
  };
  var plainLabel = function (f) { return f.label.replace(/\s*\(선택\)/, ""); };

  var renderResult = function () {
    var box = $("#applyResult"), apps = St.get("applications", {});
    var s = getSession(), id = s ? s.studentId : St.get("lastApply", null), rec = id && apps[id];
    if (!rec) { box.innerHTML = '<h3>제출 현황</h3><p class="muted">' + esc(ap.emptyText) + "</p>"; return; }
    box.innerHTML = '<h3>' + esc(ap.successTitle) + "</h3>" +
      '<dl class="info-list" style="margin:0">' +
      '<div class="info-row"><dt>접수번호</dt><dd>' + esc(rec.no) + "</dd></div>" +
      '<div class="info-row"><dt>제출 시각</dt><dd>' + esc(fmtTime(rec.at)) + "</dd></div>" +
      map(ap.fields, function (f) {
        if (f.type === "textarea" || f.type === "checkbox" || !rec.values[f.name]) return "";
        return '<div class="info-row"><dt>' + esc(plainLabel(f)) + "</dt><dd>" + esc(rec.values[f.name]) + "</dd></div>";
      }) + '</dl><p class="note">같은 학번으로 다시 가입하면 내용이 갱신됩니다.</p>';
  };

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    clearErrors();
    var r = validate(), box = $("#formErrors");
    if (r.missing.length || r.invalid.length) {
      var h = "";
      if (r.missing.length) h += "<p><b>빠진 항목</b> " + r.missing.map(function (f) { return esc(plainLabel(f)); }).join(" · ") + "</p>";
      if (r.invalid.length) h += "<p><b>형식 확인</b> " + r.invalid.map(function (f) { return esc(plainLabel(f)); }).join(" · ") + "</p>";
      box.innerHTML = h;
      box.hidden = false;
      fieldEl((r.missing[0] || r.invalid[0]).name).focus();
      return;
    }
    var apps = St.get("applications", {}), now = Date.now();
    var prev = apps[r.vals.studentId];

    // 아이디는 한 사람만 쓸 수 있습니다 (같은 학번이 다시 가입하는 경우는 제외)
    if (r.vals.userId && Object.keys(apps).some(function (k) { return k !== r.vals.studentId && apps[k].values.userId === r.vals.userId; })) {
      $("#err-userId").textContent = "이미 사용 중인 아이디입니다.";
      fieldEl("userId").setAttribute("aria-invalid", "true");
      fieldEl("userId").focus();
      return;
    }

    // 비밀번호 원문은 저장하지 않고 salt를 섞은 해시만 보관합니다. (입력란 값은 기록에서 제외)
    var cred = null, pwField = ap.fields.filter(function (f) { return f.type === "password"; })[0];
    if (pwField) {
      if (typeof eduHash !== "function") { toast("비밀번호 처리 기능을 불러오지 못했습니다. 새로고침해 주세요."); return; }
      var salt = Math.random().toString(16).slice(2, 12) + now.toString(16);
      cred = { salt: salt, hash: eduHash(r.vals[pwField.name], salt) };
    }
    ap.fields.forEach(function (f) { if (f.type === "password") delete r.vals[f.name]; });

    apps[r.vals.studentId] = { no: prev ? prev.no : "A" + now.toString(36).toUpperCase(), at: now, values: r.vals, cred: cred };
    if (!St.set("applications", apps)) { toast("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); return; }
    ap.fields.forEach(function (f) { if (f.type === "password") fieldEl(f.name).value = ""; });
    St.set("lastApply", r.vals.studentId);
    renderResult();
    toast("회원 가입이 완료되었습니다.");
  });
  form.addEventListener("input", function (ev) {
    var f = ev.target.closest(".field");
    if (f) { f.querySelector(".err").textContent = ""; ev.target.removeAttribute("aria-invalid"); }
  });

  // 로그인하면 이름·학번 자동 입력
  var prefill = function () {
    var s = getSession();
    if (!s) return;
    if (fieldEl("name") && !fieldEl("name").value) fieldEl("name").value = s.name;
    if (fieldEl("studentId") && !fieldEl("studentId").value) fieldEl("studentId").value = s.studentId;
  };

  // ---------- 실시간 투표 ----------
  var pollForm = $("#pollForm");
  var updatePoll = function () {
    var votes = St.get("votes", {}), counts = po.options.map(function () { return 0; }), total = 0;
    Object.keys(votes).forEach(function (k) {
      var i = votes[k];
      if (counts[i] != null) { counts[i]++; total++; }
    });
    var max = Math.max.apply(null, counts), mine = votes[voterId()];
    var rows = document.querySelectorAll("#pollBars .bar-row");
    counts.forEach(function (c, i) {
      var pct = total ? Math.round(c / total * 100) : 0;
      rows[i].querySelector("b").textContent = c + "표 · " + pct + "%";
      rows[i].querySelector(".fill").style.width = pct + "%";
      rows[i].classList.toggle("top", max > 0 && c === max);
    });
    $("#pollTotal").textContent = "총 " + total + "명 참여";
    if (mine != null) {
      var radio = pollForm.querySelector('input[value="' + mine + '"]');
      if (radio) radio.checked = true;
    }
    $("#pollBtn").textContent = mine != null ? "투표 변경하기" : "투표하기";
  };
  pollForm.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pick = pollForm.querySelector('input[name="topic"]:checked'), msg = $("#pollMsg");
    if (!pick) { msg.textContent = "배우고 싶은 주제를 하나 선택해 주세요."; return; }
    var votes = St.get("votes", {});
    votes[voterId()] = +pick.value;
    if (!St.set("votes", votes)) { msg.textContent = "저장하지 못했습니다."; return; }
    msg.textContent = "투표가 반영되었습니다. 고맙습니다!";
  });
  St.on("votes", updatePoll);

  // ---------- 강의실: 출석 · 과제 ----------
  var tm = A.S.time.split(/[–-]/);
  var toMin = function (s) { var p = s.trim().split(":"); return +p[0] * 60 + +p[1]; };
  var classRange = function (w) {
    var base = new Date(w.date.getFullYear(), w.date.getMonth(), w.date.getDate()).getTime();
    return { start: base + toMin(tm[0]) * 60000, end: base + toMin(tm[1]) * 60000 };
  };
  var STATUS = { present: "출석", late: "지각", absent: "결석", upcoming: "예정" };
  var att = cl.attendance;

  var attStatus = function (rec, w, now) {
    if (rec) return rec.status;
    return now > classRange(w).end ? "absent" : "upcoming";
  };
  var canCheck = function (w, now) {
    if (!att.enforceTime) return true;
    var r = classRange(w);
    return now >= r.start - att.beforeMin * 60000 && now <= r.end;
  };

  var classBody = $("#classBody");
  var renderClass = function () {
    var s = getSession();
    if (!s) {
      classBody.innerHTML = '<div class="card login-need"><p>출석 체크와 과제 제출은 로그인 후 이용할 수 있습니다.</p>' +
        '<button type="button" class="btn" data-act="login">로그인</button></div>';
      return;
    }
    var now = Date.now(), myAtt = (St.get("attendance", {}))[s.studentId] || {};
    var mySub = (St.get("submissions", {}))[s.studentId] || {};

    var attRows = map(weeks, function (w) {
      var rec = myAtt[w.n], st = attStatus(rec, w, now), isToday = A.dkey(w.date) === todayKey;
      var btn = !rec && canCheck(w, now) ? '<button type="button" class="chip-btn" data-att="' + w.n + '">출석 체크</button>' : "";
      return '<li class="att-row' + (isToday ? " today" : "") + '"><span class="wk-no">' + w.n + '주차</span><span class="att-date">' + esc(A.fmtShort(w.date)) +
        '</span><span class="att-status st-' + st + '">' + STATUS[st] + (rec ? " · " + esc(fmtTime(rec.at)) : "") + "</span>" + btn + "</li>";
    });
    var asgs = weeks.filter(function (w) { return w.u.assignment; }).map(function (w) {
      var sub = mySub[w.n], closed = w.due.getTime() <= now, as = w.u.assignment;
      return '<article class="asg" id="asg-' + w.n + '"><h4>' + w.n + "주차 · " + esc(as.title) + "</h4>" +
        '<p class="muted">마감 ' + esc(A.fmtDue(w.due)) + ' <b class="countdown" data-due="' + w.due.getTime() + '"></b></p>' +
        (sub ? '<p class="sub-ok">✔ 제출 완료 · ' + esc(sub.name) + " (" + fmtSize(sub.size) + ") · " + esc(fmtTime(sub.at)) +
          ' <button type="button" class="link-btn" data-dl="' + w.n + '">내려받기</button></p>' : '<p class="sub-none">아직 제출하지 않았습니다.</p>') +
        (closed ? '<p class="muted">제출이 마감되었습니다.</p>'
          : '<div class="upload"><input type="file" accept="' + esc(exts) + '" aria-label="' + w.n + '주차 과제 파일">' +
            '<button type="button" class="btn sm" data-sub="' + w.n + '">' + (sub ? "다시 제출" : "제출") + "</button></div>" +
            '<p class="msg" aria-live="polite"></p>') + "</article>";
    });

    classBody.innerHTML = '<div class="card who"><span><b>' + esc(s.name) + "</b>님 · 학번 " + esc(s.studentId) + '</span>' +
      '<button type="button" class="chip-btn" data-act="logout">로그아웃</button></div>' +
      '<div class="grid two"><div class="card"><h3>✅ 출석</h3><p class="muted">' +
      (att.enforceTime ? "수업 시작 " + att.beforeMin + "분 전부터 종료 시각까지 출석 체크가 열리고, 시작 " + att.lateAfterMin + "분 뒤부터는 지각으로 기록됩니다."
        : "시험 모드: 시간 제한 없이 출석 체크를 할 수 있습니다.") +
      '</p><ul class="att-list">' + attRows + '</ul></div><div class="card"><h3>📝 과제 제출</h3>' +
      (asgs.length ? asgs.join("") : '<p class="muted">제출할 과제가 없습니다.</p>') + "</div></div>";
    A.updateCountdowns();
  };

  var checkAttendance = function (n) {
    var s = getSession(), w = weeks[n - 1], now = Date.now();
    if (!s || !w || !canCheck(w, now)) { toast("지금은 출석 체크를 할 수 없습니다."); return; }
    var all = St.get("attendance", {}), mine = all[s.studentId] = all[s.studentId] || {};
    if (mine[n]) return;
    var late = att.enforceTime && now > classRange(w).start + att.lateAfterMin * 60000;
    mine[n] = { at: now, status: late ? "late" : "present" };
    St.set("attendance", all);
    toast(n + "주차 " + (late ? "지각" : "출석") + "으로 기록되었습니다.");
  };

  var submitFile = function (n, article) {
    var s = getSession(), w = weeks[n - 1], msg = $(".msg", article), input = $('input[type="file"]', article);
    var say = function (t, bad) { msg.textContent = t; msg.className = "msg" + (bad ? " bad" : ""); };
    if (!s) { say("로그인이 필요합니다.", true); return; }
    if (w.due.getTime() <= Date.now()) { say("제출이 마감되었습니다.", true); return; }
    var file = input.files && input.files[0];
    if (!file) { say("제출할 파일을 선택해 주세요.", true); return; }
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    if (cl.upload.accept.indexOf(ext) < 0) { say("허용된 파일 형식이 아닙니다. (" + cl.upload.accept.join(", ") + ")", true); return; }
    if (file.size > cl.upload.maxMB * 1048576) { say("파일 크기는 " + cl.upload.maxMB + "MB 이하여야 합니다.", true); return; }
    say("제출 중…");
    St.putFile(s.studentId + ":" + n, file).then(function () {
      var all = St.get("submissions", {}), mine = all[s.studentId] = all[s.studentId] || {};
      mine[n] = { name: file.name, size: file.size, at: Date.now() };
      St.set("submissions", all);
      toast(n + "주차 과제가 제출되었습니다.");
    }, function (e) {
      say("저장하지 못했습니다: " + (e && e.message ? e.message : "브라우저 저장 공간을 확인해 주세요."), true);
    });
  };

  var download = function (n) {
    var s = getSession(), sub = s && ((St.get("submissions", {}))[s.studentId] || {})[n];
    if (!sub) return;
    St.getFile(s.studentId + ":" + n).then(function (blob) {
      if (!blob) { toast("저장된 파일을 찾지 못했습니다."); return; }
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = sub.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }, function () { toast("파일을 불러오지 못했습니다."); });
  };

  classBody.addEventListener("click", function (ev) {
    var t = ev.target.closest("button");
    if (!t) return;
    if (t.dataset.act === "login") openLogin();
    else if (t.dataset.act === "logout") logout();
    else if (t.dataset.att) checkAttendance(+t.dataset.att);
    else if (t.dataset.sub) submitFile(+t.dataset.sub, t.closest(".asg"));
    else if (t.dataset.dl) download(+t.dataset.dl);
  });

  // 커리큘럼의 "제출하기" 버튼 → 강의실의 해당 과제로 이동 (로그인 전이면 로그인 창)
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("button.submit");
    if (!b || !b.dataset.week) return;
    scrollToId("classroom");
    if (!getSession()) { setTimeout(openLogin, 400); return; }
    setTimeout(function () {
      var a = document.getElementById("asg-" + b.dataset.week);
      if (a) { a.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" }); a.classList.add("flash"); setTimeout(function () { a.classList.remove("flash"); }, 1800); }
    }, 500);
  });

  ["session", "attendance", "submissions"].forEach(function (k) {
    St.on(k, function () { renderClass(); });
  });
  St.on("session", function () { renderAuth(); prefill(); updatePoll(); renderResult(); });
  St.on("applications", renderResult);

  // ---------- 폭죽 ----------
  var confetti = function () {
    if (reduceMotion) return;
    var cv = document.createElement("canvas");
    cv.className = "confetti";
    document.body.appendChild(cv);
    var ctx = cv.getContext("2d"), W, H;
    var size = function () { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
    size();
    var colors = ["#c98c85", "#e9d1c5", "#a86f72", "#f4c9c4", "#cfa99c", "#ffffff"], ps = [];
    for (var i = 0; i < 160; i++) {
      var side = i % 2 ? 1 : -1, ang = (side > 0 ? 180 - 20 - Math.random() * 40 : 20 + Math.random() * 40) * Math.PI / 180;
      var sp = 9 + Math.random() * 11;
      ps.push({
        x: side > 0 ? W + 5 : -5, y: H * (0.55 + Math.random() * 0.2),
        vx: Math.cos(ang) * sp, vy: -Math.sin(ang) * sp - 4,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: colors[Math.floor(Math.random() * colors.length)], petal: Math.random() < 0.4
      });
    }
    var t0 = null;
    var frame = function (t) {
      if (t0 === null) t0 = t;
      var el = t - t0;
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.max(0, el - 2200) / 1000);
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
        if (p.petal) { ctx.beginPath(); ctx.ellipse(0, 0, p.w, p.h * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (el < 3200) requestAnimationFrame(frame); else cv.remove();
    };
    requestAnimationFrame(frame);
  };

  // ---------- 첫 방문: 폭죽 + 팝업 ----------
  var forced = /[?&]welcome=1/.test(location.search);
  var viaQuiz = /[?&]quiz=\d/.test(location.search); // 퀴즈 QR로 들어온 학생에게는 폭죽·팝업을 띄우지 않습니다
  var firstVisit = !St.get("visited", false);
  if (firstVisit) St.set("visited", true);
  if (!viaQuiz && C.welcome && C.welcome.confetti && (firstVisit || forced)) setTimeout(confetti, 500);

  var hideKey = "popupHiddenOn";
  if (!viaQuiz && C.popup && C.popup.enabled && (forced || St.get(hideKey, "") !== todayKey)) {
    setTimeout(function () {
      if (loginDlg.open) return;
      popupDlg.showModal();
    }, C.popup.delayMs);
  }
  popupDlg.addEventListener("close", function () {
    if ($("#hideToday").checked) St.set(hideKey, todayKey);
  });
  $("#popupCta").addEventListener("click", function (ev) {
    ev.preventDefault();
    popupDlg.close();
    scrollToId(C.popup.cta.target);
  });

  // 관리자 화면에서 출석 현황을 계산할 때 같은 규칙을 쓰도록 공유
  A.attStatus = attStatus;
  A.attLabels = STATUS;

  // ---------- 초기 그리기 ----------
  renderAuth();
  renderResult();
  prefill();
  updatePoll();
  renderClass();
})();
