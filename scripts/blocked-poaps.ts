import { ClaimQR, Layer, TokenInfo } from './src/types';
import { Contract, Wallet } from 'ethers';
import getEnv from './src/envs';
import { getABI, getHelperSigner, mintToken } from './src/eth/helpers';
import poapGraph from './src/plugins/thegraph-utils';

import dotenv from 'dotenv';
import pgPromise from 'pg-promise';

dotenv.config();

const db = pgPromise()({
  host: process.env.DB_INSTANCE_CONNECTION_NAME || 'localhost',
  user: process.env.DB_USER || 'poap',
  password: process.env.DB_PASSWORD || 'poap',
  database: process.env.DB_DATABASE || 'poap_dev',
});

async function getDelegatedClaims(limit: number): Promise<null | ClaimQR[]> {
  return db.manyOrNone<ClaimQR>(
    'SELECT * FROM qr_claims WHERE delegated_signed_message IS NOT NULL AND tx_hash IS NULL ORDER BY id DESC LIMIT ${limit};',
    {limit}
  );
}

async function updateBlockedQrClaim(qrHash: string, tx_hash: string, signer: string) {

  const res = await db.result('UPDATE qr_claims SET tx_hash=${tx_hash}, signer=${signer} WHERE qr_hash = ${qrHash}',
    {
      tx_hash,
      signer,
      qrHash
    });
  return res.rowCount === 1;
}

async function main() {

  let signerWallet: Wallet;
  let gasPrice: number = 0;

  let stats = {
    claimed: 0,
    hasIt: 0,
    toMint: 0,
    errors: [''],
    lastQr: ''
  };

  const qty = 3;
  const delegatedQRs = await getDelegatedClaims(qty);
  if (!delegatedQRs){
    console.log("No delegated QRs were found");
    return;
  }

  const totalQRs = delegatedQRs.length;
  const env = getEnv({layer: Layer.layer1});

  function printStats(counter: number) {
    console.log('Mint: ', stats.toMint, ' - Claimed: ', stats.claimed, ' - Has it: ', stats.hasIt);
    console.log('Errors: ', stats.errors);
    console.log('Last QR: ', stats.lastQr);
    console.log('Processed: ', counter * 100 / totalQRs, '%');
    console.log('');
  }

  const helperWallet = await getHelperSigner(gasPrice, {layer: Layer.layer1});
  signerWallet = helperWallet ? helperWallet : env.poapAdmin;

  const delegatedContract = new Contract(
    "0xAac2497174f2Ec4069A98375A67D798db8a05337",
    getABI('PoapDelegatedMint'),
    signerWallet
  );

  let ctr = 0;
  for (const delegatedQR of delegatedQRs) {
    ctr += 1;
    console.log('---------');
    console.log('Starting loop: ', ctr);
    stats.lastQr = delegatedQR.qr_hash;

    const was_processed = await delegatedContract.functions.processed(delegatedQR.delegated_signed_message);
    let alreadyMinted = false;
    if(was_processed || !delegatedQR.beneficiary) {
      stats.claimed += 1;
      await updateBlockedQrClaim(
        delegatedQR.qr_hash,
        `0xfake_${delegatedQR.qr_hash}`,
        ''
      );
      printStats(ctr);
      continue;
    }

    const tokens = await poapGraph.getAllTokens(delegatedQR.beneficiary);
    if (tokens.find((token: TokenInfo) => delegatedQR.event === token.event)) {
      alreadyMinted = true;
    }

    if (!alreadyMinted) {
      stats.toMint += 1;
      const tx = await mintToken(delegatedQR.event_id, delegatedQR.beneficiary, false, {layer: Layer.layer2})
      // If the transaction fail
      if(!tx){
        console.log(`Error in mintToken QR HASH:${delegatedQR.qr_hash}`);
        stats.errors.push(delegatedQR.qr_hash);
        continue;
      }
      const tx_hash = tx.hash;
      const signer = tx.from;

      await updateBlockedQrClaim(
        delegatedQR.qr_hash,
        tx_hash,
        signer
      );
    } else {
      stats.hasIt += 1;
    }
    printStats(ctr);
  }

}

main().catch(err => {
  console.error('Failed', err);
});
