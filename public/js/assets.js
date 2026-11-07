// Pemuat aset: ASSET_BASE (dari config.js) kosong = ambil dari server sendiri,
// terisi = ambil dari CDN/Supabase Storage.
(function () {
  var base = String(window.ASSET_BASE || '').replace(/\/+$/, '');
  window.asset = function (p) {
    return base ? base + '/' + String(p).replace(/^\/+/, '') : p;
  };
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-asset]').forEach(function (el) {
      el.src = window.asset(el.getAttribute('data-asset'));
    });
  });
})();
