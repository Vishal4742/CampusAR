param(
    [int] $ApiLevel = 26
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$NativeRoot = Join-Path $ProjectRoot "native-engine"
$AndroidAppRoot = Join-Path $ProjectRoot "android-app\app"

$NdkRoot = $env:ANDROID_NDK_HOME
if (-not $NdkRoot) {
    $NdkRoot = $env:ANDROID_NDK_ROOT
}

if (-not $NdkRoot) {
    throw "ANDROID_NDK_HOME or ANDROID_NDK_ROOT must point to an installed Android NDK."
}

$ToolchainBin = Join-Path $NdkRoot "toolchains\llvm\prebuilt\windows-x86_64\bin"
if (-not (Test-Path $ToolchainBin)) {
    throw "Android NDK LLVM toolchain was not found at $ToolchainBin."
}

$Targets = @(
    @{
        RustTarget = "aarch64-linux-android"
        Abi = "arm64-v8a"
        LinkerEnv = "CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER"
        LinkerName = "aarch64-linux-android$ApiLevel-clang.cmd"
    },
    @{
        RustTarget = "armv7-linux-androideabi"
        Abi = "armeabi-v7a"
        LinkerEnv = "CARGO_TARGET_ARMV7_LINUX_ANDROIDEABI_LINKER"
        LinkerName = "armv7a-linux-androideabi$ApiLevel-clang.cmd"
    }
)

foreach ($Target in $Targets) {
    $LinkerPath = Join-Path $ToolchainBin $Target.LinkerName
    if (-not (Test-Path $LinkerPath)) {
        throw "Required linker was not found: $LinkerPath"
    }

    rustup target add $Target.RustTarget
    Set-Item -Path "env:$($Target.LinkerEnv)" -Value $LinkerPath
    cargo build --manifest-path (Join-Path $NativeRoot "Cargo.toml") --release --target $Target.RustTarget

    $OutDir = Join-Path $AndroidAppRoot "src\main\jniLibs\$($Target.Abi)"
    New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
    Copy-Item `
        -LiteralPath (Join-Path $NativeRoot "target\$($Target.RustTarget)\release\libcampusar_native.so") `
        -Destination (Join-Path $OutDir "libcampusar_native.so") `
        -Force
}

Write-Output "Android native libraries copied to android-app/app/src/main/jniLibs."
