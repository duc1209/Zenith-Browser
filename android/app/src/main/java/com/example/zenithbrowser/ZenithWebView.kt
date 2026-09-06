package com.example.zenithbrowser

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import android.webkit.WebView
import java.util.Collections
import java.util.WeakHashMap

class ZenithWebView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : WebView(context, attrs, defStyleAttr) {

    companion object {
        val activeWebViews = Collections.newSetFromMap(WeakHashMap<ZenithWebView, Boolean>())
        var currentActiveTitle: String = "Zenith Browser"
        var currentMediaTitle: String = "Zenith Browser"
        var currentMediaArtist: String = "YouTube"
        var currentArtworkUrl: String = ""
        var currentPositionMs: Long = 0L
        var currentDurationMs: Long = 0L
        var isAnyMediaPlaying: Boolean = false
        var isUserPaused: Boolean = false

        private fun evalOnAll(js: String) {
            activeWebViews.forEach { wv ->
                wv.post {
                    try {
                        wv.evaluateJavascript(js, null)
                    } catch (e: Exception) {}
                }
            }
        }

        fun toggleMediaPlayback(play: Boolean) {
            isAnyMediaPlaying = play
            isUserPaused = !play
            val js = "if (typeof window.__zenith_toggle_playback === 'function') { window.__zenith_toggle_playback($play); }"
            evalOnAll(js)
        }

        fun seekTo(seconds: Double) {
            currentPositionMs = (seconds * 1000).toLong()
            val js = "if (typeof window.__zenith_seek_to === 'function') { window.__zenith_seek_to($seconds); }"
            evalOnAll(js)
        }

        fun skipNext() {
            val js = "if (typeof window.__zenith_skip_next === 'function') { window.__zenith_skip_next(); }"
            evalOnAll(js)
        }

        fun skipPrevious() {
            val js = "if (typeof window.__zenith_skip_previous === 'function') { window.__zenith_skip_previous(); }"
            evalOnAll(js)
        }

        fun setAllBackground(isBg: Boolean) {
            val js = "if (typeof window.__zenith_set_background === 'function') { window.__zenith_set_background($isBg); } else { window.__zenith_is_background = $isBg; }"
            evalOnAll(js)
        }
    }

    init {
        isFocusable = true
        isFocusableInTouchMode = true
        activeWebViews.add(this)
    }

    var keepAliveInBackground: Boolean = true

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action == MotionEvent.ACTION_DOWN) {
            if (!hasFocus()) {
                requestFocus()
            }
        }
        return super.onTouchEvent(event)
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        if (keepAliveInBackground) {
            // Luôn báo cho Chromium engine là cửa sổ vẫn đang HIỂN THỊ (VISIBLE)
            // Ngăn Chromium tự động ngắt âm thanh / video khi sang app khác hoặc chơi game
            super.onWindowVisibilityChanged(View.VISIBLE)
        } else {
            super.onWindowVisibilityChanged(visibility)
        }
    }

    override fun dispatchWindowVisibilityChanged(visibility: Int) {
        if (keepAliveInBackground) {
            super.dispatchWindowVisibilityChanged(View.VISIBLE)
        } else {
            super.dispatchWindowVisibilityChanged(visibility)
        }
    }

    override fun onVisibilityChanged(changedView: View, visibility: Int) {
        if (keepAliveInBackground) {
            super.onVisibilityChanged(changedView, View.VISIBLE)
        } else {
            super.onVisibilityChanged(changedView, visibility)
        }
    }

    override fun onPause() {
        if (keepAliveInBackground) {
            // Không gọi super.onPause() để Chromium không đóng băng media decoders
            return
        }
        super.onPause()
    }

    override fun pauseTimers() {
        if (keepAliveInBackground) {
            // Không pause JavaScript timers
            return
        }
        super.pauseTimers()
    }

    override fun destroy() {
        activeWebViews.remove(this)
        super.destroy()
    }
}

