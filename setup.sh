#!/usr/bin/env bash
set -euo pipefail
echo "[1/3] Flutter deps"
cd app && flutter pub get && cd ..
echo "[2/3] (Optional) Generate FRB bindings"
echo "flutter_rust_bridge_codegen --rust-input core/src/lib.rs --dart-output app/lib/ffi/bridge_generated.dart --class-name FocusCore"
echo "[3/3] Done"
