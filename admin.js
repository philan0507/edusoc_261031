/*
 * 관리자 모드 — 자물쇠 버튼 + 비밀번호로 열립니다.
 * 사이트 내용 편집 / 수강생 명단 / 공지 / 출석·과제·회원 가입 내역(CSV) / 설정 저장·불러오기 / 비밀번호 변경
 *
 * ※ 서버가 없는 정적 사이트이므로 이 잠금은 "실수 방지용 문"에 가깝습니다.
 *   파일을 직접 열어 볼 수 있는 사람까지 막지는 못합니다. (자세한 내용은 README.md)
 */
(function () {
  var C = window.SITE_CONFIG, A = window.EduApp, St = window.EduStore;
  if (!C || !A || !St || typeof eduHash !== "function") return;

  var esc = A.esc, map = A.map, weeks = A.weeks;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var stamp = function (ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  };
  var today = function () { return A.dkey(new Date()); };

  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  var toastTimer;
  var toast = function (msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2800);
  };

  C.roster = C.roster || { restrict: false, students: [] };
  C.notices = C.notices || [];

  // ================= 공지사항 (방문자에게 보이는 부분) =================
  var renderNotices = function () {
    var old = document.getElementById("notices");
    if (old) old.remove();
    var list = (C.notices || []).slice().sort(function (a, b) {
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    });
    if (!list.length) return;
    document.getElementById("about").insertAdjacentHTML("beforebegin",
      '<section id="notices"><h2 class="section-title">📢 공지사항</h2><div class="notice-list">' +
      map(list, function (n) {
        return '<article class="card notice' + (n.pinned ? " pinned" : "") + '"><div class="n-head">' +
          (n.pinned ? '<span class="chip">📌 고정</span>' : "") + "<h3>" + esc(n.title) + "</h3><time>" + esc(n.date) + "</time></div><p>" + esc(n.body) + "</p></article>";
      }) + "</div></section>");
  };
  renderNotices();

  // ================= 잠금 · 관리자 패널 뼈대 =================
  var TABS = [["site", "사이트 편집"], ["roster", "수강생 명단"], ["notices", "공지"], ["attendance", "출석"],
    ["submissions", "과제"], ["applications", "회원 가입"], ["settings", "설정·백업"]];

  document.body.insertAdjacentHTML("beforeend",
    '<dialog class="dlg" id="pwDlg"><form id="pwForm" novalidate><h3>🔒 관리자 로그인</h3>' +
    '<div class="field"><label for="pw-in">비밀번호</label><input id="pw-in" type="password" autocomplete="current-password"></div>' +
    '<p class="err" id="pwErr"></p><div class="dlg-actions"><button type="button" class="chip-btn" data-close>취소</button>' +
    '<button class="btn sm" type="submit">열기</button></div></form></dialog>' +
    '<div class="admin" id="admin" hidden role="dialog" aria-modal="true" aria-label="관리자 화면">' +
    '<div class="admin-bar"><b>관리자</b><span class="admin-note">이 브라우저에 저장된 데이터가 표시됩니다</span>' +
    '<span class="admin-bar-btns"><button type="button" class="chip-btn" id="adminLock">잠그고 나가기</button>' +
    '<button type="button" class="chip-btn" id="adminClose">닫기</button></span></div>' +
    '<nav class="admin-tabs" id="adminTabs">' + map(TABS, function (t) {
      return '<button type="button" data-tab="' + t[0] + '">' + t[1] + "</button>";
    }) + '</nav><div class="admin-body" id="adminBody"></div></div>');

  var pwDlg = $("#pwDlg"), panel = $("#admin"), body = $("#adminBody"), lockBtn = $("#lockBtn");
  pwDlg.addEventListener("click", function (ev) {
    if (ev.target === pwDlg || (ev.target.closest && ev.target.closest("[data-close]"))) pwDlg.close();
  });

  var unlocked = function () { return ss.get("eduAdmin") === "1"; };
  var renderLock = function () {
    lockBtn.textContent = unlocked() ? "🔓" : "🔒";
    lockBtn.setAttribute("aria-label", unlocked() ? "관리자 화면 열기" : "관리자 로그인");
    lockBtn.title = unlocked() ? "관리자 화면" : "관리자";
    window.dispatchEvent(new Event("edu-admin")); // 라이브 퀴즈 등이 교수자 화면을 켜고 끄도록 알립니다
  };

  var fails = 0, lockedUntil = 0;
  $("#pwForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var input = $("#pw-in"), err = $("#pwErr"), left = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (left > 0) { err.textContent = left + "초 뒤에 다시 시도해 주세요."; return; }
    if (!input.value) { err.textContent = "비밀번호를 입력해 주세요."; return; }
    var ok = eduHash(input.value, C.admin.salt) === C.admin.passwordHash;
    input.value = "";
    if (ok) {
      fails = 0; err.textContent = "";
      ss.set("eduAdmin", "1");
      pwDlg.close();
      renderLock();
      openAdmin("site");
    } else {
      fails++;
      if (fails >= 5) { fails = 0; lockedUntil = Date.now() + 30000; err.textContent = "5번 틀렸습니다. 30초 뒤에 다시 시도해 주세요."; }
      else err.textContent = "비밀번호가 맞지 않습니다. (" + fails + "/5)";
    }
  });
  lockBtn.addEventListener("click", function () {
    if (unlocked()) { openAdmin(ss.get("eduAdminTab") || "site"); return; }
    $("#pwErr").textContent = "";
    $("#pw-in").value = "";
    pwDlg.showModal();
    $("#pw-in").focus();
  });

  var curTab = "site";
  var openAdmin = function (tab) {
    panel.hidden = false;
    document.body.classList.add("no-scroll");
    ss.set("eduAdminOpen", "1");
    showTab(tab || curTab);
  };
  var closeAdmin = function () {
    panel.hidden = true;
    document.body.classList.remove("no-scroll");
    ss.del("eduAdminOpen");
  };
  $("#adminClose").addEventListener("click", closeAdmin);
  $("#adminLock").addEventListener("click", function () {
    ss.del("eduAdmin"); closeAdmin(); renderLock(); toast("관리자 화면을 잠갔습니다.");
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !panel.hidden) closeAdmin(); });
  $("#adminTabs").addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-tab]");
    if (b) showTab(b.dataset.tab);
  });

  // ================= 공용 도구 =================
  var getOv = function () { var o = St.get("configOverride", {}); return o && typeof o === "object" ? o : {}; };
  var setKey = function (key, val) {
    var ov = getOv();
    ov[key] = val;
    if (!St.set("configOverride", ov)) { toast("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); return false; }
    C[key] = val;
    return true;
  };
  var reloadTo = function (tab) { ss.set("eduAdminTab", tab); location.reload(); };

  var csvCell = function (v) {
    var s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // 엑셀 수식으로 실행되는 것을 막습니다
    return '"' + s.replace(/"/g, '""') + '"';
  };
  var toCsv = function (rows) { return rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"); };
  var saveBlob = function (blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
  var downloadCsv = function (name, rows) {
    // 맨 앞의 BOM(﻿) 덕분에 엑셀에서 한글이 깨지지 않고 열립니다.
    saveBlob(new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }), name + "_" + today() + ".csv");
  };

  var tableHtml = function (head, rows) {
    if (!rows.length) return '<p class="muted">표시할 내용이 없습니다.</p>';
    var cell = function (c) {
      if (c && typeof c === "object") return '<td class="' + esc(c.c || "") + '">' + (c.h != null ? c.h : esc(c.t)) + "</td>";
      return "<td>" + esc(c) + "</td>";
    };
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + map(head, function (h) { return "<th>" + esc(h) + "</th>"; }) +
      "</tr></thead><tbody>" + map(rows, function (r) { return "<tr>" + map(r, cell) + "</tr>"; }) + "</tbody></table></div>";
  };

  var nameOf = function (id) {
    var r = (C.roster.students || []).filter(function (x) { return String(x.studentId) === String(id); })[0];
    return r ? r.name : (St.get("people", {})[id] || "");
  };
  var allIds = function (extraObj) {
    var seen = {}, out = [];
    (C.roster.students || []).forEach(function (r) { var id = String(r.studentId); if (!seen[id]) { seen[id] = 1; out.push(id); } });
    Object.keys(extraObj || {}).forEach(function (id) { if (!seen[id]) { seen[id] = 1; out.push(id); } });
    return out;
  };

  // ================= 탭: 사이트 편집 (범용 편집기) =================
  var SECTIONS = [["meta", "사이트 기본 정보"], ["brand", "브랜드 문구"], ["nav", "상단 메뉴"], ["hero", "첫 화면"],
    ["overview", "강의 정보 카드"], ["stats", "통계 카드"], ["about", "프로그램 소개·슬라이드"], ["schedule", "수업 일정"],
    ["curriculum", "커리큘럼(주차별)"], ["enroll", "수강 안내"], ["prepare", "수강 준비"], ["faq", "FAQ"],
    ["instructor", "교수자"], ["popup", "안내 팝업"], ["apply", "회원 가입"], ["poll", "투표"],
    ["classroom", "강의실 설정"], ["quiz", "라이브 퀴즈 설정"], ["welcome", "환영 효과"], ["footer", "푸터"]];
  var KO = {
    title: "제목", description: "설명", lead: "소개글", text: "내용", label: "이름표", value: "값", icon: "아이콘", name: "이름",
    role: "직위", affiliation: "소속", photo: "사진 경로", bio: "소개글", areas: "전문 분야", contact: "연락처", href: "링크",
    q: "질문·문제", a: "답변", items: "항목", steps: "단계", note: "안내 문구", content: "학습 내용", videos: "참고 영상", url: "주소",
    desc: "설명", daysAfter: "수업일 며칠 뒤 마감", time: "시간", submitUrl: "외부 제출 링크(비우면 사이트 안에서 제출)",
    start: "첫 수업일(YYYY-MM-DD)", place: "장소", units: "주차 목록", slides: "슬라이드", badge: "배지", subtitle: "부제",
    primary: "주 버튼", secondary: "보조 버튼", target: "이동할 섹션 id", cta: "버튼", assignment: "과제", mark: "아이콘",
    calendarTitle: "달력 제목", calendarLead: "달력 설명", enabled: "사용", delayMs: "표시까지 지연(ms)", lines: "안내 문구(한 줄에 하나)",
    hideLabel: "‘오늘 하루 보지 않기’ 문구", closeLabel: "닫기 문구", fields: "입력 항목", type: "종류", required: "필수", options: "선택지",
    placeholder: "예시 글자", pattern: "형식(정규식)", hint: "형식 안내", submitLabel: "제출 버튼 문구", successTitle: "접수 완료 문구",
    emptyText: "비어 있을 때 문구", question: "질문", attendance: "출석 설정", upload: "파일 제출 설정", enforceTime: "수업 시간에만 출석 허용",
    beforeMin: "시작 몇 분 전부터", lateAfterMin: "몇 분 뒤부터 지각", maxMB: "최대 크기(MB)", accept: "허용 확장자", confetti: "폭죽 효과",
    suffix: "단위", id: "id", prefix: "앞글자", week: "주차", copy: "문구",
    peerPrefix: "방 이름 앞글자", publicUrl: "QR에 담을 사이트 주소", defaultTime: "기본 제한 시간(초)", maxPlayers: "최대 참가자 수",
    libs: "라이브러리 주소", ai: "AI 출제 설정", endpoint: "AI 요청 주소", model: "AI 모델", maxQuestions: "한 번에 만들 최대 문항 수",
    defaultSet: "기본 문제 세트", questions: "문제 목록", answer: "정답 번호(0부터)", explain: "해설", src: "파일 주소", integrity: "무결성 해시(바꾸면 비워 두세요)"
  };
  var L = function (k) { return KO[k] || k; };
  var labelFor = function (path, key) {
    if (path.length) return L(key);
    var s = SECTIONS.filter(function (x) { return x[0] === key; })[0];
    return s ? s[1] : L(key);
  };
  var TEMPL = { videos: { title: "", url: "" } };
  var isObj = function (v) { return v && typeof v === "object" && !Array.isArray(v); };
  var blank = function (v) {
    if (Array.isArray(v)) return [];
    if (isObj(v)) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = blank(v[k]); }); return o; }
    if (typeof v === "number") return 0;
    if (typeof v === "boolean") return false;
    return "";
  };
  var getAt = function (root, p) { var o = root; for (var i = 0; i < p.length; i++) o = o[p[i]]; return o; };
  var setAt = function (root, p, v) { getAt(root, p.slice(0, -1))[p[p.length - 1]] = v; };
  var P = function (p) { return esc(JSON.stringify(p)); };
  var titleOf = function (it) { return it.title || it.label || it.name || it.q || it.week || ""; };
  var newItem = function (arr, key) {
    if (!arr.length && TEMPL[key]) return blank(TEMPL[key]);
    var o = {};
    arr.forEach(function (it) {
      Object.keys(it).forEach(function (k) { if (!(k in o) && !isObj(it[k])) o[k] = blank(it[k]); });
    });
    return o;
  };

  var editor = function (val, path, key) {
    if (Array.isArray(val)) return arrayEditor(val, path, key);
    if (isObj(val)) {
      return '<fieldset class="ed-group"><legend>' + esc(labelFor(path, key)) + "</legend>" +
        map(Object.keys(val), function (k) { return editor(val[k], path.concat(k), k); }) + "</fieldset>";
    }
    var id = "ed" + Math.random().toString(36).slice(2, 8);
    if (typeof val === "boolean") {
      return '<div class="field check"><label><input type="checkbox" data-kind="bool" data-path="' + P(path) + '"' + (val ? " checked" : "") + "> " + esc(L(key)) + "</label></div>";
    }
    if (typeof val === "number") {
      return '<div class="field"><label for="' + id + '">' + esc(L(key)) + '</label><input id="' + id + '" type="number" data-kind="num" data-path="' + P(path) + '" value="' + esc(val) + '"></div>';
    }
    var s = String(val == null ? "" : val);
    if (s.length > 50 || s.indexOf("\n") >= 0) {
      return '<div class="field"><label for="' + id + '">' + esc(L(key)) + '</label><textarea id="' + id + '" rows="4" data-path="' + P(path) + '">' + esc(s) + "</textarea></div>";
    }
    return '<div class="field"><label for="' + id + '">' + esc(L(key)) + '</label><input id="' + id + '" type="text" data-path="' + P(path) + '" value="' + esc(s) + '"></div>';
  };

  var arrayEditor = function (arr, path, key) {
    var objects = arr.length && arr.every(isObj);
    if (!objects && !(arr.length === 0 && TEMPL[key])) {
      var id = "ed" + Math.random().toString(36).slice(2, 8);
      return '<div class="field"><label for="' + id + '">' + esc(L(key)) + ' <small>(한 줄에 하나씩)</small></label><textarea id="' + id + '" rows="' + Math.max(3, arr.length + 1) +
        '" data-kind="lines" data-path="' + P(path) + '">' + esc(arr.join("\n")) + "</textarea></div>";
    }
    var lab = labelFor(path, key);
    return '<div class="ed-list"><div class="ed-list-head"><b>' + esc(lab) + " (" + arr.length + ")</b></div>" +
      map(arr, function (it, i) {
        var ip = path.concat(i), t = titleOf(it);
        return '<div class="ed-item"><div class="ed-item-head"><span>#' + (i + 1) + (t ? " · " + esc(t) : "") + '</span><span class="ed-tools">' +
          '<button type="button" data-act="up" data-path="' + P(ip) + '" aria-label="위로">↑</button>' +
          '<button type="button" data-act="down" data-path="' + P(ip) + '" aria-label="아래로">↓</button>' +
          '<button type="button" data-act="del" data-path="' + P(ip) + '">삭제</button></span></div>' + itemBody(it, arr, ip) + "</div>";
      }) + '<button type="button" class="chip-btn" data-act="add" data-path="' + P(path) + '" data-key="' + esc(key) + '">＋ ' + esc(lab) + " 추가</button></div>";
  };

  var itemBody = function (it, siblings, ip) {
    var keys = [];
    siblings.forEach(function (s) { Object.keys(s).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
    return map(keys, function (k) {
      var kp = ip.concat(k);
      if (k in it) {
        if (isObj(it[k]) && siblings.some(function (s) { return !(k in s); })) {
          return '<div class="ed-opt">' + editor(it[k], kp, k) + '<button type="button" class="chip-btn" data-act="delobj" data-path="' + P(kp) + '">' + esc(L(k)) + " 삭제</button></div>";
        }
        return editor(it[k], kp, k);
      }
      var sample = siblings.filter(function (s) { return k in s; })[0][k];
      if (isObj(sample)) return '<button type="button" class="chip-btn" data-act="addobj" data-path="' + P(kp) + '">＋ ' + esc(L(k)) + " 추가</button>";
      return editor(blank(sample), kp, k);
    });
  };

  var ed = { key: ss.get("eduAdminSec") || "hero", draft: null };
  var loadDraft = function () { ed.draft = JSON.parse(JSON.stringify(C[ed.key] === undefined ? {} : C[ed.key])); };

  var renderSite = function () {
    if (!ed.draft) loadDraft();
    var ov = getOv();
    body.innerHTML = '<div class="card"><p class="muted">고칠 항목을 고르고 내용을 수정한 뒤 <b>저장</b>을 누르면 페이지가 새로고침되며 반영됩니다. ' +
      "이 수정본은 이 브라우저에만 저장되므로, 모든 방문자에게 적용하려면 [설정·백업] 탭에서 <b>config.js</b>를 내려받아 배포 파일을 교체하세요.</p>" +
      '<div class="field"><label for="secSel">고칠 항목</label><select id="secSel">' + map(SECTIONS, function (s) {
        return '<option value="' + s[0] + '"' + (s[0] === ed.key ? " selected" : "") + ">" + esc(s[1]) + (s[0] in ov ? " (수정됨)" : "") + "</option>";
      }) + '</select></div></div><div class="card" id="edBox">' + editor(ed.draft, [], ed.key) + "</div>" +
      '<div class="admin-actions"><button type="button" class="btn" data-act="saveSec">저장하고 적용</button>' +
      '<button type="button" class="chip-btn" data-act="resetSec">이 항목을 기본값으로 되돌리기</button></div>';
  };

  // ================= 탭: 수강생 명단 =================
  var renderRoster = function () {
    var r = C.roster;
    body.innerHTML = '<div class="card"><h3>수강생 명단 등록</h3>' +
      '<p class="muted">한 줄에 한 명씩 <b>학번, 이름</b> 형식으로 입력하세요. 엑셀에서 두 열을 복사해 붙여넣어도 됩니다.</p>' +
      '<div class="field"><textarea id="rosterPaste" rows="5" placeholder="2027000001, 홍길동&#10;2027000002, 김하늘"></textarea></div>' +
      '<p class="err" id="rosterErr"></p><button type="button" class="btn sm" data-act="rosterAdd">명단에 추가</button></div>' +
      '<div class="card"><div class="field check"><label><input type="checkbox" id="rosterRestrict"' + (r.restrict ? " checked" : "") +
      "> 명단에 있는 학번·이름만 로그인 허용</label></div>" +
      '<p class="muted">현재 ' + (r.students || []).length + "명" + (r.restrict && !(r.students || []).length ? " — 명단이 비어 있어 제한이 적용되지 않습니다." : "") + "</p>" +
      tableHtml(["학번", "이름", ""], (r.students || []).map(function (s) {
        return [String(s.studentId), s.name, { h: '<button type="button" class="chip-btn" data-act="rosterDel" data-id="' + esc(s.studentId) + '">삭제</button>' }];
      })) + '<div class="admin-actions"><button type="button" class="chip-btn" data-act="rosterCsv">명단 CSV 내려받기</button>' +
      '<button type="button" class="chip-btn" data-act="rosterClear">명단 전체 삭제</button></div>' +
      '<p class="note">※ 명단은 이 브라우저에 저장됩니다. 모든 수강생에게 적용하려면 [설정·백업]에서 config.js를 내려받아 배포 파일을 교체하세요.</p></div>';
  };
  var saveRoster = function (r) { if (setKey("roster", r)) renderRoster(); };

  // ================= 탭: 공지 =================
  var renderNoticesTab = function () {
    var list = C.notices || [];
    body.innerHTML = '<div class="card"><h3>공지 올리기</h3>' +
      '<div class="field"><label for="nTitle">제목</label><input id="nTitle" type="text"></div>' +
      '<div class="field"><label for="nBody">내용</label><textarea id="nBody" rows="4"></textarea></div>' +
      '<div class="field"><label for="nDate">날짜</label><input id="nDate" type="text" value="' + today() + '"></div>' +
      '<div class="field check"><label><input type="checkbox" id="nPin"> 맨 위에 고정</label></div>' +
      '<p class="err" id="nErr"></p><button type="button" class="btn sm" data-act="noticeAdd">공지 등록</button></div>' +
      '<div class="card"><h3>등록된 공지 (' + list.length + ")</h3>" + (list.length ? map(list, function (n) {
        return '<div class="ed-item"><div class="ed-item-head"><span>' + (n.pinned ? "📌 " : "") + esc(n.title) + " · " + esc(n.date) + '</span><span class="ed-tools">' +
          '<button type="button" data-act="noticePin" data-id="' + esc(n.id) + '">' + (n.pinned ? "고정 해제" : "고정") + "</button>" +
          '<button type="button" data-act="noticeDel" data-id="' + esc(n.id) + '">삭제</button></span></div><p class="muted" style="white-space:pre-line;margin:0">' + esc(n.body) + "</p></div>";
      }) : '<p class="muted">등록된 공지가 없습니다.</p>') +
      '<p class="note">※ 공지는 이 브라우저에 저장됩니다. 모든 방문자에게 보이려면 [설정·백업]에서 config.js를 내려받아 배포 파일을 교체하세요.</p></div>';
  };
  var saveNotices = function (list) {
    if (setKey("notices", list)) { renderNotices(); renderNoticesTab(); }
  };

  // ================= 탭: 출석 =================
  var renderAttendance = function () {
    var att = St.get("attendance", {}), ids = allIds(att), now = Date.now();
    var SYM = { present: "○", late: "△", absent: "✕", upcoming: "·" };
    var rows = ids.map(function (id) {
      var mine = att[id] || {}, cnt = { present: 0, late: 0, absent: 0 };
      var cells = weeks.map(function (w) {
        var st = A.attStatus(mine[w.n], w, now);
        if (cnt[st] != null) cnt[st]++;
        return { t: SYM[st], c: "st-" + st };
      });
      return { id: id, cells: cells, cnt: cnt };
    });
    body.innerHTML = '<div class="card"><h3>출석 현황</h3><p class="muted">○ 출석 · △ 지각 · ✕ 결석 · · 예정 (명단 ' + (C.roster.students || []).length + "명 + 출석 기록이 있는 학생)</p>" +
      tableHtml(["학번", "이름"].concat(weeks.map(function (w) { return w.n; }), ["출석", "지각", "결석"]), rows.map(function (r) {
        return [r.id, nameOf(r.id)].concat(r.cells, [String(r.cnt.present), String(r.cnt.late), String(r.cnt.absent)]);
      })) + '<div class="admin-actions"><button type="button" class="btn sm" data-act="attCsv">엑셀(CSV)로 내려받기</button></div></div>';
  };
  var attCsv = function () {
    var att = St.get("attendance", {}), now = Date.now();
    var head = ["학번", "이름"].concat(weeks.map(function (w) { return w.n + "주차(" + A.fmtShort(w.date) + ")"; }), ["출석", "지각", "결석"]);
    var rows = [head];
    allIds(att).forEach(function (id) {
      var mine = att[id] || {}, cnt = { present: 0, late: 0, absent: 0 };
      var cells = weeks.map(function (w) {
        var st = A.attStatus(mine[w.n], w, now);
        if (cnt[st] != null) cnt[st]++;
        return A.attLabels[st] + (mine[w.n] ? " " + stamp(mine[w.n].at).slice(5, 16) : "");
      });
      rows.push([id, nameOf(id)].concat(cells, [cnt.present, cnt.late, cnt.absent]));
    });
    downloadCsv("출석현황", rows);
  };

  // ================= 탭: 과제 =================
  var subRows = function () {
    var subs = St.get("submissions", {}), out = [];
    Object.keys(subs).forEach(function (id) {
      Object.keys(subs[id]).forEach(function (n) { out.push({ id: id, n: +n, s: subs[id][n] }); });
    });
    out.sort(function (a, b) { return a.n - b.n || (a.id < b.id ? -1 : 1); });
    return out;
  };
  var renderSubmissions = function () {
    var rows = subRows(), total = (C.roster.students || []).length;
    var summary = weeks.filter(function (w) { return w.u.assignment; }).map(function (w) {
      var c = rows.filter(function (r) { return r.n === w.n; }).length;
      return [w.n + "주차", w.u.assignment.title, A.fmtDue(w.due), c + "명" + (total ? " / " + total + "명" : "")];
    });
    body.innerHTML = '<div class="card"><h3>과제별 제출 현황</h3>' + tableHtml(["주차", "과제", "마감", "제출"], summary) + "</div>" +
      '<div class="card"><h3>제출 내역</h3>' + tableHtml(["학번", "이름", "주차", "과제", "파일", "크기", "제출 시각", ""], rows.map(function (r) {
        var w = weeks[r.n - 1];
        return [r.id, nameOf(r.id), r.n + "주차", w && w.u.assignment ? w.u.assignment.title : "", r.s.name, Math.max(1, Math.round(r.s.size / 1024)) + "KB", stamp(r.s.at),
          { h: '<button type="button" class="chip-btn" data-act="subDl" data-id="' + esc(r.id) + '" data-n="' + r.n + '">내려받기</button>' }];
      })) + '<div class="admin-actions"><button type="button" class="btn sm" data-act="subCsv">엑셀(CSV)로 내려받기</button></div>' +
      '<p class="note">CSV에는 제출 목록만 담기며, 파일은 위의 [내려받기]로 하나씩 받습니다.</p></div>';
  };
  var subCsv = function () {
    var rows = [["학번", "이름", "주차", "과제", "파일명", "크기(KB)", "제출 시각"]];
    subRows().forEach(function (r) {
      var w = weeks[r.n - 1];
      rows.push([r.id, nameOf(r.id), r.n + "주차", w && w.u.assignment ? w.u.assignment.title : "", r.s.name, Math.max(1, Math.round(r.s.size / 1024)), stamp(r.s.at)]);
    });
    downloadCsv("과제제출내역", rows);
  };

  // ================= 탭: 회원 가입 =================
  var appRecs = function () {
    var apps = St.get("applications", {});
    return Object.keys(apps).map(function (k) { return apps[k]; }).sort(function (a, b) { return a.at - b.at; });
  };
  // 비밀번호 입력란은 화면·CSV에 나오지 않습니다 (해시만 저장되어 있습니다)
  var appFields = function () { return C.apply.fields.filter(function (f) { return f.type !== "password"; }); };
  var appHead = function () { return ["접수번호", "제출 시각"].concat(appFields().map(function (f) { return f.label.replace(/\s*\(선택\)/, ""); })); };
  var appRow = function (rec) {
    return [rec.no, stamp(rec.at)].concat(appFields().map(function (f) {
      var v = rec.values[f.name];
      return f.type === "checkbox" ? (v ? "동의" : "") : v;
    }));
  };
  var renderApplications = function () {
    var recs = appRecs();
    body.innerHTML = '<div class="card"><h3>회원 가입 내역 (' + recs.length + "건)</h3>" + tableHtml(appHead(), recs.map(appRow)) +
      '<div class="admin-actions"><button type="button" class="btn sm" data-act="appCsv">엑셀(CSV)로 내려받기</button></div></div>';
  };

  // ================= 탭: 설정·백업 =================
  var renderSettings = function () {
    var n = Object.keys(getOv()).length;
    body.innerHTML = '<div class="card"><h3>설정 저장 · 불러오기</h3>' +
      '<p class="muted">화면에서 고친 내용(수정본 ' + n + "개 항목, 명단·공지 포함)을 파일로 저장했다가 다른 브라우저나 나중에 다시 불러올 수 있습니다.</p>" +
      '<div class="admin-actions"><button type="button" class="btn sm" data-act="exportCfg">설정 파일로 저장 (.json)</button></div>' +
      '<div class="field" style="margin-top:14px"><label for="importFile">저장해 둔 설정 파일 불러오기</label><input id="importFile" type="file" accept=".json,application/json"></div>' +
      '<button type="button" class="chip-btn" data-act="importCfg">불러와서 적용</button></div>' +
      '<div class="card"><h3>배포용 config.js 만들기</h3>' +
      '<p class="muted">지금 적용된 모든 내용(수정본 포함)을 config.js 한 파일로 내려받습니다. 이 파일로 기존 config.js를 교체해 배포하면 모든 방문자에게 반영됩니다.</p>' +
      '<button type="button" class="btn sm" data-act="exportJs">config.js 내려받기</button></div>' +
      '<div class="card"><h3>관리자 비밀번호 변경</h3>' +
      '<div class="field"><label for="pwCur">현재 비밀번호</label><input id="pwCur" type="password" autocomplete="current-password"></div>' +
      '<div class="field"><label for="pwNew">새 비밀번호 (8자 이상)</label><input id="pwNew" type="password" autocomplete="new-password"></div>' +
      '<div class="field"><label for="pwNew2">새 비밀번호 확인</label><input id="pwNew2" type="password" autocomplete="new-password"></div>' +
      '<p class="err" id="pwChgErr"></p><button type="button" class="btn sm" data-act="pwChange">비밀번호 변경</button>' +
      '<p class="note">변경한 비밀번호도 이 브라우저의 수정본에 저장됩니다. 배포하려면 config.js를 내려받아 교체하세요.</p></div>' +
      '<div class="card"><h3>되돌리기</h3><p class="muted">화면에서 고친 모든 수정본(명단·공지 포함)을 지우고 config.js 원래 내용으로 돌아갑니다. 투표·회원 가입·출석·제출 기록은 지워지지 않습니다.</p>' +
      '<button type="button" class="chip-btn danger" data-act="resetAll">모든 수정본 지우기</button></div>';
  };

  var randomHex = function (n) {
    var out = "", i;
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(n); crypto.getRandomValues(a);
      for (i = 0; i < n; i++) out += ("0" + a[i].toString(16)).slice(-2);
      return out.slice(0, n);
    }
    for (i = 0; i < n; i++) out += Math.floor(Math.random() * 16).toString(16);
    return out;
  };

  // ================= 탭 전환 =================
  var RENDER = { site: renderSite, roster: renderRoster, notices: renderNoticesTab, attendance: renderAttendance,
    submissions: renderSubmissions, applications: renderApplications, settings: renderSettings };
  function showTab(tab) {
    if (!RENDER[tab]) tab = "site";
    curTab = tab;
    ss.set("eduAdminTab", tab);
    document.querySelectorAll("#adminTabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === tab); });
    RENDER[tab]();
    panel.scrollTop = 0;
  }

  // ================= 이벤트 =================
  body.addEventListener("input", function (ev) {
    var t = ev.target;
    if (!t.dataset || !t.dataset.path) return;
    var p = JSON.parse(t.dataset.path), kind = t.dataset.kind, v;
    if (kind === "bool") v = t.checked;
    else if (kind === "num") v = t.value === "" ? 0 : +t.value;
    else if (kind === "lines") v = t.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    else v = t.value;
    if (p.length) setAt(ed.draft, p, v); else ed.draft = v;
  });
  body.addEventListener("change", function (ev) {
    var t = ev.target;
    if (t.id === "secSel") { ed.key = t.value; ss.set("eduAdminSec", ed.key); loadDraft(); renderSite(); return; }
    if (t.id === "rosterRestrict") { var r = C.roster; saveRoster({ restrict: t.checked, students: r.students || [] }); return; }
    if (t.dataset && t.dataset.path && t.dataset.kind === "bool") {
      setAt(ed.draft, JSON.parse(t.dataset.path), t.checked);
    }
  });

  var rerenderSite = function () {
    var top = panel.scrollTop;
    renderSite();
    panel.scrollTop = top;
  };

  body.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-act]");
    if (!b) return;
    var act = b.dataset.act, p = b.dataset.path ? JSON.parse(b.dataset.path) : null, id = b.dataset.id;

    // --- 사이트 편집 ---
    if (act === "add") {
      var arr = p.length ? getAt(ed.draft, p) : ed.draft;
      arr.push(newItem(arr, b.dataset.key));
      rerenderSite();
    } else if (act === "del") {
      if (!window.confirm("이 항목을 삭제할까요?")) return;
      getAt(ed.draft, p.slice(0, -1)).splice(p[p.length - 1], 1);
      rerenderSite();
    } else if (act === "up" || act === "down") {
      var list = getAt(ed.draft, p.slice(0, -1)), i = p[p.length - 1], j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= list.length) return;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
      rerenderSite();
    } else if (act === "addobj") {
      var parent = getAt(ed.draft, p.slice(0, -2)), key = p[p.length - 1];
      var sample = parent.filter(function (s) { return key in s; })[0][key];
      setAt(ed.draft, p, blank(sample));
      rerenderSite();
    } else if (act === "delobj") {
      delete getAt(ed.draft, p.slice(0, -1))[p[p.length - 1]];
      rerenderSite();
    } else if (act === "saveSec") {
      if (setKey(ed.key, ed.draft)) reloadTo("site");
    } else if (act === "resetSec") {
      if (!window.confirm("이 항목의 수정본을 지우고 config.js의 기본값으로 되돌릴까요?")) return;
      var ov = getOv(); delete ov[ed.key]; St.set("configOverride", ov); reloadTo("site");

    // --- 명단 ---
    } else if (act === "rosterAdd") {
      var lines = $("#rosterPaste").value.split(/\r?\n/), bad = [], map2 = {}, order = [];
      (C.roster.students || []).forEach(function (s) { map2[String(s.studentId)] = s.name; order.push(String(s.studentId)); });
      lines.forEach(function (ln, k) {
        if (!ln.trim()) return;
        var parts = ln.split(/[\t,]+/).map(function (x) { return x.trim(); }).filter(Boolean);
        if (parts.length < 2 || !/^[0-9]{6,10}$/.test(parts[0])) { if (!(k === 0 && parts.length >= 2)) bad.push(k + 1); return; }
        if (!(parts[0] in map2)) order.push(parts[0]);
        map2[parts[0]] = parts[1];
      });
      $("#rosterErr").textContent = bad.length ? bad.join(", ") + "번째 줄은 ‘학번(숫자 6–10자리), 이름’ 형식이 아니라서 건너뛰었습니다." : "";
      var next = order.map(function (sid) { return { studentId: sid, name: map2[sid] }; });
      if (setKey("roster", { restrict: C.roster.restrict, students: next })) {
        var msg = bad.length ? $("#rosterErr").textContent : "";
        renderRoster();
        $("#rosterErr").textContent = msg;
        toast("명단을 저장했습니다. (" + next.length + "명)");
      }
    } else if (act === "rosterDel") {
      saveRoster({ restrict: C.roster.restrict, students: C.roster.students.filter(function (s) { return String(s.studentId) !== id; }) });
    } else if (act === "rosterClear") {
      if (window.confirm("명단을 모두 삭제할까요?")) saveRoster({ restrict: C.roster.restrict, students: [] });
    } else if (act === "rosterCsv") {
      downloadCsv("수강생명단", [["학번", "이름"]].concat((C.roster.students || []).map(function (s) { return [s.studentId, s.name]; })));

    // --- 공지 ---
    } else if (act === "noticeAdd") {
      var title = $("#nTitle").value.trim(), nb = $("#nBody").value.trim(), date = $("#nDate").value.trim() || today();
      var miss = [];
      if (!title) miss.push("제목");
      if (!nb) miss.push("내용");
      if (miss.length) { $("#nErr").textContent = "빠진 항목: " + miss.join(", "); return; }
      var cur = (C.notices || []).slice();
      cur.push({ id: "n" + Date.now().toString(36), title: title, body: nb, date: date, pinned: $("#nPin").checked });
      saveNotices(cur);
      toast("공지를 등록했습니다.");
    } else if (act === "noticeDel") {
      if (window.confirm("이 공지를 삭제할까요?")) saveNotices(C.notices.filter(function (n) { return n.id !== id; }));
    } else if (act === "noticePin") {
      saveNotices(C.notices.map(function (n) { if (n.id === id) { var c = {}; for (var k in n) c[k] = n[k]; c.pinned = !n.pinned; return c; } return n; }));

    // --- 기록 ---
    } else if (act === "attCsv") attCsv();
    else if (act === "subCsv") subCsv();
    else if (act === "appCsv") downloadCsv("회원가입내역", [appHead()].concat(appRecs().map(appRow)));
    else if (act === "subDl") {
      var sub = (St.get("submissions", {})[id] || {})[b.dataset.n];
      if (!sub) return;
      St.getFile(id + ":" + b.dataset.n).then(function (blob) {
        if (blob) saveBlob(blob, id + "_" + b.dataset.n + "주차_" + sub.name); else toast("저장된 파일을 찾지 못했습니다.");
      }, function () { toast("파일을 불러오지 못했습니다."); });

    // --- 설정 ---
    } else if (act === "exportCfg") {
      var payload = { app: "edu-sociology-site", version: 1, savedAt: new Date().toISOString(), override: getOv() };
      saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "edu-site-settings_" + today() + ".json");
    } else if (act === "importCfg") {
      var f = $("#importFile").files[0];
      if (!f) { toast("불러올 설정 파일을 선택해 주세요."); return; }
      var rd = new FileReader();
      rd.onload = function () {
        var data;
        try { data = JSON.parse(rd.result); } catch (e) { toast("설정 파일을 읽지 못했습니다. (JSON 형식이 아님)"); return; }
        if (!data || data.app !== "edu-sociology-site" || !isObj(data.override)) { toast("이 사이트에서 저장한 설정 파일이 아닙니다."); return; }
        if (!window.confirm("현재 수정본을 불러온 설정으로 덮어씁니다. 계속할까요?")) return;
        if (St.set("configOverride", data.override)) reloadTo("settings");
      };
      rd.readAsText(f);
    } else if (act === "exportJs") {
      var js = "/* 관리자 화면에서 내려받은 설정 (" + today() + ") — 기존 config.js를 이 파일로 교체하세요. */\nwindow.SITE_CONFIG = " +
        JSON.stringify(C, null, 2) + ";\n";
      saveBlob(new Blob([js], { type: "text/javascript;charset=utf-8" }), "config.js");
    } else if (act === "pwChange") {
      var err = $("#pwChgErr"), cur0 = $("#pwCur").value, n1 = $("#pwNew").value, n2 = $("#pwNew2").value;
      if (eduHash(cur0, C.admin.salt) !== C.admin.passwordHash) { err.textContent = "현재 비밀번호가 맞지 않습니다."; return; }
      if (n1.length < 8) { err.textContent = "새 비밀번호는 8자 이상이어야 합니다."; return; }
      if (n1 !== n2) { err.textContent = "새 비밀번호 확인이 일치하지 않습니다."; return; }
      var salt = randomHex(12);
      if (setKey("admin", { salt: salt, passwordHash: eduHash(n1, salt) })) { renderSettings(); toast("비밀번호를 변경했습니다."); }
    } else if (act === "resetAll") {
      if (window.confirm("모든 수정본(명단·공지·비밀번호 포함)을 지우고 config.js 원래 내용으로 되돌립니다. 계속할까요?")) {
        St.set("configOverride", {}); reloadTo("settings");
      }
    }
  });

  // 기록이 바뀌면(다른 탭에서 출석·제출 등) 열려 있는 기록 탭을 새로 그립니다.
  ["attendance", "submissions", "applications"].forEach(function (k) {
    St.on(k, function () { if (!panel.hidden && curTab === k) RENDER[k](); });
  });

  // 다른 모듈(quiz.js)이 쓰는 공용 도구
  A.isAdmin = unlocked;
  A.downloadCsv = downloadCsv;

  // ================= 시작 =================
  renderLock();
  if (unlocked() && ss.get("eduAdminOpen") === "1") openAdmin(ss.get("eduAdminTab") || "site");
})();
