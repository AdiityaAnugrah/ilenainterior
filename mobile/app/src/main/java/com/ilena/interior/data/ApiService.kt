package com.ilena.interior.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): LoginResponse

    @GET("api/products")
    suspend fun getProducts(
        @Query("limit") limit: Int = 50,
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
    ): ProductsResponse
}
