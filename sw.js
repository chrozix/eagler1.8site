
const staticCacheName = "static-cache-v1";
const allowedProtocols = ["http:", "https:"];
const assetsToCache = [
  "/",
  "/index.html",
  "/index",
  "/classes.js.map",
  "/favicon.ico",
  "/largeEPK.js",
  "/offline",
  "/offline.html",
  "/sha256.js",
  "/sw.js",
  "/indexeddb-utils.js",

  "/lang/af_ZA.lang",
  "/lang/ar_SA.lang",
  "/lang/ast_ES.lang",
  "/lang/az_AZ.lang",
  "/lang/bg_BG.lang",
  "/lang/ca_ES.lang",
  "/lang/cs_CZ.lang",
  "/lang/cy_GB.lang",
  "/lang/da_DK.lang",
  "/lang/de_DE.lang",
  "/lang/el_GR.lang",
  "/lang/en_AU.lang",
  "/lang/en_CA.lang",
  "/lang/en_GB.lang",
  "/lang/en_PT.lang",
  "/lang/eo_UY.lang",
  "/lang/es_AR.lang",
  "/lang/es_ES.lang",
  "/lang/es_MX.lang",
  "/lang/es_UY.lang",
  "/lang/es_VE.lang",
  "/lang/et_EE.lang",
  "/lang/eu_ES.lang",
  "/lang/fa_IR.lang",
  "/lang/fi_FI.lang",
  "/lang/fil_PH.lang",
  "/lang/fr_CA.lang",
  "/lang/fr_FR.lang",
  "/lang/ga_IE.lang",
  "/lang/gl_ES.lang",
  "/lang/gv_IM.lang",
  "/lang/he_IL.lang",
  "/lang/hi_IN.lang",
  "/lang/hr_HR.lang",
  "/lang/hu_HU.lang",
  "/lang/hy_AM.lang",
  "/lang/id_ID.lang",
  "/lang/is_IS.lang",
  "/lang/it_IT.lang",
  "/lang/ja_JP.lang",
  "/lang/ka_GE.lang",
  "/lang/ko_KR.lang",
  "/lang/kw_GB.lang",
  "/lang/la_LA.lang",
  "/lang/lb_LU.lang",
  "/lang/lt_LT.lang",
  "/lang/lv_LV.lang",
  "/lang/mi_NZ.lang",
  "/lang/ms_MY.lang",
  "/lang/mt_MT.lang",
  "/lang/nds_DE.lang",
  "/lang/nl_NL.lang",
  "/lang/nn_NO.lang",
  "/lang/no_NO.lang",
  "/lang/oc_FR.lang",
  "/lang/pl_PL.lang",
  "/lang/pt_BR.lang",
  "/lang/pt_PT.lang",
  "/lang/qya_AA.lang",
  "/lang/ro_RO.lang",
  "/lang/ru_RU.lang",
  "/lang/se_NO.lang",
  "/lang/sk_SK.lang",
  "/lang/sl_SI.lang",
  "/lang/sr_SP.lang",
  "/lang/sv_SE.lang",
  "/lang/th_TH.lang",
  "/lang/tlh_AA.lang",
  "/lang/tr_TR.lang",
  "/lang/uk_UA.lang",
  "/lang/val_ES.lang",
  "/lang/vi_VN.lang",
  "/lang/zh_CN.lang",
  "/lang/zh_TW.lang",

  // JS & asset metadata files
  "/javascript/meta.json",
  "/game-assets/meta.json",
  "/offline-assets/meta.json",
];

const aliases = {
  "/index": "/",
  "/offline": "/offline",
  "/": "/",
};

// ready listener
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activated. Cached asset count: ${assetsToCache.length}`);
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(staticCacheName).then(async (cache) => {
      const response = await fetch("/offline-assets/meta.json");
      const offlineAssets = await response.json();

      offlineAssets.segments.forEach((e) => {
        assetsToCache.push("/offline-assets/" + e);
      });

      return cache.addAll(assetsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        console.log(`[SW] [GET] ${event.request.url} -> <network>`);
        const url = new URL(response.url);
        const proto = url.protocol;
        if (allowedProtocols.some((v) => v == proto) && aliases[url.pathname] === undefined) {
          const cache = await caches.open(staticCacheName);
          const responseClone = response.clone();
          cache.put(event.request, responseClone);
        }
        return response;
      } catch (error) {
        const hit = await caches.match(event.request);
        if (hit) {
          console.log(`[SW] [GET] ${event.request.url} -> <cache hit>`);
          return hit;
        }
        const requestURL = new URL(event.request.url);
        const path = requestURL.pathname;
        const alias = aliases[path];
        if (alias) {
          const aliasHit = await caches.match(requestURL.origin + alias);
          if (aliasHit) return aliasHit;
        }
        console.log(`[SW] [GET] ${path} -> <cache miss>`);
        throw error;
      }
    })()
  );
});
