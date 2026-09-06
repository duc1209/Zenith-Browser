package com.example.zenithbrowser

import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.widget.Toast
import java.io.File

object DownloadHelper {
    fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "zenith_download",
                "Zenith Downloads",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }
    fun downloadMedia(context: Context, title: String, url: String, ext: String) {
        try {
            val cleanTitle = title.replace(Regex("[^a-zA-Z0-9._ -]"), "_").trim()
            val fileName = if (cleanTitle.endsWith(".$ext", ignoreCase = true)) {
                cleanTitle
            } else {
                "${cleanTitle.ifBlank { "zenith_media" }}.$ext"
            }

            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("Zenith Browser đang tải về...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "Zenith/$fileName")
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)

                // Thêm cookie và User-Agent để tải video không bị chặn 403
                val cookies = CookieManager.getInstance().getCookie(url)
                if (!cookies.isNullOrBlank()) {
                    addRequestHeader("Cookie", cookies)
                }
                addRequestHeader("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36")
            }

            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            downloadManager.enqueue(request)

            Toast.makeText(context, "⬇️ Đang tải: $fileName\nLưu tại thư mục Download/Zenith", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(context, "❌ Lỗi bắt đầu tải: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }
}
