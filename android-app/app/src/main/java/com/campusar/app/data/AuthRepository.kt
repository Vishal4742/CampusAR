package com.campusar.app.data

import android.content.Context
import com.campusar.app.db.CampusDatabase
import com.campusar.app.db.entity.UserSessionEntity
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

data class AuthResult(
    val userId: String,
    val accessToken: String,
    val refreshToken: String,
    val userJson: String,
    val expiresAt: Long,
)

class AuthRepository(private val context: Context) {

    private val db: CampusDatabase get() = CampusDatabase.getInstance(context)

    fun getActiveSession(): UserSessionEntity? {
        val session = db.sessionDao().getSession() ?: return null
        if (System.currentTimeMillis() >= session.expiresAt) {
            db.sessionDao().deleteAll()
            return null
        }
        return session
    }

    fun clearSession() {
        db.sessionDao().deleteAll()
    }

    fun registerVisitor(fullName: String, email: String? = null, baseUrl: String): AuthResult? {
        val body = JSONObject().apply {
            put("fullName", fullName)
            email?.takeIf { it.isNotBlank() }?.let { put("email", it) }
        }
        return post(baseUrl, "/api/v1/auth/register/visitor", body)
    }

    fun login(email: String, baseUrl: String): AuthResult? {
        val body = JSONObject().apply { put("email", email) }
        return post(baseUrl, "/api/v1/auth/login", body)
    }

    private fun post(baseUrl: String, path: String, body: JSONObject): AuthResult? {
        return try {
            val url = URL("$baseUrl$path")
            val connection = url.openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = TIMEOUT_MILLIS
                connection.readTimeout = TIMEOUT_MILLIS
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")

                connection.outputStream.write(body.toString().toByteArray(Charsets.UTF_8))

                val responseCode = connection.responseCode
                if (responseCode !in 200..299) return null

                val json = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                val root = JSONObject(json)
                val tokens = root.getJSONObject("tokens")
                val user = root.getJSONObject("user")
                val accessToken = tokens.getString("accessToken")
                val refreshToken = tokens.getString("refreshToken")
                val expiresIn = tokens.optInt("expiresIn", 3600)

                val result = AuthResult(
                    userId = user.getString("id"),
                    accessToken = accessToken,
                    refreshToken = refreshToken,
                    userJson = user.toString(),
                    expiresAt = System.currentTimeMillis() + expiresIn * 1000L,
                )

                db.sessionDao().upsertSession(
                    UserSessionEntity(
                        userId = result.userId,
                        accessToken = result.accessToken,
                        refreshToken = result.refreshToken,
                        userJson = result.userJson,
                        expiresAt = result.expiresAt,
                    )
                )

                result
            } finally {
                connection.disconnect()
            }
        } catch (_: Exception) {
            null
        }
    }

    fun getAccessToken(): String? {
        val session = db.sessionDao().getSession() ?: return null
        if (System.currentTimeMillis() >= session.expiresAt) {
            db.sessionDao().deleteAll()
            return null
        }
        return session.accessToken
    }

    private companion object {
        const val TIMEOUT_MILLIS = 10_000
    }
}
