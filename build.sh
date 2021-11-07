#!/bin/bash
set -euo pipefail
anchor build
mkdir -p app/src/lib/idl

KEYPAIRS="buildspace_gif_wall"

for file in $KEYPAIRS; do
  METADATA=$(solana address -k target/deploy/${file}-keypair.json)
  jq --arg id ${METADATA} '. + {"metadata":{ "address": $id }}' target/idl/${file}.json   > app/src/lib/idl/${file}.json
done

