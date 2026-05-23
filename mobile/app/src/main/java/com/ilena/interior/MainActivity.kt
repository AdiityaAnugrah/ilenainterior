package com.ilena.interior

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import com.ilena.interior.ui.CatalogScreen
import com.ilena.interior.ui.LoginScreen
import com.ilena.interior.ui.theme.ILENAINTERIORTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ILENAINTERIORTheme {
                App()
            }
        }
    }
}

@Composable
private fun App() {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        // Navigasi sederhana untuk spike: null = belum login → tampil Login.
        var userName by rememberSaveable { mutableStateOf<String?>(null) }
        if (userName == null) {
            LoginScreen(onLoggedIn = { userName = it })
        } else {
            CatalogScreen(userName = userName!!)
        }
    }
}
