/* ============================================================
   MEDIA — uploads photos & music to the server (Postgres + Vercel
   Blob, see api/media.mjs), so whatever gets uploaded shows for
   everyone who opens the page, not just the uploader's own browser.
   Needs the admin passphrase (BDAY.getToken()) to write; reading is
   always public (it's just BDAY.loadFromServer()).
   ============================================================ */
window.BdayMedia = (function () {
  "use strict";

  var MAX_BYTES = 4 * 1024 * 1024;

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || "");
        var comma = result.indexOf(",");
        resolve(comma === -1 ? result : result.slice(comma + 1));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Couldn't read that file."));
      };
      reader.readAsDataURL(file);
    });
  }

  /* Downscales an image client-side (max dimension + JPEG quality) so a
     full-resolution phone photo still fits the upload limit. Leaves
     anything already small enough alone. Non-image files pass through. */
  function shrinkImageIfNeeded(file, maxDim, quality) {
    if (!file.type || file.type.indexOf("image/") !== 0) return Promise.resolve(file);
    if (file.size <= MAX_BYTES * 0.6) return Promise.resolve(file);
    if (typeof createImageBitmap !== "function") return Promise.resolve(file);

    return createImageBitmap(file)
      .then(function (bitmap) {
        var scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        var w = Math.max(1, Math.round(bitmap.width * scale));
        var h = Math.max(1, Math.round(bitmap.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, w, h);
        return new Promise(function (resolve) {
          canvas.toBlob(
            function (blob) {
              resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
            },
            "image/jpeg",
            quality
          );
        });
      })
      .catch(function () {
        return file;
      });
  }

  function upload(slot, file) {
    return shrinkImageIfNeeded(file, 1600, 0.82).then(function (toSend) {
      if (toSend.size > MAX_BYTES) {
        return Promise.reject(new Error("That file is too large (about 4MB max for an in-browser upload)."));
      }
      return fileToBase64(toSend).then(function (dataBase64) {
        return fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-token": BDAY.getToken() },
          body: JSON.stringify({ slot: slot, filename: file.name, mimeType: toSend.type || file.type, dataBase64: dataBase64 }),
        }).then(function (r) {
          return r.json().then(function (d) {
            if (!r.ok) throw new Error((d && d.error) || "Upload failed.");
            return d;
          });
        });
      });
    });
  }

  function remove(slot) {
    return fetch("/api/media?slot=" + encodeURIComponent(slot), {
      method: "DELETE",
      headers: { "x-admin-token": BDAY.getToken() },
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || "Couldn't remove that file.");
        return d;
      });
    });
  }

  return { upload: upload, remove: remove };
})();
