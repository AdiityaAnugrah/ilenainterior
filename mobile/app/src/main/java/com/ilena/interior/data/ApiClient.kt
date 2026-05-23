package com.ilena.interior.data

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

// Token JWT disimpan in-memory (spike). Untuk produksi: pindah ke DataStore.
object Session {
    @Volatile
    var token: String? = null
}

object ApiClient {
    // Backend PRODUKSI (HTTPS) — tidak perlu jalanin backend lokal.
    // Untuk tes lokal: ganti ke "http://10.0.2.2:5000" (emulator) atau IP LAN (HP fisik).
    const val SERVER_URL = "https://ilenafurniture.net"

    private val authInterceptor = Interceptor { chain ->
        val builder = chain.request().newBuilder()
        Session.token?.let { builder.header("Authorization", "Bearer $it") }
        chain.proceed(builder.build())
    }

    private val client = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .build()

    val api: ApiService = Retrofit.Builder()
        .baseUrl("$SERVER_URL/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)

    // Thumbnail bisa berupa path relatif ("/uploads/x.jpg") atau URL penuh.
    fun imageUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http")) return path
        return SERVER_URL + if (path.startsWith("/")) path else "/$path"
    }
}
