package com.example.zenithbrowser

import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Configuration
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.InputMethodManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import java.util.UUID

class MainActivity : ComponentActivity() {
    private var isPiP by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Xin quyền gửi thông báo trên Android 13+ (Bắt buộc để hiển thị trên thanh thông báo)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 1001)
            }
        }

        // Khởi tạo kênh thông báo cho Download Manager
        DownloadHelper.createNotificationChannel(this)

        setContent {
            ZenithBrowserApp(
                onEnterPiP = {
                    enterPiPMode()
                },
                isPiP = isPiP
            )
        }
    }

    private fun enterPiPMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isPiP = isInPictureInPictureMode
    }

    var isAppInBackground: Boolean = false

    override fun onResume() {
        super.onResume()
        isAppInBackground = false
        ZenithWebView.setAllBackground(false)
        ZenithMediaService.stop(this)
    }

    override fun onStop() {
        super.onStop()
        if (!isPiP && !isChangingConfigurations) {
            isAppInBackground = true
            val activeUrl = ZenithWebView.activeWebViews.firstOrNull()?.url ?: ""
            val isYouTubeVideo = activeUrl.contains("youtube.com/watch") || activeUrl.contains("youtube.com/shorts")

            if (ZenithWebView.isUserPaused) {
                // Người dùng đã chủ động dừng video -> Dừng hẳn, không tự bật
                ZenithWebView.setAllBackground(false)
                ZenithMediaService.stop(this)
            } else if (ZenithWebView.isAnyMediaPlaying || isYouTubeVideo) {
                ZenithWebView.setAllBackground(true)
                val title = if (ZenithWebView.currentMediaTitle.isNotBlank() && ZenithWebView.currentMediaTitle != "Zenith Browser") {
                    ZenithWebView.currentMediaTitle
                } else {
                    ZenithWebView.currentActiveTitle
                }
                ZenithMediaService.startOrUpdate(
                    this,
                    title = title,
                    artist = ZenithWebView.currentMediaArtist,
                    artworkUrl = ZenithWebView.currentArtworkUrl,
                    positionMs = ZenithWebView.currentPositionMs,
                    durationMs = ZenithWebView.currentDurationMs,
                    isPlaying = true
                )
            } else {
                ZenithWebView.setAllBackground(false)
                ZenithMediaService.stop(this)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        ZenithWebView.setAllBackground(false)
        ZenithMediaService.stop(this)
    }
}

class ZenithJsBridge(
    private val onMedia: (MediaItem) -> Unit,
    private val onRequestKeyboard: (() -> Unit)? = null,
    private val onPlaybackState: ((Boolean, String) -> Unit)? = null,
    private val onPlaybackDetails: ((Boolean, String, String, String, Double, Double) -> Unit)? = null
) {
    @JavascriptInterface
    fun onMediaFound(title: String, url: String, type: String, quality: String, ext: String) {
        onMedia(MediaItem(title, url, type, quality, ext))
    }

    @JavascriptInterface
    fun requestSoftKeyboard() {
        onRequestKeyboard?.invoke()
    }

    @JavascriptInterface
    fun onMediaPlaybackChanged(isPlaying: Boolean, title: String) {
        onPlaybackState?.invoke(isPlaying, title)
    }

    @JavascriptInterface
    fun onMediaPlaybackDetails(
        isPlaying: Boolean,
        title: String,
        artist: String,
        artworkUrl: String,
        positionMs: Double,
        durationMs: Double
    ) {
        onPlaybackDetails?.invoke(isPlaying, title, artist, artworkUrl, positionMs, durationMs)
    }
}

fun resolveSearchUrl(input: String, searchEngine: String): String {
    val trimmed = input.trim()
    if (trimmed.isEmpty()) return "file:///android_asset/newtab/newtab.html"
    if (trimmed.startsWith("file://") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed
    }
    val isDomain = trimmed.contains(".") && !trimmed.contains(" ") && !trimmed.startsWith("?")
    if (isDomain) {
        return "https://$trimmed"
    }
    val encoded = Uri.encode(trimmed)
    return when (searchEngine) {
        "coccoc" -> "https://coccoc.com/search?query=$encoded"
        "bing" -> "https://www.bing.com/search?q=$encoded"
        "duckduckgo" -> "https://duckduckgo.com/?q=$encoded"
        else -> "https://www.google.com/search?q=$encoded"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ZenithBrowserApp(isPiP: Boolean, onEnterPiP: () -> Unit) {
    val context = LocalContext.current
    val prefs: SharedPreferences = remember {
        context.getSharedPreferences("zenith_browser_prefs", Context.MODE_PRIVATE)
    }

    // Cấu hình người dùng
    var searchEngine by remember { mutableStateOf(prefs.getString("search_engine", "google") ?: "google") }
    var isAdBlockOn by remember { mutableStateOf(prefs.getBoolean("adblock_enabled", true)) }
    var isSmartDarkOn by remember { mutableStateOf(prefs.getBoolean("smart_dark_enabled", false)) }

    // Quản lý Tab
    val tabs = remember { mutableStateListOf<BrowserTab>() }
    var activeTabIndex by remember { mutableStateOf(0) }

    // Media sniffer state
    var detectedMedia by remember { mutableStateOf<MediaItem?>(null) }
    var showSaviorDialog by remember { mutableStateOf(false) }

    // UI Dialogs
    var showSearchDialog by remember { mutableStateOf(false) }
    var showTabsDialog by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }
    var showMenuPopup by remember { mutableStateOf(false) }

    var currentUrl by remember { mutableStateOf("file:///android_asset/newtab/newtab.html") }
    var currentTitle by remember { mutableStateOf("Thẻ mới") }
    var loadingProgress by remember { mutableStateOf(0) }
    var canGoBack by remember { mutableStateOf(false) }
    var canGoForward by remember { mutableStateOf(false) }

    // Khởi tạo tab đầu tiên
    LaunchedEffect(Unit) {
        if (tabs.isEmpty()) {
            tabs.add(BrowserTab(id = UUID.randomUUID().toString()))
        }
    }

    val activeTab = if (tabs.isNotEmpty() && activeTabIndex in tabs.indices) tabs[activeTabIndex] else null

    // Hàm tạo ZenithWebView cho Tab
    @SuppressLint("SetJavaScriptEnabled")
    fun createWebViewForTab(tab: BrowserTab): ZenithWebView {
        return ZenithWebView(context).apply {
            setBackgroundColor(0xFF080C14.toInt())
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            isFocusable = true
            isFocusableInTouchMode = true
            setOnTouchListener { v, event ->
                if (event.action == MotionEvent.ACTION_DOWN || event.action == MotionEvent.ACTION_UP) {
                    if (!v.hasFocus()) {
                        v.requestFocus()
                    }
                }
                false
            }
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                mediaPlaybackRequiresUserGesture = false
                useWideViewPort = true
                loadWithOverviewMode = true
                textZoom = 100
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
                userAgentString = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
            }

            addJavascriptInterface(ZenithJsBridge(
                onMedia = { media ->
                    (context as? ComponentActivity)?.runOnUiThread {
                        detectedMedia = media
                    }
                },
                onRequestKeyboard = {
                    this@apply.post {
                        if (!hasFocus()) {
                            requestFocus()
                        }
                        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
                        if (imm != null) {
                            val shown = imm.showSoftInput(this@apply, 0)
                            if (!shown) {
                                imm.showSoftInput(this@apply, InputMethodManager.SHOW_IMPLICIT)
                            }
                        }
                    }
                },
                onPlaybackState = { isPlaying, title ->
                    (context as? Activity)?.runOnUiThread {
                        ZenithWebView.isAnyMediaPlaying = isPlaying
                        if (title.isNotBlank()) {
                            ZenithWebView.currentMediaTitle = title
                            ZenithWebView.currentActiveTitle = title
                        }
                        val mainAct = context as? MainActivity
                        if (mainAct != null && mainAct.isAppInBackground) {
                            ZenithMediaService.startOrUpdate(
                                context,
                                title = ZenithWebView.currentMediaTitle,
                                artist = ZenithWebView.currentMediaArtist,
                                artworkUrl = ZenithWebView.currentArtworkUrl,
                                positionMs = ZenithWebView.currentPositionMs,
                                durationMs = ZenithWebView.currentDurationMs,
                                isPlaying = isPlaying
                            )
                        }
                    }
                },
                onPlaybackDetails = { isPlaying, title, artist, artworkUrl, positionMs, durationMs ->
                    (context as? Activity)?.runOnUiThread {
                        ZenithWebView.isAnyMediaPlaying = isPlaying
                        if (title.isNotBlank()) {
                            ZenithWebView.currentMediaTitle = title
                            ZenithWebView.currentActiveTitle = title
                        }
                        if (artist.isNotBlank()) {
                            ZenithWebView.currentMediaArtist = artist
                        }
                        if (artworkUrl.isNotBlank()) {
                            ZenithWebView.currentArtworkUrl = artworkUrl
                        }
                        ZenithWebView.currentPositionMs = positionMs.toLong()
                        ZenithWebView.currentDurationMs = durationMs.toLong()

                        val mainAct = context as? MainActivity
                        if (mainAct != null && mainAct.isAppInBackground) {
                            ZenithMediaService.startOrUpdate(
                                context,
                                title = ZenithWebView.currentMediaTitle,
                                artist = ZenithWebView.currentMediaArtist,
                                artworkUrl = ZenithWebView.currentArtworkUrl,
                                positionMs = ZenithWebView.currentPositionMs,
                                durationMs = ZenithWebView.currentDurationMs,
                                isPlaying = isPlaying
                            )
                        }
                    }
                }
            ), "ZenithMobile")

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                    val urlStr = request?.url?.toString() ?: ""
                    if (isAdBlockOn && AdBlockEngine.shouldBlock(urlStr)) {
                        return AdBlockEngine.createEmptyResponse()
                    }
                    return super.shouldInterceptRequest(view, request)
                }

                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    url?.let {
                        currentUrl = it
                        tab.url = it
                        if (!it.contains("youtube.com")) {
                            detectedMedia = null
                        }
                    }
                    canGoBack = canGoBack()
                    canGoForward = canGoForward()

                    // Bơm script giữ âm thanh phát dưới nền sớm
                    try {
                        context.assets.open("scripts/bgplayback.js").bufferedReader().use {
                            evaluateJavascript(it.readText(), null)
                        }
                    } catch (e: Exception) {}

                    // Bơm script chặn quảng cáo sớm tại onPageStarted
                    if (isAdBlockOn) {
                        AdBlockEngine.injectCosmeticFilter(this@apply)
                        try {
                            context.assets.open("scripts/adblock.js").bufferedReader().use {
                                evaluateJavascript(it.readText(), null)
                            }
                        } catch (e: Exception) {}
                    }
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    canGoBack = canGoBack()
                    canGoForward = canGoForward()

                    // Bơm script giữ âm thanh phát dưới nền
                    try {
                        context.assets.open("scripts/bgplayback.js").bufferedReader().use {
                            evaluateJavascript(it.readText(), null)
                        }
                    } catch (e: Exception) {}

                    // Bơm bộ lọc quảng cáo giao diện
                    if (isAdBlockOn) {
                        AdBlockEngine.injectCosmeticFilter(this@apply)
                        try {
                            context.assets.open("scripts/adblock.js").bufferedReader().use {
                                evaluateJavascript(it.readText(), null)
                            }
                        } catch (e: Exception) {}
                    }

                    // Bơm chế độ ban đêm nếu đang bật
                    if (isSmartDarkOn) {
                        try {
                            context.assets.open("scripts/darkmode.js").bufferedReader().use {
                                evaluateJavascript(it.readText(), null)
                            }
                        } catch (e: Exception) {}
                    }

                    // Bơm bộ bắt link Savior
                    try {
                        context.assets.open("scripts/sniffer.js").bufferedReader().use {
                            evaluateJavascript(it.readText(), null)
                        }
                    } catch (e: Exception) {}
                }

                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val uri = request?.url ?: return false
                    val scheme = uri.scheme ?: return false
                    if (scheme == "http" || scheme == "https" || scheme == "file") {
                        return false
                    }
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, uri)
                        context.startActivity(intent)
                    } catch (e: Exception) {}
                    return true
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    loadingProgress = if (newProgress < 100) newProgress else 0
                    if (newProgress in 15..30) {
                        try {
                            context.assets.open("scripts/bgplayback.js").bufferedReader().use {
                                view?.evaluateJavascript(it.readText(), null)
                            }
                        } catch (e: Exception) {}
                    }
                }

                override fun onReceivedTitle(view: WebView?, title: String?) {
                    title?.let {
                        currentTitle = it
                        tab.title = it
                        ZenithWebView.currentActiveTitle = it
                    }
                }
            }

            loadUrl(tab.url)
        }
    }

    // Xử lý nút Back của Android
    BackHandler(enabled = canGoBack || tabs.size > 1 || !currentUrl.contains("newtab.html")) {
        when {
            showSearchDialog -> showSearchDialog = false
            showTabsDialog -> showTabsDialog = false
            showSettingsDialog -> showSettingsDialog = false
            showSaviorDialog -> showSaviorDialog = false
            canGoBack -> activeTab?.webView?.goBack()
            !currentUrl.contains("newtab.html") -> activeTab?.webView?.loadUrl("file:///android_asset/newtab/newtab.html")
            tabs.size > 1 -> {
                tabs.removeAt(activeTabIndex)
                activeTabIndex = (activeTabIndex - 1).coerceAtLeast(0)
            }
        }
    }

    // Bố cục giao diện chính (An toàn không bị lẹm tai thỏ/camera với statusBarsPadding)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF080C14))
            .statusBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {

            // 1. Thanh tiến trình tải trang (Loading Bar)
            if (loadingProgress in 1..99) {
                LinearProgressIndicator(
                    progress = { loadingProgress / 100f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.5.dp),
                    color = Color(0xFF10B981),
                    trackColor = Color.Transparent
                )
            }

            // 2. Khu vực hiển thị nội dung WebView
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) {
                activeTab?.let { currentTab ->
                    AndroidView(
                        factory = {
                            (currentTab.webView ?: createWebViewForTab(currentTab).also { currentTab.webView = it }).apply {
                                isFocusable = true
                                isFocusableInTouchMode = true
                            }
                        },
                        update = { wv ->
                            currentTab.webView = wv
                            wv.isFocusable = true
                            wv.isFocusableInTouchMode = true
                        },
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding()
                    )
                }
            }

            // 3. Thanh điều hướng đáy màn hình (Bottom Navigation Bar)
            if (!isPiP) {
                Surface(
                    color = Color(0xFF101726),
                    shadowElevation = 10.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = 8.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Nút Back
                        IconButton(
                            onClick = { activeTab?.webView?.goBack() },
                            enabled = canGoBack,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Text("◀", color = if (canGoBack) Color.White else Color(0xFF4B5563), fontSize = 15.sp)
                        }

                        // Nút Forward
                        IconButton(
                            onClick = { activeTab?.webView?.goForward() },
                            enabled = canGoForward,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Text("▶", color = if (canGoForward) Color.White else Color(0xFF4B5563), fontSize = 15.sp)
                        }

                        // Thanh địa chỉ URL & Tìm kiếm (Rộng rãi, không bị cụt chữ)
                        Surface(
                            color = Color(0xFF1C2436),
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(40.dp)
                                .padding(horizontal = 6.dp)
                                .clickable { showSearchDialog = true }
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            ) {
                                val isNewTab = currentUrl.contains("newtab.html")
                                Text(if (isNewTab) "🔍" else "🔒", fontSize = 13.sp)
                                Spacer(modifier = Modifier.width(8.dp))
                                val displayUrl = when {
                                    isNewTab -> "Tìm kiếm hoặc nhập URL..."
                                    else -> Uri.parse(currentUrl).host ?: currentUrl
                                }
                                Text(
                                    text = displayUrl,
                                    color = if (isNewTab) Color(0xFF9CA3AF) else Color.White,
                                    fontSize = 13.sp,
                                    fontWeight = if (isNewTab) FontWeight.Normal else FontWeight.Medium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }

                        // Nút Quản lý Tab
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF263248))
                                .clickable { showTabsDialog = true }
                        ) {
                            Text("${tabs.size}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        Spacer(modifier = Modifier.width(4.dp))

                        // Nút Menu 3 chấm
                        IconButton(
                            onClick = { showMenuPopup = true },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Text("⋮", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 4. Nút Nổi Savior Tải Video (Floating Action Button)
        if (!isPiP) {
            AnimatedVisibility(
                visible = detectedMedia != null,
                enter = fadeIn() + slideInVertically { it / 2 },
                exit = fadeOut(),
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(bottom = 70.dp, end = 16.dp)
            ) {
                FloatingActionButton(
                    onClick = { showSaviorDialog = true },
                    containerColor = Color(0xFF10B981),
                    contentColor = Color.White,
                    shape = RoundedCornerShape(20.dp),
                    modifier = Modifier.height(44.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 14.dp)
                    ) {
                        Text("⬇️", fontSize = 16.sp)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Tải Video / MP3", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            }
        }

        // 5. Popup Menu chính
        DropdownMenu(
            expanded = showMenuPopup,
            onDismissRequest = { showMenuPopup = false },
            modifier = Modifier.background(Color(0xFF161E2E))
        ) {
            DropdownMenuItem(
                text = { Text("➕ Thẻ mới", color = Color.White) },
                onClick = {
                    showMenuPopup = false
                    val newTab = BrowserTab(id = UUID.randomUUID().toString())
                    tabs.add(newTab)
                    activeTabIndex = tabs.size - 1
                }
            )
            DropdownMenuItem(
                text = { Text("🔄 Tải lại trang", color = Color.White) },
                onClick = {
                    showMenuPopup = false
                    activeTab?.webView?.reload()
                }
            )
            DropdownMenuItem(
                text = { Text(if (isSmartDarkOn) "☀️ Chế độ tối: BẬT" else "🌙 Chế độ tối: TẮT", color = Color.White) },
                onClick = {
                    showMenuPopup = false
                    isSmartDarkOn = !isSmartDarkOn
                    prefs.edit().putBoolean("smart_dark_enabled", isSmartDarkOn).apply()
                    activeTab?.webView?.let { wv ->
                        try {
                            context.assets.open("scripts/darkmode.js").bufferedReader().use {
                                wv.evaluateJavascript(it.readText(), null)
                            }
                        } catch (e: Exception) {}
                    }
                    Toast.makeText(context, if (isSmartDarkOn) "🌙 Đã bật chế độ ban đêm" else "☀️ Đã tắt chế độ ban đêm", Toast.LENGTH_SHORT).show()
                }
            )
            DropdownMenuItem(
                text = { Text(if (isAdBlockOn) "🛡️ Chặn quảng cáo: BẬT" else "🛡️ Chặn quảng cáo: TẮT", color = Color.White) },
                onClick = {
                    showMenuPopup = false
                    isAdBlockOn = !isAdBlockOn
                    prefs.edit().putBoolean("adblock_enabled", isAdBlockOn).apply()
                    activeTab?.webView?.reload()
                    Toast.makeText(context, if (isAdBlockOn) "🛡️ Đã bật khiên chặn quảng cáo" else "⚠️ Đã tắt khiên chặn quảng cáo", Toast.LENGTH_SHORT).show()
                }
            )
            DropdownMenuItem(
                text = { Text("📌 Ghim video (PiP)", color = Color.White) },
                onClick = {
                    showMenuPopup = false
                    onEnterPiP()
                }
            )
            DropdownMenuItem(
                text = { Text("⚙️ Cài đặt", color = Color.White) },
                onClick = {
                    showMenuPopup = false
                    showSettingsDialog = true
                }
            )
        }

        // 6. Dialog Nhập URL & Tìm kiếm
        if (showSearchDialog) {
            SearchUrlDialog(
                initialText = if (currentUrl.contains("newtab.html")) "" else currentUrl,
                searchEngine = searchEngine,
                onDismiss = { showSearchDialog = false },
                onNavigate = { targetUrl ->
                    showSearchDialog = false
                    val resolved = resolveSearchUrl(targetUrl, searchEngine)
                    activeTab?.webView?.loadUrl(resolved)
                }
            )
        }

        // 7. Dialog Savior Tải Video / MP3
        if (showSaviorDialog && detectedMedia != null) {
            val media = detectedMedia!!
            AlertDialog(
                onDismissRequest = { showSaviorDialog = false },
                containerColor = Color(0xFF161E2E),
                title = { Text("🎬 Savior Bắt Link Video", color = Color.White, fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text(
                            text = media.title,
                            color = Color(0xFFE5E7EB),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Text("Chọn định dạng bạn muốn tải về máy:", color = Color(0xFF9CA3AF), fontSize = 12.sp)
                    }
                },
                confirmButton = {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Button(
                            onClick = {
                                showSaviorDialog = false
                                DownloadHelper.downloadMedia(context, media.title, media.url, "mp4")
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("🎬 Tải Video MP4 (Full HD / 720p)", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = {
                                showSaviorDialog = false
                                DownloadHelper.downloadMedia(context, media.title, media.url, "mp3")
                            },
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF06B6D4)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("🎵 Tải Âm thanh MP3", fontWeight = FontWeight.Bold)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        TextButton(
                            onClick = {
                                showSaviorDialog = false
                                onEnterPiP()
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("📌 Ghim ra màn hình nhỏ (PiP)", color = Color(0xFF93C5FD))
                        }
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showSaviorDialog = false }) {
                        Text("Đóng", color = Color(0xFF9CA3AF))
                    }
                }
            )
        }

        // 8. Dialog Quản Lý Đa Tab (Tab Switcher)
        if (showTabsDialog) {
            Dialog(onDismissRequest = { showTabsDialog = false }) {
                Surface(
                    color = Color(0xFF131A26),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.75f)
                        .padding(8.dp)
                ) {
                    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("📑 Danh sách thẻ (${tabs.size})", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Spacer(modifier = Modifier.weight(1f))
                            IconButton(onClick = { showTabsDialog = false }) {
                                Text("✕", color = Color(0xFF9CA3AF), fontSize = 16.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        LazyColumn(modifier = Modifier.weight(1f)) {
                            itemsIndexed(tabs) { idx, tab ->
                                val isSelected = idx == activeTabIndex
                                Surface(
                                    color = if (isSelected) Color(0xFF263248) else Color(0xFF1B2332),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp)
                                        .clickable {
                                            activeTabIndex = idx
                                            showTabsDialog = false
                                        }
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.padding(12.dp)
                                    ) {
                                        Text(if (isSelected) "🟢" else "⚪", fontSize = 10.sp)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = tab.title.ifBlank { "Thẻ mới" },
                                                color = Color.White,
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.Medium,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = if (tab.url.contains("newtab.html")) "newtab" else tab.url,
                                                color = Color(0xFF9CA3AF),
                                                fontSize = 11.sp,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                        if (tabs.size > 1) {
                                            IconButton(
                                                onClick = {
                                                    tabs.removeAt(idx)
                                                    if (activeTabIndex >= tabs.size) {
                                                        activeTabIndex = tabs.size - 1
                                                    }
                                                },
                                                modifier = Modifier.size(28.dp)
                                            ) {
                                                Text("✕", color = Color(0xFFEF4444), fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Button(
                            onClick = {
                                val newTab = BrowserTab(id = UUID.randomUUID().toString())
                                tabs.add(newTab)
                                activeTabIndex = tabs.size - 1
                                showTabsDialog = false
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("➕ Mở Thẻ Mới", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // 9. Dialog Cài Đặt (Settings)
        if (showSettingsDialog) {
            AlertDialog(
                onDismissRequest = { showSettingsDialog = false },
                containerColor = Color(0xFF131A26),
                title = { Text("⚙️ Cài đặt Zenith", color = Color.White, fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text("Công cụ tìm kiếm mặc định:", color = Color(0xFF9CA3AF), fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            val engines = listOf("google" to "Google", "coccoc" to "Cốc Cốc", "bing" to "Bing", "duckduckgo" to "DuckDuckGo")
                            engines.forEach { (key, label) ->
                                val isChosen = searchEngine == key
                                Surface(
                                    color = if (isChosen) Color(0xFF10B981) else Color(0xFF263248),
                                    shape = RoundedCornerShape(8.dp),
                                    modifier = Modifier.clickable {
                                        searchEngine = key
                                        prefs.edit().putString("search_engine", key).apply()
                                    }
                                ) {
                                    Text(label, color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                CookieManager.getInstance().removeAllCookies(null)
                                WebStorage.getInstance().deleteAllData()
                                activeTab?.webView?.clearCache(true)
                                activeTab?.webView?.clearHistory()
                                Toast.makeText(context, "🗑️ Đã xoá sạch bộ nhớ đệm và dữ liệu duyệt web", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("🗑️ Xóa Lịch Sử & Cache", fontSize = 13.sp)
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "Zenith Browser v1.0.0 (Mobile)\nTrình duyệt siêu nhẹ tối ưu RAM, chặn quảng cáo & bắt link tải video.",
                            color = Color(0xFF6B7280),
                            fontSize = 11.sp
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showSettingsDialog = false }) {
                        Text("Đóng", color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                    }
                }
            )
        }
    }
}

@Composable
fun SearchUrlDialog(
    initialText: String,
    searchEngine: String,
    onDismiss: () -> Unit,
    onNavigate: (String) -> Unit
) {
    var query by remember { mutableStateOf(initialText) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            color = Color(0xFF161E2E),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth().padding(8.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("🔍 Nhập URL hoặc tìm kiếm", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("vd: youtube.com, tin tức...", color = Color(0xFF6B7280)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
                    keyboardActions = KeyboardActions(onGo = {
                        if (query.isNotBlank()) onNavigate(query)
                    }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF10B981),
                        unfocusedBorderColor = Color(0xFF374151)
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("Lối tắt nhanh:", color = Color(0xFF9CA3AF), fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    val shortcuts = listOf(
                        "YouTube" to "https://m.youtube.com",
                        "Facebook" to "https://m.facebook.com",
                        "Báo Mới" to "https://baomoi.com",
                        "Google" to "https://google.com"
                    )
                    shortcuts.forEach { (name, url) ->
                        Surface(
                            color = Color(0xFF263248),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.clickable { onNavigate(url) }
                        ) {
                            Text(name, color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(onClick = onDismiss) {
                        Text("Hủy", color = Color(0xFF9CA3AF))
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { if (query.isNotBlank()) onNavigate(query) },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                    ) {
                        Text("Đi tới", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
