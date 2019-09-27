#!/usr/bin/env bash

rootdir="$(dirname "${BASH_SOURCE[0]}")/.."

cd $rootdir
cd eth

echo "✨✨✨  MAKE SURE GANACHE IS RUNNING BEFORE RUNNING THIS SCRIPT   ✨✨✨"
echo "            "
echo "🚩 ➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖ 🚩"
echo "✨✨✨  Deploying ZeppelinOS Contracts to ganache   ✨✨✨"



npx zos session --network local --from 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1 --expires 3600
npx zos push
npx zos create Poap --init initialize --args '"POAP","The Proof of Attendance Protocol","https://poap.xyz",[]'