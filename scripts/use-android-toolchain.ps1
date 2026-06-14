$ToolchainRoot = "C:\tmp\campusar-toolchain"
$JdkHome = Join-Path $ToolchainRoot "jdk17\jdk-17.0.19+10"
$AndroidHome = Join-Path $ToolchainRoot "android-sdk"
$GradleHome = Join-Path $ToolchainRoot "gradle\gradle-8.10.2"
$NdkHome = Join-Path $AndroidHome "ndk\27.2.12479018"
$WorkspaceRoot = Split-Path $PSScriptRoot -Parent
$GradleUserHome = Join-Path $WorkspaceRoot ".gradle-user-home"

if (-not (Test-Path $JdkHome)) {
    throw "JDK 17 was not found at $JdkHome"
}
if (-not (Test-Path $AndroidHome)) {
    throw "Android SDK was not found at $AndroidHome"
}
if (-not (Test-Path $GradleHome)) {
    throw "Gradle was not found at $GradleHome"
}
if (-not (Test-Path $NdkHome)) {
    throw "Android NDK was not found at $NdkHome"
}

$env:JAVA_HOME = $JdkHome
$env:ANDROID_HOME = $AndroidHome
$env:ANDROID_SDK_ROOT = $AndroidHome
$env:ANDROID_NDK_HOME = $NdkHome
$env:ANDROID_NDK_ROOT = $NdkHome
$env:GRADLE_USER_HOME = $GradleUserHome
$env:Path = "$JdkHome\bin;$GradleHome\bin;$AndroidHome\platform-tools;$env:Path"

New-Item -ItemType Directory -Force -Path $GradleUserHome | Out-Null

Write-Output "JAVA_HOME=$env:JAVA_HOME"
Write-Output "ANDROID_HOME=$env:ANDROID_HOME"
Write-Output "ANDROID_NDK_HOME=$env:ANDROID_NDK_HOME"
Write-Output "Gradle=$GradleHome"
Write-Output "GRADLE_USER_HOME=$env:GRADLE_USER_HOME"
