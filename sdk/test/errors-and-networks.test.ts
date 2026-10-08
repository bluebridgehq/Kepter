import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { contractErrorCode, ERROR_MESSAGES, explainError } from "../src/errors.ts";
import { TESTNET } from "../src/networks.ts";

test("contract error codes are found in SDK errors", () => {
  const error = new Error("HostError: Error(Contract, #13)\nEvent log ...");
  assert.equal(contractErrorCode(error), 13);
  assert.equal(explainError(error), ERROR_MESSAGES[13]);
});

test("unknown errors get a safe message", () => {
  assert.equal(contractErrorCode(new Error("network down")), undefined);
  assert.equal(explainError(new Error("network down")), "Something went wrong. Please try again.");
  assert.equal(
    explainError(new Error("HostError: Error(Crypto, InvalidInput)")),
    "This QR code is not valid for this card.",
  );
});

test("every contract error has a message", () => {
  const source = readFileSync(
    new URL("../../contracts/kepter/src/errors.rs", import.meta.url),
    "utf8",
  );
  const codes = [...source.matchAll(/= (\d+),/g)].map((m) => Number(m[1]));
  assert.ok(codes.length > 0);
  for (const code of codes) {
    assert.ok(ERROR_MESSAGES[code], `missing message for error ${code}`);
  }
});

test("testnet settings match deployments/testnet.json", () => {
  const deployment = JSON.parse(
    readFileSync(new URL("../../deployments/testnet.json", import.meta.url), "utf8"),
  );
  assert.equal(TESTNET.contractId, deployment.contract_id);
  assert.equal(TESTNET.usdcContractId, deployment.asset_contract_id);
  assert.equal(TESTNET.usdcAsset, deployment.asset);
});
