plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "com.campusar.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.campusar.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-phase1"
    }

    buildFeatures {
        viewBinding = true
    }

    sourceSets {
        getByName("main") {
            java.srcDirs("src/main/java")
        }
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // CameraX for QR scanning
    val cameraXVersion = "1.4.0"
    implementation("androidx.camera:camera-core:$cameraXVersion")
    implementation("androidx.camera:camera-camera2:$cameraXVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraXVersion")
    implementation("androidx.camera:camera-view:$cameraXVersion")

    // ML Kit barcode scanning
    implementation("com.google.mlkit:barcode-scanning:17.3.0")

    // Lifecycle (required by CameraX)
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-common:2.8.7")
}

tasks.register<Exec>("cargoTestNative") {
    group = "verification"
    description = "Runs host Rust tests for the CampusAR native engine."
    workingDir = file("../../native-engine")
    commandLine("cargo", "test")
}
