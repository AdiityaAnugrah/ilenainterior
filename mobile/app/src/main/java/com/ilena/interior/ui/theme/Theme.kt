package com.ilena.interior.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Web ILENA bertema terang saja — app mengikuti, brand konsisten (tanpa dynamic color).
private val IlenaLightColors = lightColorScheme(
    primary = Stone900,
    onPrimary = Stone50,
    secondary = Warm500,
    onSecondary = Color.White,
    tertiary = Warm600,
    onTertiary = Color.White,
    background = Stone50,
    onBackground = Stone900,
    surface = Color.White,
    onSurface = Stone900,
    surfaceVariant = Stone100,
    onSurfaceVariant = Stone600,
    outline = Stone300,
    outlineVariant = Stone200,
)

@Composable
fun ILENAINTERIORTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = IlenaLightColors,
        typography = Typography,
        content = content,
    )
}
