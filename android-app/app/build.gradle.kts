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
}

tasks.register<Exec>("cargoTestNative") {
    group = "verification"
    description = "Runs host Rust tests for the CampusAR native engine."
    workingDir = file("../../native-engine")
    commandLine("cargo", "test")
}
