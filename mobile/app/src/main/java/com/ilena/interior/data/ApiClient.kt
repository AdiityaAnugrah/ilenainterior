package com.ilena.interior.data

import com.ilena.interior.BuildConfig
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
    private val serverUrl = BuildConfig.API_BASE_URL.trimEnd('/')

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
        .baseUrl("$serverUrl/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)

    // Thumbnail bisa berupa path relatif ("/uploads/x.jpg") atau URL penuh.
    fun imageUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http")) return path
        return serverUrl + if (path.startsWith("/")) path else "/$path"
    }
}
