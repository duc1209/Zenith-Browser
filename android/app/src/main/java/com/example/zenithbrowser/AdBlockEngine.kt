package com.example.zenithbrowser

import android.net.Uri
import android.webkit.WebResourceResponse
import android.webkit.WebView
import java.io.ByteArrayInputStream

object AdBlockEngine {
    var isEnabled: Boolean = true

    // Danh sách domain quảng cáo, tracker & telemetry chuẩn uBlock Origin / EasyList / ABPVN
    private val AD_DOMAINS = hashSetOf(
        // --- Google & DoubleClick Ad Networks ---
        "doubleclick.net", "g.doubleclick.net", "googleads.g.doubleclick.net", "ad.doubleclick.net",
        "pubads.g.doubleclick.net", "securepubads.g.doubleclick.net", "static.doubleclick.net",
        "googlesyndication.com", "pagead2.googlesyndication.com", "pagead-google.com",
        "googleadservices.com", "adservice.google.com", "adservice.google.com.vn",
        "google-analytics.com", "analytics.google.com", "googletagmanager.com", "googletagservices.com",
        "admob.com", "admob.google.com", "2mdn.net", "invitemedia.com", "admeld.com",

        // --- Mạng quảng cáo quốc tế lớn (uBlock / EasyList Core) ---
        "adnxs.com", "ib.adnxs.com", "secure.adnxs.com", "adnxs-simple.com",
        "adform.net", "adform.com", "track.adform.net",
        "rubiconproject.com", "optimized-by.rubiconproject.com", "fastlane.rubiconproject.com",
        "pubmatic.com", "ads.pubmatic.com", "image2.pubmatic.com",
        "openx.net", "us-u.openx.net", "ox-d.openx.net", "openx.com",
        "criteo.com", "criteo.net", "static.criteo.net", "cas.criteo.com", "bidder.criteo.com",
        "outbrain.com", "widgets.outbrain.com", "log.outbrain.com", "traffic.outbrain.com",
        "taboola.com", "cdn.taboola.com", "trc.taboola.com", "vid.taboola.com",
        "mgid.com", "servserv.mgid.com", "c.mgid.com", "jsc.mgid.com",
        "revcontent.com", "cdn.revcontent.com", "trends.revcontent.com",
        "popads.net", "serve.popads.net", "c1.popads.net",
        "propellerads.com", "propellerclick.com", "monetag.com",
        "adcash.com", "as.adcash.com",
        "zergnet.com", "infolinks.com", "resources.infolinks.com",
        "bidvertiser.com", "trafficjunky.com", "trafficjunky.net",
        "exoclick.com", "syndication.exoclick.com", "main.exoclick.com",
        "juicyads.com", "adserver.juicyads.com",
        "adsterra.com", "richaudience.com", "smartadserver.com", "diff.smartadserver.com",
        "yieldmo.com", "teads.tv", "media.net", "contextual.media.net",
        "advertising.com", "adcolony.com", "applovin.com", "oath.com",
        "chartboost.com", "unityads.unity3d.com", "vungle.com", "ironsrc.com",
        "is.com", "mintegral.com", "liftoff.io", "inmobi.com", "smaato.net",
        "mopub.com", "fyber.com", "adfalcon.com", "startapp.com", "tapjoy.com",
        "adblade.com", "adbutler.com", "adkernel.com", "adition.com", "admixer.net",
        "adroll.com", "d.adroll.com", "adscale.de", "adsrvr.org", "adswizz.com",
        "adtech.de", "adtechus.com", "bidswitch.net", "casalemedia.com",
        "contextweb.com", "districtm.io", "exponential.com", "gumgum.com",
        "id5-sync.com", "indexexchange.com", "kargo.com", "lijit.com",
        "liveintent.com", "nativo.com", "quantcast.com", "sharethrough.com",
        "simpli.fi", "sovrn.com", "spotxchange.com", "spotx.tv", "triplelift.com",
        "undertone.com", "unrulymedia.com", "yieldlab.net", "yieldoptimizer.com",
        "zemanta.com", "connatix.com", "aniview.com", "primis.tech", "springserve.com",
        "telaria.com", "tremorhub.com",

        // --- Mạng quảng cáo và Tracker tại Việt Nam (ABPVN + Cốc Cốc Subscriptions) ---
        "admicro.vn", "lg1.logging.admicro.vn", "static.admicro.vn", "admicro2.vcmedia.vn",
        "eclick.vn", "s.eclick.vn", "eclick.mediacdn.vn",
        "ambientdigitalgroup.com", "ambientplatform.vn", "ambientdigital.vn",
        "adtima.vn", "api.adtima.vn", "ad.adtima.vn", "static.adtima.vn",
        "novanet.vn", "blueseed.tv", "ants.vn", "vietad.vn", "cleverads.vn",
        "microad.vn", "innity.com", "innity.net", "vn.innity.com",
        "adnet.vn", "ringier.vn", "adbro.me", "adtrue.com", "aanetwork.vn",
        "ads.shopee.vn", "s.shopee.vn", "tracking.shopee.vn",
        "yomedia.vn", "yodimedia.com", "vidverto.io", "zascdn.com",
        "zaloweb.vn", "vclick.vn", "catngu.com", "adstir.com", "v9banners.com",
        "adtiming.com", "adpushup.com", "vietnamnet.vn/adv", "dantri.com.vn/adv",
        "vnexpress.net/ads", "tuoitre.vn/adv", "thanhnien.vn/adv", "24h.com.vn/adv",
        "kenh14.vn/adv", "zing.vn/ad", "baomoi.com/ad",

        // --- Trackers, Telemetry & Web Analytics (uBlock Privacy) ---
        "hotjar.com", "hotjar.io", "static.hotjar.com",
        "scorecardresearch.com", "b.scorecardresearch.com",
        "quantserve.com", "edge.quantserve.com",
        "histats.com", "s10.histats.com",
        "statcounter.com", "c.statcounter.com",
        "mc.yandex.ru", "an.yandex.ru", "metrika.yandex.ru",
        "hm.baidu.com", "clarity.ms", "c.bing.com", "bat.bing.com",
        "appsflyer.com", "adjust.com", "branch.io", "braze.com",
        "mixpanel.com", "api.mixpanel.com", "amplitude.com", "api.amplitude.com",
        "segment.io", "segment.com", "api.segment.io",
        "fullstory.com", "crazyegg.com", "inspectlet.com", "luckyorange.com",
        "mouseflow.com", "optimizely.com", "vwo.com", "newrelic.com", "nr-data.net",
        "bugsnag.com", "sentry.io", "rollbar.com", "datadoghq.com", "logrocket.io",
        "pixel.facebook.com", "an.facebook.com", "analytics.tiktok.com",
        "ads-twitter.com", "analytics.twitter.com",

        // --- Anti-Adblock & Detection Bypass (uBlock Unbreak & Badware) ---
        "blockadblock.com", "fuckadblock.com", "antiblock.org",
        "pagefair.com", "pagefair.net", "admiral.com", "getadmiral.com",
        "adblockanalytics.com", "adikteev.com", "detectadblock.com",
        "fwmrm.net", "imasdk.googleapis.com",

        // --- Popups, URL Shortener Ads & Malvertising ---
        "popcash.net", "popmyads.com", "propellerclick.com", "revenuehits.com",
        "shorte.st", "adf.ly", "bc.vc", "linkvertise.com", "ouo.io", "clk.ink",
        "trafficforce.com", "hilltopads.com", "clickadu.com", "evadav.com",
        "galaksion.com", "richpush.co", "rollerads.com", "pushwoosh.com", "onesignal.com"
    )

    private val YOUTUBE_AD_PATTERNS = listOf(
        "/api/stats/ads",
        "/pagead/",
        "ptracking",
        "doubleclick.net",
        "g.doubleclick.net",
        "googleads.g.doubleclick.net",
        "static.doubleclick.net",
        "ad.doubleclick.net",
        "pubads.g.doubleclick.net",
        "securepubads.g.doubleclick.net",
        "/youtubei/v1/player/ad_break",
        "/get_midroll_info",
        "/pagead/lvz",
        "/pagead/1p-user-list"
    )

    val COSMETIC_CSS = """
        ytd-ad-slot-renderer,
        ytd-in-feed-ad-layout-renderer,
        ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
        ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
        ytd-rich-section-renderer:has(ytd-ad-slot-renderer),
        ytd-rich-section-renderer:has(ytd-in-feed-ad-layout-renderer),
        ytd-banner-promo-renderer,
        #masthead-ad,
        ytd-promoted-sparkles-web-renderer,
        ytd-promoted-video-renderer,
        ytd-display-ad-renderer,
        #player-ads,
        .ytp-ad-module,
        .ytp-ad-overlay-container,
        .ytp-ad-player-overlay-layout,
        .ytp-ad-player-overlay,
        .video-ads,
        .sparkles-light-cta,
        ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
        #panels:has(ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]),
        #companion,
        ytd-action-companion-ad-renderer,
        ytd-compact-promoted-video-renderer,
        ytd-merch-shelf-renderer,
        tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
        ytd-enforcement-message-view-model,
        yt-playability-error-supported-renderers#error-screen:has(ytd-enforcement-message-view-model),
        .ytd-ad-slot-renderer,
        .adsbygoogle,
        [id^="google_ads_"],
        [id^="div-gpt-ad"],
        .ad-container,
        .ad-wrapper,
        .banner-ads,
        .ads-banner,
        .advertisement,
        .ad-slot,
        .sponsored-post,
        .ad-box,
        .qc-container,
        .quang-cao,
        .box-quangcao,
        #ads,
        .ads-holder,
        .ad_wrapper,
        div[data-ad-unit],
        div[data-google-query-id],
        iframe[src*="doubleclick.net"],
        iframe[src*="googlesyndication.com"],
        iframe[src*="adnxs.com"],
        iframe[src*="criteo.com"],
        iframe[src*="taboola.com"],
        iframe[src*="outbrain.com"] {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            min-height: 0 !important;
            width: 0 !important;
            opacity: 0 !important;
            pointer-events: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }
    """.trimIndent()

    fun shouldBlock(url: String): Boolean {
        if (!isEnabled || url.isBlank()) return false
        val lowerUrl = url.lowercase()

        // TUYỆT ĐỐI KHÔNG BAO GIỜ CHẶN LUỒNG VIDEO & AUDIO CHÍNH
        if (lowerUrl.contains("googlevideo.com") || lowerUrl.contains("videoplayback")) {
            return false
        }

        // 1. Kiểm tra domain & subdomain theo chuẩn uBlock Origin (O(1) Set Lookup)
        try {
            val uri = Uri.parse(url)
            val host = uri.host?.lowercase()
            if (host != null) {
                val parts = host.split(".")
                for (i in 0 until parts.size - 1) {
                    val sub = parts.subList(i, parts.size).joinToString(".")
                    if (AD_DOMAINS.contains(sub)) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {}

        // 2. Kiểm tra mẫu quảng cáo video YouTube & ad endpoints
        for (pattern in YOUTUBE_AD_PATTERNS) {
            if (lowerUrl.contains(pattern)) return true
        }

        return false
    }

    fun createEmptyResponse(): WebResourceResponse {
        return WebResourceResponse(
            "text/plain",
            "UTF-8",
            ByteArrayInputStream(ByteArray(0))
        )
    }

    fun injectCosmeticFilter(webView: WebView) {
        if (!isEnabled) return
        val js = """
            (function() {
                if (document.getElementById('__zenith_cosmetic_adblock')) return;
                var style = document.createElement('style');
                style.id = '__zenith_cosmetic_adblock';
                style.textContent = `$COSMETIC_CSS`;
                (document.head || document.documentElement).appendChild(style);
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }
}

