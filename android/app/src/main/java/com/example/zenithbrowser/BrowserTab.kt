package com.example.zenithbrowser

data class BrowserTab(
    val id: String,
    var title: String = "Thẻ mới",
    var url: String = "file:///android_asset/newtab/newtab.html",
    var webView: ZenithWebView? = null
)

