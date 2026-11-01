/*
 * 라이브 퀴즈 — Kahoot·Socrative처럼 교수자가 문제를 내고 학생이 휴대폰으로 실시간 응답합니다.
 *  - 연결: PeerJS(WebRTC). 별도 서버 없이 교수자 브라우저가 "방"이 되고 학생이 직접 접속합니다.
 *  - 입장: 교수자 화면의 QR(또는 PIN 6자리)
 *  - AI 출제: 교수자가 본인의 API 키로 문제를 생성하거나, 프롬프트를 복사해 다른 AI에 붙여넣어 가져옵니다.
 *  - 결과: 학생별·문항별 CSV(엑셀)로 내려받기
 * 교수자 화면은 관리자 로그인(🔓) 후에만 열립니다.
 */
(function () {
  var C = window.SITE_CONFIG, A = window.EduApp, St = window.EduStore;
  if (!C || !A || !St || !C.quiz) return;

  var Q = C.quiz, esc = A.esc, map = A.map;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var SHAPES = ["▲", "◆", "●", "■"];
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var isAdmin = function () { return typeof A.isAdmin === "function" && A.isAdmin(); };
  var session = function () { return St.get("session", null); };

  // ================= 섹션 뼈대 =================
  document.getElementById("classroom").insertAdjacentHTML("afterend",
    '<section id="quiz"><h2 class="section-title">' + esc(Q.title) + '</h2><p class="section-lead">' + esc(Q.lead) + "</p>" +
    '<div class="card qz-card" id="qzStudent"></div><div class="card qz-card" id="qzHost"></div></section>');
  var studentEl = $("#qzStudent"), hostEl = $("#qzHost");

  // ================= 라이브러리 지연 로딩 =================
  var libs = {};
  var loadLib = function (key) {
    if (libs[key]) return libs[key];
    var L = Q.libs[key];
    libs[key] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = L.src;
      if (L.integrity) { s.integrity = L.integrity; s.crossOrigin = "anonymous"; }
      s.onload = resolve;
      s.onerror = function () { libs[key] = null; reject(new Error("필요한 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.")); };
      document.head.appendChild(s);
    });
    return libs[key];
  };

  var joinUrl = function (pin) {
    var base = Q.publicUrl || location.href.split("#")[0].split("?")[0];
    return base + "?quiz=" + pin + "#quiz";
  };

  // ================= 문제 세트 (교수자) =================
  var set = (function () {
    var s = St.get("quizSet", null);
    return s && Array.isArray(s.questions) ? s : clone(Q.defaultSet);
  })();
  var saveTimer;
  var saveSet = function () {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { St.set("quizSet", set); }, 300);
  };
  var padOptions = function (q) {
    q.options = (q.options || []).slice(0, 4);
    while (q.options.length < 4) q.options.push("");
    return q;
  };
  set.questions.forEach(padOptions);
  var blankQuestion = function () { return { q: "", options: ["", "", "", ""], answer: 0, time: Q.defaultTime, explain: "" }; };

  var buildPlay = function () {
    var errs = [], out = [];
    if (!set.questions.length) errs.push("문제를 1개 이상 추가하세요.");
    set.questions.forEach(function (q, i) {
      var text = (q.q || "").trim(), kept = [], ai = -1, k, o;
      for (k = 0; k < 4; k++) {
        o = ((q.options || [])[k] || "").trim();
        if (o) { if (k === q.answer) ai = kept.length; kept.push(o); }
      }
      if (!text) errs.push((i + 1) + "번: 문제를 입력하세요.");
      else if (kept.length < 2) errs.push((i + 1) + "번: 보기를 2개 이상 입력하세요.");
      else if (ai < 0) errs.push((i + 1) + "번: 정답으로 고른 보기가 비어 있습니다.");
      else out.push({ q: text, options: kept, answer: ai, time: q.time || Q.defaultTime, explain: (q.explain || "").trim() });
    });
    return { errs: errs, qs: out };
  };

  // ================= AI 출제 =================
  var aiKey = "";
  var aiPrompt = function (topic, n, level) {
    return "당신은 대학 교육사회학 수업의 퀴즈 출제자입니다. 아래 주제·자료를 바탕으로 4지선다 객관식 문제를 " + n + "문항 만들어 주세요.\n\n" +
      "[주제·자료]\n" + topic + "\n\n[난이도] " + level + "\n\n" +
      "조건:\n- 한국어로 작성하고, 모호하거나 정답이 둘 이상인 문항은 만들지 않습니다.\n- 정답 위치(0~3)를 골고루 분산합니다.\n" +
      "- 출력은 설명 없이 JSON 배열 하나만 내보냅니다.\n" +
      '- 형식: [{"q":"문제","options":["보기1","보기2","보기3","보기4"],"answer":0,"explain":"한 줄 해설"}]  (answer는 정답 보기의 번호, 0부터 시작)';
  };
  var parseQuestions = function (text) {
    var s = String(text || "").replace(/```(?:json)?/gi, ""), a = s.indexOf("["), b = s.lastIndexOf("]");
    if (a < 0 || b <= a) throw new Error("결과에서 문제 목록(JSON)을 찾지 못했습니다.");
    var arr = JSON.parse(s.slice(a, b + 1)), out = [];
    arr.forEach(function (r) {
      if (!r || typeof r.q !== "string" || !Array.isArray(r.options)) return;
      var opts = r.options.slice(0, 4).map(function (x) { return String(x); });
      var ans = typeof r.answer === "number" ? r.answer : "ABCD".indexOf(String(r.answer).toUpperCase());
      if (opts.length < 2 || !(ans >= 0 && ans < opts.length)) return;
      out.push(padOptions({ q: r.q, options: opts, answer: ans, time: Q.defaultTime, explain: r.explain ? String(r.explain) : "" }));
    });
    if (!out.length) throw new Error("사용할 수 있는 문항이 없습니다. 형식을 확인해 주세요.");
    return out;
  };
  var callAi = function (prompt) {
    var ai = Q.ai, headers = { "content-type": "application/json" }, isAnthropic = /api\.anthropic\.com/.test(ai.endpoint);
    if (isAnthropic && !aiKey) return Promise.reject(new Error("API 키를 입력해 주세요."));
    if (aiKey) {
      headers["x-api-key"] = aiKey;
      if (isAnthropic) {
        headers["anthropic-version"] = "2023-06-01";
        headers["anthropic-dangerous-direct-browser-access"] = "true"; // 브라우저에서 직접 호출하기 위한 표시
      }
    }
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 90000);
    return fetch(ai.endpoint, {
      method: "POST", headers: headers, signal: ctl ? ctl.signal : undefined,
      body: JSON.stringify({ model: ai.model, max_tokens: 4096, messages: [{ role: "user", content: prompt }] })
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error((d && d.error && d.error.message) || "AI 요청에 실패했습니다. (" + r.status + ")");
        return (d.content || []).map(function (c) { return c.text || ""; }).join("");
      });
    }).then(function (t) { clearTimeout(timer); return t; }, function (e) {
      clearTimeout(timer);
      throw e.name === "AbortError" ? new Error("응답이 너무 오래 걸려 중단했습니다.") : e;
    });
  };

  // ================= 교수자: 방 운영 =================
  var H = null; // 열려 있는 방
  var past = function () { return St.get("quizResults", []); };

  var qHtml = function (q, i) {
    return '<div class="qz-q" data-i="' + i + '"><div class="qz-q-head"><b>Q' + (i + 1) + '</b><span class="qz-q-tools">' +
      '<select data-f="time" aria-label="제한 시간">' + [10, 15, 20, 30, 45, 60].map(function (t) {
        return '<option value="' + t + '"' + (t === q.time ? " selected" : "") + ">" + t + "초</option>";
      }).join("") + "</select>" +
      '<button type="button" data-act="qUp" aria-label="위로">↑</button><button type="button" data-act="qDown" aria-label="아래로">↓</button>' +
      '<button type="button" data-act="qDel">삭제</button></span></div>' +
      '<textarea data-f="q" rows="2" placeholder="문제를 입력하세요">' + esc(q.q) + "</textarea>" +
      map(q.options, function (o, k) {
        return '<div class="qz-opt-edit"><label class="qz-radio" title="정답"><input type="radio" name="ans' + i + '" data-f="answer" value="' + k + '"' + (q.answer === k ? " checked" : "") +
          '><span class="shape s' + k + '">' + SHAPES[k] + '</span></label><input type="text" data-f="opt" data-k="' + k + '" value="' + esc(o) + '" placeholder="보기 ' + (k + 1) + '"></div>';
      }) + '<input type="text" data-f="explain" value="' + esc(q.explain || "") + '" placeholder="해설 (선택)"></div>';
  };

  var aiHtml = function () {
    return '<details class="qz-ai"><summary>🤖 AI로 문제 만들기</summary>' +
      '<div class="field"><label for="aiTopic">주제 또는 수업 내용</label><textarea id="aiTopic" rows="4" placeholder="예: 문화자본과 사회재생산 / 수업 자료의 문장을 붙여넣어도 됩니다."></textarea></div>' +
      '<div class="qz-row"><div class="field"><label for="aiN">문항 수</label><select id="aiN">' +
      [3, 5, 8, 10].filter(function (n) { return n <= Q.ai.maxQuestions; }).map(function (n) { return '<option value="' + n + '"' + (n === 5 ? " selected" : "") + ">" + n + "문항</option>"; }).join("") +
      '</select></div><div class="field"><label for="aiLevel">난이도</label><select id="aiLevel"><option>쉬움</option><option selected>보통</option><option>어려움</option></select></div></div>' +
      '<div class="field"><label for="aiKey">API 키</label><input id="aiKey" type="password" autocomplete="off" value="' + esc(aiKey) + '" placeholder="sk-ant-…">' +
      '<p class="muted small">키는 저장하지 않으며(새로고침·탭 닫기·잠금 시 사라짐) 입력한 AI 서비스로만 전송됩니다. 공용 PC에서는 사용 후 새로고침하세요. 키가 부담스럽다면 아래 ‘키 없이 쓰기’를 이용하세요.</p></div>' +
      '<button type="button" class="btn sm" data-act="aiGen">문제 생성</button><p class="qz-msg" id="aiMsg" aria-live="polite"></p>' +
      '<details class="qz-ai-manual"><summary>키 없이 쓰기 (복사·붙여넣기)</summary>' +
      '<p class="muted small">① 프롬프트를 복사해 ChatGPT·Claude 등 원하는 AI에 붙여넣고 ② 나온 JSON을 아래에 붙여넣어 가져옵니다.</p>' +
      '<button type="button" class="chip-btn" data-act="aiCopy">프롬프트 복사</button>' +
      '<div class="field" style="margin-top:10px"><textarea id="aiPaste" rows="4" placeholder="AI가 만든 JSON을 여기에 붙여넣기"></textarea></div>' +
      '<button type="button" class="chip-btn" data-act="aiImport">가져오기</button></details></details>';
  };

  var pastHtml = function () {
    var p = past();
    if (!p.length) return "";
    return '<div class="qz-past"><h4>지난 퀴즈 결과</h4>' + map(p, function (r, i) {
      return '<div class="qz-past-row"><span>' + esc(r.title) + " · " + esc(stamp(r.at)) + " · " + r.players.length + '명</span>' +
        '<span><button type="button" class="chip-btn" data-act="pastStu" data-i="' + i + '">학생별 CSV</button> ' +
        '<button type="button" class="chip-btn" data-act="pastQ" data-i="' + i + '">문항별 CSV</button></span></div>';
    }) + "</div>";
  };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var stamp = function (ts) {
    var d = new Date(ts);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };

  var ranking = function () {
    return Object.keys(H.players).map(function (k) { return H.players[k]; }).sort(function (a, b) {
      return b.score - a.score || b.correct - a.correct || (a.name < b.name ? -1 : 1);
    });
  };
  var active = function () { return ranking().filter(function (p) { return p.conn && p.conn.open; }); };
  var sendTo = function (p, msg) { try { if (p.conn && p.conn.open) p.conn.send(msg); } catch (e) {} };
  var sendAll = function (fn) { active().forEach(function (p) { sendTo(p, fn(p)); }); };

  var renderHost = function () {
    if (!isAdmin()) {
      hostEl.innerHTML = '<h3>교수자 진행</h3><p class="muted">퀴즈를 만들고 진행하려면 교수자 로그인이 필요합니다.</p>' +
        '<button type="button" class="chip-btn" data-act="unlock">🔒 교수자 로그인</button>';
      return;
    }
    if (!H) {
      hostEl.innerHTML = builderHtml();
      return;
    }
    hostEl.innerHTML = roomHtml();
    if (H.phase === "lobby") drawQr();
    updateLive();
  };

  var builderHtml = function () {
    return '<h3>교수자 진행</h3><p class="muted">문제를 만들고 방을 열면 학생이 QR·PIN으로 입장합니다. 문제는 이 브라우저에 자동 저장됩니다.</p>' +
      '<div class="field"><label for="qzTitle">퀴즈 제목</label><input id="qzTitle" type="text" value="' + esc(set.title) + '"></div>' +
      '<div id="qzQs">' + map(set.questions, qHtml) + "</div>" +
      '<div class="admin-actions"><button type="button" class="chip-btn" data-act="qAdd">＋ 문제 추가</button>' +
      '<button type="button" class="chip-btn" data-act="qReset">예시 문제로 되돌리기</button></div>' +
      aiHtml() + '<div class="qz-err" id="qzErr" role="alert" hidden></div>' +
      '<div class="admin-actions"><button type="button" class="btn" data-act="openRoom">방 열기</button></div>' + pastHtml();
  };

  var roomHtml = function () {
    var q = H.set[H.i], n = H.set.length, ph = H.phase, rk = ranking();
    var close = '<button type="button" class="chip-btn danger" data-act="closeRoom">방 닫기</button>';
    if (ph === "lobby") {
      return '<h3>' + esc(H.title) + '</h3><div class="qz-lobby"><div class="qz-join"><div class="qz-pin"><small>PIN</small><b>' + H.pin + '</b></div>' +
        '<div class="qz-qr" id="qzQr"></div></div><div class="qz-lobby-info"><p class="muted">학생은 휴대폰 카메라로 QR을 촬영하거나, 이 사이트의 ‘라이브 퀴즈’에서 PIN을 입력해 입장합니다.</p>' +
        (location.protocol === "file:" && !Q.publicUrl ? '<p class="qz-warn">지금은 파일(file://)로 열려 있어 학생이 QR로 들어올 수 없습니다. 배포한 주소에서 열어 주세요.</p>' : "") +
        '<p class="qz-link">' + esc(joinUrl(H.pin)) + '</p><p><b>참가자 <span id="qzCount">0</span>명</b></p><div class="qz-players" id="qzPlayers"></div>' +
        '<div class="admin-actions"><button type="button" class="btn" data-act="startGame">퀴즈 시작</button>' + close + "</div></div></div>";
    }
    if (ph === "q") {
      return '<div class="qz-top"><span class="chip">Q ' + (H.i + 1) + " / " + n + '</span><b class="qz-timer" id="qzTimer">' + q.time + '</b></div>' +
        '<div class="track"><div class="fill" id="qzBar" style="width:100%"></div></div><h3 class="qz-question">' + esc(q.q) + "</h3>" +
        '<div class="qz-opts">' + map(q.options, function (o, k) { return '<div class="qz-opt qo' + k + '"><span class="shape">' + SHAPES[k] + "</span>" + esc(o) + "</div>"; }) + "</div>" +
        '<p class="qz-answered">응답 <b id="qzAnswered">0</b> / ' + active().length + '명</p><div class="admin-actions"><button type="button" class="chip-btn" data-act="closeQ">지금 마감</button>' + close + "</div>";
    }
    if (ph === "reveal") {
      var counts = q.options.map(function () { return 0; }), ans = 0, right = 0;
      rk.forEach(function (p) { var a = p.ans[H.i]; if (a) { counts[a.c]++; ans++; if (a.ok) right++; } });
      var mx = Math.max.apply(null, counts.concat([1]));
      return '<div class="qz-top"><span class="chip">Q ' + (H.i + 1) + " / " + n + '</span><span class="muted">정답률 ' + (ans ? Math.round(right / ans * 100) : 0) + "% (" + right + "/" + ans + ')</span></div>' +
        '<h3 class="qz-question">' + esc(q.q) + '</h3><div class="qz-bars">' + map(q.options, function (o, k) {
          return '<div class="qz-bar qo' + k + (k === q.answer ? " right" : "") + '"><div class="qz-bar-label"><span class="shape">' + SHAPES[k] + "</span> " + esc(o) + (k === q.answer ? " ✔" : "") + "</div>" +
            '<div class="qz-bar-track"><div class="qz-bar-fill" style="width:' + Math.round(counts[k] / mx * 100) + '%"></div><b>' + counts[k] + "</b></div></div>";
        }) + "</div>" + (q.explain ? '<p class="qz-explain">💡 ' + esc(q.explain) + "</p>" : "") +
        '<div class="admin-actions"><button type="button" class="btn sm" data-act="showBoard">' + (H.i + 1 >= n ? "최종 결과 보기" : "순위 보기") + "</button>" + close + "</div>";
    }
    if (ph === "board") {
      return '<div class="qz-top"><span class="chip">Q ' + (H.i + 1) + " / " + n + '</span></div><h3>🏆 현재 순위</h3>' + boardHtml(rk.slice(0, 5)) +
        '<div class="admin-actions"><button type="button" class="btn" data-act="nextQ">다음 문제</button>' + close + "</div>";
    }
    return '<h3>🎉 퀴즈 종료 — ' + esc(H.title) + "</h3>" + podiumHtml(rk) + boardHtml(rk) +
      '<div class="admin-actions"><button type="button" class="btn sm" data-act="csvStu">학생별 결과 CSV</button><button type="button" class="btn sm" data-act="csvQ">문항별 통계 CSV</button>' + close + "</div>" +
      '<p class="note">결과는 이 브라우저에도 저장되어, 방을 닫은 뒤 ‘지난 퀴즈 결과’에서 다시 내려받을 수 있습니다.</p>';
  };
  var boardHtml = function (list) {
    if (!list.length) return '<p class="muted">참가자가 없습니다.</p>';
    return '<ol class="qz-board">' + map(list, function (p, i) {
      return "<li><span class=\"rk\">" + (i + 1) + "</span><span class=\"nm\">" + esc(p.name) + "</span><b>" + p.score + "점</b></li>";
    }) + "</ol>";
  };
  var podiumHtml = function (rk) {
    if (!rk.length) return "";
    var medals = ["🥇", "🥈", "🥉"];
    return '<div class="qz-podium">' + rk.slice(0, 3).map(function (p, i) {
      return '<div class="pd pd' + i + '"><div class="medal">' + medals[i] + "</div><b>" + esc(p.name) + "</b><span>" + p.score + "점</span></div>";
    }).join("") + "</div>";
  };

  var drawQr = function () {
    var box = $("#qzQr");
    if (!box) return;
    loadLib("qr").then(function () {
      var b2 = $("#qzQr");
      if (!b2 || !H) return;
      b2.innerHTML = "";
      new QRCode(b2, { text: joinUrl(H.pin), width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M });
    }, function () { box.textContent = "QR을 만들지 못했습니다. PIN을 알려 주세요."; });
  };

  var updateLive = function () {
    if (!H) return;
    if (H.phase === "lobby") {
      var rk = ranking().filter(function (p) { return p.conn && p.conn.open; });
      var c = $("#qzCount"), l = $("#qzPlayers");
      if (c) c.textContent = rk.length;
      if (l) l.innerHTML = rk.map(function (p) { return '<span class="chip">' + esc(p.name) + "</span>"; }).join("");
    } else if (H.phase === "q") {
      var act = active(), done = act.filter(function (p) { return p.ans[H.i]; }).length, el = $("#qzAnswered");
      if (el) el.textContent = done;
      if (act.length && done >= act.length) closeQuestion();
    }
  };

  var openRoom = function () {
    var plan = buildPlay(), err = $("#qzErr");
    if (plan.errs.length) {
      err.innerHTML = plan.errs.map(esc).join("<br>");
      err.hidden = false;
      return;
    }
    err.hidden = true;
    hostEl.innerHTML = '<h3>방을 여는 중…</h3><p class="muted">연결 서버에 접속하고 있습니다.</p>';
    St.set("quizSet", set);
    loadLib("peer").then(function () {
      var attempt = function (n) {
        var pin = String(Math.floor(100000 + Math.random() * 900000)), peer = new Peer(Q.peerPrefix + pin);
        return new Promise(function (resolve, reject) {
          var done = false;
          peer.on("open", function () { done = true; resolve({ peer: peer, pin: pin }); });
          peer.on("error", function (e) {
            if (done) return;
            peer.destroy();
            if (e.type === "unavailable-id" && n < 4) resolve(attempt(n + 1)); else reject(e);
          });
          setTimeout(function () { if (!done) { peer.destroy(); reject(new Error("연결 서버 응답이 없습니다.")); } }, 12000);
        });
      };
      return attempt(0);
    }).then(function (r) {
      H = { peer: r.peer, pin: r.pin, title: set.title, set: plan.qs, players: {}, phase: "lobby", i: -1, qStart: 0, endsAt: 0, time: 0, timer: null, saved: false };
      r.peer.on("connection", onConn);
      r.peer.on("disconnected", function () { try { r.peer.reconnect(); } catch (e) {} });
      r.peer.on("error", function () {});
      window.onbeforeunload = function () { return "퀴즈 방이 열려 있습니다."; };
      renderHost();
    }).catch(function (e) {
      H = null;
      renderHost();
      var box = $("#qzErr");
      if (box) { box.textContent = "방을 열지 못했습니다: " + (e && e.message ? e.message : e.type || "연결 오류") + " (학교 네트워크가 WebRTC를 막으면 연결되지 않을 수 있습니다.)"; box.hidden = false; }
    });
  };

  var onConn = function (conn) {
    conn.on("data", function (m) { onHostMsg(conn, m); });
    conn.on("close", function () { updateLive(); });
    conn.on("error", function () { updateLive(); });
  };

  var onHostMsg = function (conn, m) {
    if (!H || !m || typeof m !== "object") return;
    if (m.t === "join") {
      var name = String(m.name || "").trim().slice(0, 14);
      if (!name) { conn.send({ t: "err", msg: "닉네임을 입력해 주세요." }); return; }
      var existing = H.players[conn.peer];
      if (!existing && Object.keys(H.players).length >= Q.maxPlayers) { conn.send({ t: "err", msg: "참가 인원이 가득 찼습니다." }); return; }
      var base = name, k = 2;
      var taken = function (nm) { return Object.keys(H.players).some(function (id) { return id !== conn.peer && H.players[id].name === nm; }); };
      while (taken(name)) name = base + " (" + (k++) + ")";
      var p = existing || { id: conn.peer, score: 0, correct: 0, ans: {} };
      p.name = name; p.sid = String(m.sid || "").slice(0, 12); p.conn = conn;
      H.players[conn.peer] = p;
      sendTo(p, { t: "welcome", name: name, n: H.set.length, phase: H.phase });
      if (H.phase === "q") sendTo(p, qMsg(Math.max(0, H.endsAt - Date.now())));
      updateLive();
    } else if (m.t === "a") {
      var pl = H.players[conn.peer];
      if (!pl || H.phase !== "q" || m.i !== H.i || pl.ans[H.i]) return;
      var q = H.set[H.i], c = +m.c;
      if (!(c >= 0 && c < q.options.length)) return;
      var ms = Math.min(Math.max(0, Date.now() - H.qStart), q.time * 1000), ok = c === q.answer;
      var gain = ok ? Math.round(1000 * (1 - 0.5 * ms / (q.time * 1000))) : 0;
      pl.ans[H.i] = { c: c, ms: ms, ok: ok, gain: gain };
      pl.score += gain;
      if (ok) pl.correct++;
      sendTo(pl, { t: "ack", i: H.i });
      updateLive();
    }
  };

  var qMsg = function (leftMs) {
    var q = H.set[H.i];
    return { t: "q", i: H.i, n: H.set.length, text: q.q, opts: q.options, time: q.time, left: Math.round(leftMs / 100) / 10 };
  };

  var startGame = function () {
    if (!active().length) { toast("참가자가 입장한 뒤에 시작할 수 있습니다."); return; }
    nextQuestion();
  };
  var nextQuestion = function () {
    if (H.i + 1 >= H.set.length) { endGame(); return; }
    H.i++;
    var q = H.set[H.i];
    H.phase = "q"; H.time = q.time; H.qStart = Date.now(); H.endsAt = H.qStart + q.time * 1000;
    sendAll(function () { return qMsg(q.time * 1000); });
    clearInterval(H.timer);
    H.timer = setInterval(tick, 250);
    renderHost();
  };
  var tick = function () {
    if (!H || H.phase !== "q") return;
    var left = Math.max(0, H.endsAt - Date.now()), t = $("#qzTimer"), b = $("#qzBar");
    if (t) t.textContent = Math.ceil(left / 1000);
    if (b) b.style.width = (left / (H.time * 1000) * 100) + "%";
    if (left <= 0) closeQuestion();
  };
  var closeQuestion = function () {
    if (!H || H.phase !== "q") return;
    clearInterval(H.timer);
    H.phase = "reveal";
    var q = H.set[H.i], rk = ranking();
    rk.forEach(function (p, idx) {
      var a = p.ans[H.i];
      sendTo(p, { t: "result", i: H.i, answered: !!a, correct: !!(a && a.ok), choice: a ? a.c : -1, gain: a ? a.gain : 0, score: p.score, rank: idx + 1,
        answer: q.answer, answerText: q.options[q.answer], explain: q.explain, last: H.i + 1 >= H.set.length });
    });
    renderHost();
  };
  var showBoard = function () {
    if (H.i + 1 >= H.set.length) { endGame(); return; }
    H.phase = "board";
    var rk = ranking(), top = rk.slice(0, 5).map(function (p) { return { name: p.name, score: p.score }; });
    rk.forEach(function (p, idx) { sendTo(p, { t: "board", top: top, rank: idx + 1, score: p.score, total: rk.length }); });
    renderHost();
  };
  var endGame = function () {
    clearInterval(H.timer);
    H.phase = "end";
    var rk = ranking(), top = rk.slice(0, 5).map(function (p) { return { name: p.name, score: p.score }; });
    rk.forEach(function (p, idx) {
      sendTo(p, { t: "end", top: top, rank: idx + 1, score: p.score, correct: p.correct, n: H.set.length, total: rk.length });
    });
    saveResults();
    renderHost();
  };

  var snapshot = function () {
    return {
      at: Date.now(), title: H.title, qs: H.set.map(function (q) { return { q: q.q, options: q.options, answer: q.answer }; }),
      players: ranking().map(function (p) { return { name: p.name, sid: p.sid, score: p.score, correct: p.correct, ans: p.ans }; })
    };
  };
  var saveResults = function () {
    if (!H || H.saved || H.i < 0) return;
    H.saved = true;
    var list = past();
    list.unshift(snapshot());
    St.set("quizResults", list.slice(0, 5));
  };

  var closeRoom = function () {
    if (!H) return;
    saveResults();
    clearInterval(H.timer);
    sendAll(function () { return { t: "closed" }; });
    try { H.peer.destroy(); } catch (e) {}
    H = null;
    window.onbeforeunload = null;
    renderHost();
  };

  // ---- CSV ----
  var studentRows = function (res) {
    var head = ["순위", "닉네임", "학번", "총점", "정답 수", "정답률(%)"];
    res.qs.forEach(function (q, i) { var n = "Q" + (i + 1); head.push(n + " 선택", n + " 결과", n + " 시간(초)", n + " 점수"); });
    var rows = [head];
    res.players.forEach(function (p, idx) {
      var row = [idx + 1, p.name, p.sid, p.score, p.correct, res.qs.length ? Math.round(p.correct / res.qs.length * 100) : 0];
      res.qs.forEach(function (q, i) {
        var a = p.ans[i];
        row.push(a ? (a.c + 1) + "번" : "무응답", a ? (a.ok ? "정답" : "오답") : "무응답", a ? (a.ms / 1000).toFixed(1) : "", a ? a.gain : 0);
      });
      rows.push(row);
    });
    return rows;
  };
  var questionRows = function (res) {
    var rows = [["번호", "문제", "정답", "응답 수", "정답률(%)", "1번 선택", "2번 선택", "3번 선택", "4번 선택"]];
    res.qs.forEach(function (q, i) {
      var counts = [0, 0, 0, 0], ans = 0, ok = 0;
      res.players.forEach(function (p) { var a = p.ans[i]; if (a) { counts[a.c]++; ans++; if (a.ok) ok++; } });
      rows.push([i + 1, q.q, (q.answer + 1) + "번 " + q.options[q.answer], ans, ans ? Math.round(ok / ans * 100) : 0].concat(counts));
    });
    return rows;
  };
  var csv = function (name, rows) {
    if (typeof A.downloadCsv === "function") A.downloadCsv(name, rows); else toast("CSV 내려받기를 사용할 수 없습니다.");
  };

  // ---- 교수자 화면 이벤트 ----
  var toastTimer;
  var toast = function (msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2800);
  };

  hostEl.addEventListener("input", function (ev) {
    var t = ev.target, f = t.dataset && t.dataset.f;
    if (t.id === "qzTitle") { set.title = t.value; saveSet(); return; }
    if (t.id === "aiKey") { aiKey = t.value.trim(); return; }
    if (!f) return;
    var card = t.closest(".qz-q");
    if (!card) return;
    var q = set.questions[+card.dataset.i];
    if (f === "q") q.q = t.value;
    else if (f === "opt") q.options[+t.dataset.k] = t.value;
    else if (f === "explain") q.explain = t.value;
    saveSet();
  });
  hostEl.addEventListener("change", function (ev) {
    var t = ev.target, f = t.dataset && t.dataset.f, card = t.closest && t.closest(".qz-q");
    if (!f || !card) return;
    var q = set.questions[+card.dataset.i];
    if (f === "time") q.time = +t.value;
    else if (f === "answer") q.answer = +t.value;
    saveSet();
  });

  var aiMsg = function (t, bad) { var m = $("#aiMsg"); if (m) { m.textContent = t; m.className = "qz-msg" + (bad ? " bad" : ""); } };
  var addQuestions = function (qs) {
    set.questions = set.questions.concat(qs).slice(0, 40);
    St.set("quizSet", set);
    var open = $(".qz-ai") && $(".qz-ai").open;
    renderHost();
    if (open && $(".qz-ai")) $(".qz-ai").open = true;
    aiMsg(qs.length + "문항을 추가했습니다. 내용을 확인하고 필요하면 고쳐 주세요.");
  };

  hostEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-act]");
    if (!b) return;
    var act = b.dataset.act, card = b.closest(".qz-q"), i = card ? +card.dataset.i : -1;
    if (act === "unlock") { var lb = document.getElementById("lockBtn"); if (lb) lb.click(); }
    else if (act === "qAdd") { set.questions.push(blankQuestion()); St.set("quizSet", set); renderHost(); }
    else if (act === "qDel") { set.questions.splice(i, 1); St.set("quizSet", set); renderHost(); }
    else if (act === "qUp" || act === "qDown") {
      var j = act === "qUp" ? i - 1 : i + 1;
      if (j < 0 || j >= set.questions.length) return;
      var tmp = set.questions[i]; set.questions[i] = set.questions[j]; set.questions[j] = tmp;
      St.set("quizSet", set); renderHost();
    } else if (act === "qReset") {
      if (window.confirm("지금 만든 문제를 지우고 예시 문제로 되돌릴까요?")) { set = clone(Q.defaultSet); set.questions.forEach(padOptions); St.set("quizSet", set); renderHost(); }
    } else if (act === "aiGen") {
      var topic = $("#aiTopic").value.trim();
      if (!topic) { aiMsg("주제 또는 수업 내용을 입력해 주세요.", true); return; }
      aiMsg("문제를 만드는 중입니다… (최대 1~2분)");
      b.disabled = true;
      callAi(aiPrompt(topic, +$("#aiN").value, $("#aiLevel").value)).then(parseQuestions).then(addQuestions, function (e) {
        b.disabled = false; aiMsg("실패: " + (e && e.message ? e.message : e), true);
      });
    } else if (act === "aiCopy") {
      var topic2 = $("#aiTopic").value.trim() || "(여기에 주제나 수업 내용을 적어 주세요)";
      var text = aiPrompt(topic2, +$("#aiN").value, $("#aiLevel").value);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { aiMsg("프롬프트를 복사했습니다."); }, function () { aiMsg("복사하지 못했습니다. 직접 선택해 복사해 주세요.", true); });
      else aiMsg("이 브라우저에서는 복사를 지원하지 않습니다.", true);
    } else if (act === "aiImport") {
      try { addQuestions(parseQuestions($("#aiPaste").value)); } catch (e) { aiMsg("가져오지 못했습니다: " + e.message, true); }
    } else if (act === "openRoom") openRoom();
    else if (act === "startGame") startGame();
    else if (act === "closeQ") closeQuestion();
    else if (act === "showBoard") showBoard();
    else if (act === "nextQ") nextQuestion();
    else if (act === "closeRoom") { if (window.confirm("방을 닫을까요? 학생 연결이 모두 끊어집니다.")) closeRoom(); }
    else if (act === "csvStu") csv("퀴즈_학생별결과", studentRows(snapshot()));
    else if (act === "csvQ") csv("퀴즈_문항별통계", questionRows(snapshot()));
    else if (act === "pastStu") csv("퀴즈_학생별결과", studentRows(past()[+b.dataset.i]));
    else if (act === "pastQ") csv("퀴즈_문항별통계", questionRows(past()[+b.dataset.i]));
  });

  window.addEventListener("edu-admin", function () {
    if (!isAdmin()) { aiKey = ""; if (H) closeRoom(); }
    renderHost();
  });

  // ================= 학생 =================
  var S = { state: "idle", peer: null, conn: null, timer: null, q: null, endAt: 0, last: null, msg: "" };

  var stopTimer = function () { clearInterval(S.timer); S.timer = null; };
  var leave = function () {
    stopTimer();
    try { if (S.conn) S.conn.close(); } catch (e) {}
    try { if (S.peer) S.peer.destroy(); } catch (e) {}
    S.peer = S.conn = null;
  };
  var sErr = function (msg) { leave(); S.state = "idle"; S.msg = msg; renderStudent(); };

  var urlPin = (function () { var m = /[?&]quiz=(\d{6})/.exec(location.search); return m ? m[1] : ""; })();

  var renderStudent = function () {
    var st = S.state, h = "";
    var head = '<h3>학생 참여</h3>';
    if (st === "idle") {
      var me = session();
      h = head + '<p class="muted">교수자 화면의 QR을 휴대폰 카메라로 촬영하면 PIN이 자동으로 입력됩니다. PIN을 직접 입력해도 됩니다.</p>' +
        '<form id="qzJoin" novalidate><div class="qz-row"><div class="field"><label for="qzPin">PIN (숫자 6자리)</label><input id="qzPin" inputmode="numeric" maxlength="6" autocomplete="off" value="' + esc(urlPin) + '"></div>' +
        '<div class="field"><label for="qzNick">닉네임</label><input id="qzNick" maxlength="14" autocomplete="off" value="' + esc(me ? me.name : "") + '"></div></div>' +
        '<p class="err" id="qzJoinErr">' + esc(S.msg) + '</p><button class="btn" type="submit">입장하기</button></form>';
    } else if (st === "connecting") {
      h = head + '<p class="muted">방에 연결하는 중입니다…</p>';
    } else if (st === "lobby") {
      h = head + '<div class="qz-center"><div class="qz-big">🙌</div><p><b>' + esc(S.name) + '</b>님, 입장했어요!</p><p class="muted">교수자가 시작할 때까지 기다려 주세요.</p>' +
        '<button type="button" class="chip-btn" data-sact="leave">나가기</button></div>';
    } else if (st === "question" || st === "answered" || st === "timeup") {
      var q = S.q;
      h = '<div class="qz-top"><span class="chip">Q ' + (q.i + 1) + " / " + q.n + '</span><b class="qz-timer" id="sTimer">' + Math.ceil(Math.max(0, S.endAt - Date.now()) / 1000) + '</b></div>' +
        '<div class="track"><div class="fill" id="sBar" style="width:100%"></div></div><h3 class="qz-question">' + esc(q.text) + "</h3>" +
        '<div class="qz-opts stu">' + map(q.opts, function (o, k) {
          return '<button type="button" class="qz-opt qo' + k + (S.pick === k ? " picked" : "") + '" data-sact="pick" data-k="' + k + '"' + (st !== "question" ? " disabled" : "") + '><span class="shape">' + SHAPES[k] + "</span>" + esc(o) + "</button>";
        }) + "</div>" + (st === "answered" ? '<p class="qz-wait">✔ 답을 보냈어요. 결과를 기다리는 중…</p>' : st === "timeup" ? '<p class="qz-wait">⏰ 시간이 끝났어요. 결과를 기다리는 중…</p>' : "");
    } else if (st === "result") {
      var r = S.last;
      h = '<div class="qz-center ' + (r.correct ? "good" : "bad") + '"><div class="qz-big">' + (r.correct ? "✅" : r.answered ? "❌" : "⏰") + "</div><h3>" +
        (r.correct ? "정답!" : r.answered ? "아쉬워요" : "응답하지 않았어요") + "</h3>" + (r.correct ? '<p class="qz-gain">+' + r.gain + "점</p>" : '<p class="muted">정답: ' + esc(r.answerText) + "</p>") +
        '<p>현재 <b>' + r.rank + "위</b> · " + r.score + "점</p>" + (r.explain ? '<p class="qz-explain">💡 ' + esc(r.explain) + "</p>" : "") + '<p class="muted">다음 화면을 기다리는 중…</p></div>';
    } else if (st === "board") {
      var b = S.last;
      h = '<h3>🏆 현재 순위</h3><p>내 순위 <b>' + b.rank + "위</b> / " + b.total + "명 · " + b.score + "점</p>" + '<ol class="qz-board">' + map(b.top, function (p, i) {
        return '<li><span class="rk">' + (i + 1) + '</span><span class="nm">' + esc(p.name) + "</span><b>" + p.score + "점</b></li>";
      }) + '</ol><p class="muted">다음 문제를 기다리는 중…</p>';
    } else if (st === "end") {
      var e = S.last;
      h = '<div class="qz-center"><div class="qz-big">🎉</div><h3>퀴즈 끝!</h3><p>최종 <b>' + e.rank + "위</b> / " + e.total + "명</p><p>" + e.score + "점 · 정답 " + e.correct + "/" + e.n + "</p>" +
        '<ol class="qz-board">' + map(e.top, function (p, i) { return '<li><span class="rk">' + (i + 1) + '</span><span class="nm">' + esc(p.name) + "</span><b>" + p.score + "점</b></li>"; }) +
        '</ol><button type="button" class="chip-btn" data-sact="leave">처음으로</button></div>';
    }
    studentEl.innerHTML = h;
    if (st === "question") startStudentTimer();
    else if (st === "answered" || st === "timeup") startStudentTimer(true);
  };

  var startStudentTimer = function () {
    stopTimer();
    var q = S.q;
    S.timer = setInterval(function () {
      var left = Math.max(0, S.endAt - Date.now()), t = $("#sTimer"), b = $("#sBar");
      if (t) t.textContent = Math.ceil(left / 1000);
      if (b) b.style.width = (left / (q.time * 1000) * 100) + "%";
      if (left <= 0) {
        stopTimer();
        if (S.state === "question") { S.state = "timeup"; renderStudent(); }
      }
    }, 250);
  };

  var onStudentMsg = function (m) {
    if (!m || typeof m !== "object") return;
    if (m.t === "welcome") { S.name = m.name; S.state = "lobby"; renderStudent(); }
    else if (m.t === "q") {
      S.q = m; S.pick = -1; S.endAt = Date.now() + m.left * 1000; S.state = "question"; renderStudent();
    } else if (m.t === "ack") { S.state = "answered"; renderStudent(); }
    else if (m.t === "result") { stopTimer(); S.last = m; S.state = "result"; renderStudent(); }
    else if (m.t === "board") { S.last = m; S.state = "board"; renderStudent(); }
    else if (m.t === "end") { stopTimer(); S.last = m; S.state = "end"; renderStudent(); }
    else if (m.t === "closed") { sErr("교수자가 방을 닫았습니다."); }
    else if (m.t === "err") { sErr(m.msg || "입장하지 못했습니다."); }
  };

  var joinRoom = function (pin, name) {
    S.state = "connecting"; S.msg = ""; renderStudent();
    var me = session();
    loadLib("peer").then(function () {
      var failTimer = setTimeout(function () { sErr("방을 찾지 못했습니다. PIN을 확인해 주세요."); }, 12000);
      S.peer = new Peer();
      S.peer.on("error", function (e) {
        clearTimeout(failTimer);
        sErr(e.type === "peer-unavailable" ? "이 PIN의 방이 없습니다. 번호를 다시 확인해 주세요." : "연결에 실패했습니다. (" + (e.type || "오류") + ")");
      });
      S.peer.on("open", function () {
        var conn = S.peer.connect(Q.peerPrefix + pin, { reliable: true });
        S.conn = conn;
        conn.on("open", function () { clearTimeout(failTimer); conn.send({ t: "join", name: name, sid: me ? me.studentId : "" }); });
        conn.on("data", onStudentMsg);
        conn.on("close", function () { if (S.state !== "end" && S.state !== "idle") sErr("교수자와 연결이 끊어졌습니다."); });
      });
    }, function (e) { sErr(e.message); });
  };

  studentEl.addEventListener("submit", function (ev) {
    if (ev.target.id !== "qzJoin") return;
    ev.preventDefault();
    var pin = $("#qzPin").value.trim(), nick = $("#qzNick").value.trim(), err = $("#qzJoinErr"), miss = [];
    if (!/^\d{6}$/.test(pin)) miss.push("PIN(숫자 6자리)");
    if (!nick) miss.push("닉네임");
    if (miss.length) { err.textContent = "확인해 주세요: " + miss.join(", "); return; }
    joinRoom(pin, nick);
  });
  studentEl.addEventListener("click", function (ev) {
    var b = ev.target.closest("button[data-sact]");
    if (!b) return;
    if (b.dataset.sact === "pick" && S.state === "question") {
      S.pick = +b.dataset.k;
      S.conn.send({ t: "a", i: S.q.i, c: S.pick });
      S.state = "answered";
      renderStudent();
    } else if (b.dataset.sact === "leave") { leave(); S.state = "idle"; S.msg = ""; renderStudent(); }
  });

  // ================= 시작 =================
  renderStudent();
  renderHost();
  if (urlPin) {
    // QR로 들어온 학생: 퀴즈 섹션으로 이동하고 닉네임 입력칸에 초점
    setTimeout(function () {
      document.getElementById("quiz").scrollIntoView({ block: "start" });
      var nick = $("#qzNick");
      if (nick) nick.focus();
    }, 400);
  }
})();
