package com.campusar.app.model

data class Destination(
    val id: String,
    val label: String,
    val category: String,
    val point: GeoPoint,
    val floor: Int,
    val temporary: Boolean,
)
