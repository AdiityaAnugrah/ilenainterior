# ILENA INTERIOR — App Android (Kotlin)

Project **APK Android native** untuk ILENA INTERIOR. Terpisah dari web (`frontend/`)
tapi memakai **backend yang sama** (`backend/` — Express + MySQL, REST + JWT).

> Status: **blueprint / belum di-scaffold.** Dokumen ini peta untuk *spike*
> (pembuktian konsep) sebelum komit pembangunan penuh.

---

## 1. Kenapa native (bukan sekadar web/PWA)

Web sudah responsif + bisa "Add to Home Screen". App native khusus dibangun untuk
hal yang **web tak bisa**, terutama:

- **AR (ARCore):** taruh furniture ukuran nyata di ruangan asli lewat kamera.
- Performa 3D lebih tinggi (Google Filament) + walk-through full-screen.
- Push notification (status pesanan, promo) & kehadiran di Play Store.

Kalau fitur di atas tidak jadi prioritas, opsi murah = bungkus web sebagai TWA.
Native dipilih justru untuk **AR sebagai fitur penjualan**.

---

## 2. Tujuan spike (1–2 minggu)

Membuktikan dua hal paling berisiko sebelum komit penuh:

1. **Reuse backend** dari Android (login JWT + tarik data).
2. **3D native** (load `.glb` + render scene) — dan satu uji **AR** menempel objek.

### Definition of Done (spike dianggap berhasil bila):
- [ ] Login pakai akun yang sama dengan web (JWT dari `/api/auth/login`).
- [ ] Daftar katalog tampil dari `/api/products` (nama, harga, thumbnail).
- [ ] Buka **satu** proyek tersimpan (`/api/projects/:id`) dan render furniture-nya
      di scene 3D (Filament/SceneView) dari aset `.glb`.
- [ ] Uji ARCore: tempel satu objek `.glb` ke bidang lantai terdeteksi.

Kalau langkah 3–4 terasa lancar → lanjut ke pembangunan bertahap (lihat §6).

---

## 3. Tech stack

| Lapis            | Pilihan |
|------------------|---------|
| Bahasa & UI      | Kotlin + Jetpack Compose |
| Networking       | Retrofit + OkHttp (atau Ktor Client) + kotlinx.serialization |
| Gambar           | Coil |
| 3D               | **Google Filament** atau **SceneView-Android** (Filament + ARCore) |
| AR               | ARCore (lewat SceneView) |
| Penyimpanan token| DataStore (JWT) |
| Arsitektur       | MVVM + Repository, DI pakai Hilt |

Minimal: `minSdk 24+` (ARCore butuh perangkat yang didukung; fitur AR di-gate runtime).

---

## 4. Reuse dari backend (endpoint yang dipakai)

Tidak ada perubahan backend yang diperlukan untuk spike. Endpoint inti:

| Fitur            | Endpoint (lihat `backend/src/routes/`) |
|------------------|----------------------------------------|
| Login / register | `POST /api/auth/login`, `POST /api/auth/register` |
| Profil           | `GET /api/auth/me` |
| Katalog          | `GET /api/products?limit=&search=&category=` |
| Detail produk    | `GET /api/products/:id` |
| Proyek           | `GET /api/projects`, `GET /api/projects/:id`, `POST/PUT /api/projects` |
| Setting WA       | `GET /api/wallpapers/settings/whatsapp` |

**Model data lintas platform:** proyek disimpan sebagai JSON `room_config` +
`items[]` (PlacedItem) — **format sama dengan web**. Artinya proyek yang dibuat
di web bisa dibuka di Android dan sebaliknya. Definisi tipe ada di
`frontend/store/editorStore.ts` (RoomConfig, PlacedItem) — jadikan acuan saat
bikin data class Kotlin-nya.

**Aset 3D:** file `.glb` produk sama persis dengan yang dipakai web.

> Catatan: pastikan backend mengizinkan akses dari app (JWT via header
> `Authorization: Bearer`, bukan cookie). CORS tidak relevan untuk klien native.

---

## 5. Struktur modul (rencana, package `com.ilena.interior`)

```
mobile/
├── README.md                 # dokumen ini
└── (akan di-scaffold via Android Studio)
    app/
      src/main/java/com/ilena/interior/
        ├── IlenaApp.kt                 # Application + Hilt
        ├── MainActivity.kt             # host Compose + NavHost
        ├── core/
        │   ├── network/                # Retrofit, interceptor JWT
        │   ├── auth/                   # TokenStore (DataStore)
        │   └── model/                  # RoomConfig, PlacedItem, Product (mirror web)
        ├── feature/
        │   ├── auth/                   # login/register (UI + ViewModel)
        │   ├── catalog/                # daftar + detail produk
        │   ├── projects/               # daftar proyek
        │   ├── viewer3d/               # render proyek (Filament/SceneView)
        │   └── ar/                     # mode AR (ARCore) — fitur pembeda
        └── ui/theme/                   # warna/tipografi (samakan dgn brand stone/warm)
        src/main/assets/models/         # .glb (atau diunduh dari backend)
```

Tahap spike cukup isi: `core/network`, `core/auth`, `core/model`,
`feature/auth`, `feature/catalog`, `feature/viewer3d`, lalu uji `feature/ar`.

---

## 6. Roadmap setelah spike (kalau lanjut)

1. **Browsing + auth + projects** (risiko rendah) — paritas dasar dgn web.
2. **Editor 2D** — Compose Canvas + gesture (drag, pan, pinch). Port logika murni
   (collision OBB/SAT, clamp, auto-place) dari `frontend/components/planner/Canvas2D.tsx`.
3. **3D + walk-through** — Filament: bangun lantai/dinding/langit-langit + orbit & first-person.
4. **AR** — ARCore: deteksi bidang, tempel furniture skala nyata, kirim ke WhatsApp.
5. **Rilis Play Store** → setelah produksi, arahkan tombol di `/iklan` (web) ke unduh APK.

---

## 7. Cara mulai (saat siap scaffold)

1. Buka **Android Studio** → New Project → *Empty Activity (Compose)*, package
   `com.ilena.interior`, lokasi folder ini (`mobile/`).
2. Tambah dependency: Retrofit, OkHttp, kotlinx.serialization, Coil, Hilt,
   serta **Filament** (`com.google.android.filament:filament-android`,
   `...:gltfio-android`, `...:filament-utils-android`) atau **SceneView**
   (`io.github.sceneview:arsceneview`).
3. Set `BASE_URL` ke server backend (lokal: `http://10.0.2.2:5000` untuk emulator).
4. Implement urutan Definition of Done di §2.
