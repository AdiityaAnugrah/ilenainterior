package com.ilena.interior.data

// Body & response login (lihat backend/src/routes/auth.js)
data class LoginRequest(val email: String, val password: String)
data class LoginResponse(val token: String, val user: User)

data class User(
    val id: Int,
    val name: String,
    val email: String,
    val role: String? = null,
    val avatar: String? = null,
)

// /api/products mengembalikan { data: [...], pagination: {...} }
data class ProductsResponse(val data: List<Product> = emptyList())

// price dimodelkan String karena MySQL DECIMAL bisa terkirim sebagai string.
data class Product(
    val id: Int,
    val name: String,
    val category: String? = null,
    val price: String? = null,
    val thumbnail: String? = null,
)
