#!/usr/bin/env bash
# 需求驱动测试：先跑纯逻辑（无浏览器），再跑浏览器集成测试（CDP）
set -e
cd "$(dirname "$0")"
echo "== 1/2 纯逻辑测试 =="
node logic.test.js
echo
echo "== 2/2 浏览器集成测试 =="
node browser.test.js
echo
echo "ALL TESTS PASSED"