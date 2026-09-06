package com.example.zenithbrowser

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.drawable.Icon
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import java.net.HttpURLConnection
import java.net.URL

class ZenithMediaService : Service {

    constructor() : super()

    private var mediaSession: MediaSession? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var currentTitle: String = "Zenith Browser"
    private var currentArtist: String = "YouTube"
    private var currentArtworkUrl: String = ""
    private var currentArtworkBitmap: Bitmap? = null
    private var currentPositionMs: Long = 0L
    private var currentDurationMs: Long = 0L
    private var isPlaying: Boolean = true
    private var downloadArtworkThread: Thread? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    companion object {
        const val CHANNEL_ID = "zenith_media_playback_channel_v2"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val ACTION_PLAY = "ACTION_PLAY"
        const val ACTION_PAUSE = "ACTION_PAUSE"
        const val ACTION_NEXT = "ACTION_NEXT"
        const val ACTION_PREV = "ACTION_PREV"
        const val ACTION_UPDATE = "ACTION_UPDATE"

        fun startOrUpdate(
            context: Context,
            title: String = "Zenith Browser",
            artist: String = "YouTube",
            artworkUrl: String = "",
            positionMs: Long = 0L,
            durationMs: Long = 0L,
            isPlaying: Boolean = true
        ) {
            val intent = Intent(context, ZenithMediaService::class.java).apply {
                action = ACTION_START
                putExtra("media_title", title)
                putExtra("media_artist", artist)
                putExtra("artwork_url", artworkUrl)
                putExtra("position_ms", positionMs)
                putExtra("duration_ms", durationMs)
                putExtra("is_playing", isPlaying)
            }
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {}
        }

        fun start(context: Context, title: String = "Đang phát âm thanh", isPlaying: Boolean = true) {
            startOrUpdate(context, title = title, isPlaying = isPlaying)
        }

        fun updateNotification(context: Context, title: String, isPlaying: Boolean) {
            startOrUpdate(context, title = title, isPlaying = isPlaying)
        }

        fun stop(context: Context) {
            val intent = Intent(context, ZenithMediaService::class.java).apply {
                action = ACTION_STOP
            }
            try {
                context.stopService(intent)
            } catch (e: Exception) {}
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "ZenithBrowser:MediaPlaybackWakeLock"
        ).apply {
            setReferenceCounted(false)
        }

        setupMediaSession()
    }

    private fun setupMediaSession() {
        mediaSession = MediaSession(this, "ZenithMediaSession").apply {
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() {
                    isPlaying = true
                    ZenithWebView.toggleMediaPlayback(true)
                    updatePlaybackState()
                    updateNotification()
                }

                override fun onPause() {
                    isPlaying = false
                    ZenithWebView.toggleMediaPlayback(false)
                    updatePlaybackState()
                    updateNotification()
                }

                override fun onSkipToNext() {
                    ZenithWebView.skipNext()
                }

                override fun onSkipToPrevious() {
                    ZenithWebView.skipPrevious()
                }

                override fun onSeekTo(pos: Long) {
                    currentPositionMs = pos
                    ZenithWebView.seekTo(pos / 1000.0)
                    updatePlaybackState()
                }

                override fun onStop() {
                    ZenithWebView.toggleMediaPlayback(false)
                    stopSelf()
                }
            })
            isActive = true
        }
    }

    private fun updatePlaybackState() {
        val state = if (isPlaying) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED
        val actions = PlaybackState.ACTION_PLAY or
                PlaybackState.ACTION_PAUSE or
                PlaybackState.ACTION_PLAY_PAUSE or
                PlaybackState.ACTION_SKIP_TO_NEXT or
                PlaybackState.ACTION_SKIP_TO_PREVIOUS or
                PlaybackState.ACTION_SEEK_TO or
                PlaybackState.ACTION_STOP

        val playbackState = PlaybackState.Builder()
            .setActions(actions)
            .setState(
                state,
                currentPositionMs,
                if (isPlaying) 1.0f else 0.0f,
                SystemClock.elapsedRealtime()
            )
            .build()

        mediaSession?.setPlaybackState(playbackState)
    }

    private fun updateMetadata() {
        val metadataBuilder = MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, currentArtist)

        if (currentDurationMs > 0) {
            metadataBuilder.putLong(MediaMetadata.METADATA_KEY_DURATION, currentDurationMs)
        }

        currentArtworkBitmap?.let {
            metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, it)
            metadataBuilder.putBitmap(MediaMetadata.METADATA_KEY_ART, it)
        }

        mediaSession?.setMetadata(metadataBuilder.build())
    }

    private fun loadArtworkAsync(urlStr: String) {
        if (urlStr.isBlank() || (urlStr == currentArtworkUrl && currentArtworkBitmap != null)) {
            return
        }
        currentArtworkUrl = urlStr
        downloadArtworkThread?.interrupt()
        downloadArtworkThread = Thread {
            try {
                val url = URL(urlStr)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.doInput = true
                connection.connect()
                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    val input = connection.inputStream
                    val bitmap = BitmapFactory.decodeStream(input)
                    input.close()
                    if (bitmap != null) {
                        currentArtworkBitmap = bitmap
                        mainHandler.post {
                            updateMetadata()
                            updateNotification()
                        }
                    }
                }
                connection.disconnect()
            } catch (e: Exception) {
                // Ignore interruption or network errors
            }
        }.apply { start() }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        when (action) {
            ACTION_STOP -> {
                ZenithWebView.toggleMediaPlayback(false)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PAUSE -> {
                isPlaying = false
                ZenithWebView.toggleMediaPlayback(false)
                updatePlaybackState()
                updateNotification()
                return START_STICKY
            }
            ACTION_PLAY -> {
                isPlaying = true
                ZenithWebView.toggleMediaPlayback(true)
                updatePlaybackState()
                updateNotification()
                return START_STICKY
            }
            ACTION_NEXT -> {
                ZenithWebView.skipNext()
                return START_STICKY
            }
            ACTION_PREV -> {
                ZenithWebView.skipPrevious()
                return START_STICKY
            }
            ACTION_START, ACTION_UPDATE -> {
                val title = intent?.getStringExtra("media_title")
                if (!title.isNullOrBlank()) {
                    currentTitle = title
                }
                val artist = intent?.getStringExtra("media_artist")
                if (!artist.isNullOrBlank()) {
                    currentArtist = artist
                }
                val artwork = intent?.getStringExtra("artwork_url")
                if (!artwork.isNullOrBlank()) {
                    loadArtworkAsync(artwork)
                }
                currentPositionMs = intent?.getLongExtra("position_ms", currentPositionMs) ?: currentPositionMs
                currentDurationMs = intent?.getLongExtra("duration_ms", currentDurationMs) ?: currentDurationMs
                isPlaying = intent?.getBooleanExtra("is_playing", isPlaying) ?: isPlaying
            }
        }

        if (isPlaying) {
            try {
                if (wakeLock?.isHeld != true) {
                    wakeLock?.acquire(2 * 60 * 60 * 1000L)
                }
            } catch (e: Exception) {}
        } else {
            try {
                if (wakeLock?.isHeld == true) {
                    wakeLock?.release()
                }
            } catch (e: Exception) {}
        }

        updatePlaybackState()
        updateMetadata()

        val notification = buildNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        return START_STICKY
    }

    private fun updateNotification() {
        val notification = buildNotification()
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val prevIntent = Intent(this, ZenithMediaService::class.java).apply { action = ACTION_PREV }
        val prevPendingIntent = PendingIntent.getService(
            this, 101, prevIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val toggleIntent = Intent(this, ZenithMediaService::class.java).apply {
            action = if (isPlaying) ACTION_PAUSE else ACTION_PLAY
        }
        val togglePendingIntent = PendingIntent.getService(
            this, 102, toggleIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val nextIntent = Intent(this, ZenithMediaService::class.java).apply { action = ACTION_NEXT }
        val nextPendingIntent = PendingIntent.getService(
            this, 103, nextIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = Intent(this, ZenithMediaService::class.java).apply { action = ACTION_STOP }
        val stopPendingIntent = PendingIntent.getService(
            this, 104, stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val prevAction = Notification.Action.Builder(
            Icon.createWithResource(this, android.R.drawable.ic_media_previous),
            "Lùi",
            prevPendingIntent
        ).build()

        val toggleAction = Notification.Action.Builder(
            Icon.createWithResource(this, if (isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play),
            if (isPlaying) "Tạm dừng" else "Phát tiếp",
            togglePendingIntent
        ).build()

        val nextAction = Notification.Action.Builder(
            Icon.createWithResource(this, android.R.drawable.ic_media_next),
            "Tiếp",
            nextPendingIntent
        ).build()

        val stopAction = Notification.Action.Builder(
            Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel),
            "Dừng",
            stopPendingIntent
        ).build()

        val mediaStyle = Notification.MediaStyle()
        mediaSession?.let {
            mediaStyle.setMediaSession(it.sessionToken)
        }
        mediaStyle.setShowActionsInCompactView(0, 1, 2) // Lùi (0), Tạm dừng/Phát (1), Tiếp (2)

        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        builder.setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(currentTitle.ifBlank { "Zenith Browser" })
            .setContentText(currentArtist.ifBlank { "Đang phát âm thanh" })
            .setSubText("Zenith Browser")
            .setContentIntent(pendingIntent)
            .setDeleteIntent(stopPendingIntent)
            .setStyle(mediaStyle)
            .addAction(prevAction)       // index 0
            .addAction(toggleAction)     // index 1
            .addAction(nextAction)       // index 2
            .addAction(stopAction)       // index 3
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)

        val largeIcon = currentArtworkBitmap ?: try {
            BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
        } catch (e: Exception) {
            null
        }

        if (largeIcon != null) {
            builder.setLargeIcon(largeIcon)
        }

        return builder.build()
    }

    override fun onDestroy() {
        super.onDestroy()
        downloadArtworkThread?.interrupt()
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {}

        mediaSession?.let {
            it.isActive = false
            it.release()
        }
        mediaSession = null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Trình Phát Nhạc & Video",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Điều khiển âm thanh và video khi chạy ngầm hoặc tắt màn hình"
                setShowBadge(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
