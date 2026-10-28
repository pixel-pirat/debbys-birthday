/* ============================================================
   MEDIA — stores uploaded photos & music in IndexedDB so your own
   files persist across reloads, entirely on this device. Nothing
   is uploaded anywhere; there's no server involved.
   ============================================================ */
window.BdayMedia = (function () {
  "use strict";

  var DB_NAME = "bday-media";
  var STORE = "files";
  var dbPromise = null;
  var urls = {}; // key -> last object URL handed out, so we can revoke it before making a new one

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("IndexedDB unavailable"));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("IndexedDB open failed"));
      };
    });
    return dbPromise;
  }

  function put(key, file) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(file, key);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function get(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(key);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function del(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  /* Hands back a fresh object URL for a stored File/Blob, revoking
     whichever one this key handed out last time (one live URL per key). */
  function urlFor(key, fileOrBlob) {
    if (urls[key]) URL.revokeObjectURL(urls[key]);
    var u = fileOrBlob ? URL.createObjectURL(fileOrBlob) : null;
    urls[key] = u;
    return u;
  }

  function supported() {
    return !!window.indexedDB;
  }

  return { put: put, get: get, del: del, urlFor: urlFor, supported: supported };
})();
