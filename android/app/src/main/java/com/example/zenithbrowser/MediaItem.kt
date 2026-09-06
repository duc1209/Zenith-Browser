package com.example.zenithbrowser

data class MediaItem(
    val title: String,
    val url: String,
    val type: String = "video",
    val quality: String = "HD",
    val ext: String = "mp4"
)
