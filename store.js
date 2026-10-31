/*
 * 저장소 — 서버 없이 이 브라우저(localStorage + IndexedDB)에 저장합니다.
 * 나중에 서버를 연결할 때는 이 파일의 get/set/on/putFile/getFile만 서버용으로 바꾸면 됩니다.
 */
(function () {
  var NS = "edu.";
  var listeners = {};

  var read = function (k, d) {
    try {
      var v = localStorage.getItem(NS + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) { return d; }
  };
  var fire = function (k) { (listeners[k] || []).forEach(function (fn) { fn(); }); };

  // 다른 탭에서 값이 바뀌면 즉시 반영 (실시간 투표 결과 등)
  window.addEventListener("storage", function (ev) {
    if (ev.key && ev.key.indexOf(NS) === 0) fire(ev.key.slice(NS.length));
  });

  var openDb = function () {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("이 브라우저는 파일 저장을 지원하지 않습니다.")); return; }
      var r = indexedDB.open("edu-files", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("files"); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  };
  var withStore = function (mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction("files", mode), req = fn(t.objectStore("files"));
        t.oncomplete = function () { resolve(req && req.result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  };

  // 관리자 화면에서 고친 내용(configOverride)을 config.js 위에 덮어씁니다.
  // 주소 끝에 ?safe=1을 붙이면 수정본을 무시하고 config.js 그대로 열립니다(복구용).
  if (window.SITE_CONFIG) {
    window.SITE_CONFIG_BASE = JSON.parse(JSON.stringify(window.SITE_CONFIG));
    var ov = /[?&]safe=1/.test(location.search) ? {} : read("configOverride", {});
    Object.keys(ov || {}).forEach(function (k) { window.SITE_CONFIG[k] = ov[k]; });
  }

  window.EduStore = {
    get: read,
    set: function (k, v) {
      try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { return false; }
      fire(k);
      return true;
    },
    on: function (k, fn) { (listeners[k] = listeners[k] || []).push(fn); },
    putFile: function (key, blob) { return withStore("readwrite", function (s) { return s.put(blob, key); }); },
    getFile: function (key) { return withStore("readonly", function (s) { return s.get(key); }); }
  };
})();
