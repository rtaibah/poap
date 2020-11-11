import { Contract, ContractTransaction, getDefaultProvider, utils, Wallet } from 'ethers';
import { verifyMessage } from 'ethers/utils';
import { hash, sign, TypedValue } from 'eth-crypto';
import { differenceInDays, isFuture } from 'date-fns';
import { readFileSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import poapGraph from '../plugins/thegraph-utils';
import {
  createTask,
  getAvailableHelperSigners,
  getEvent,
  getEvents,
  getLastSignerTransaction,
  getMigrationTask,
  getPoapSettingByName, getQrByUserInput,
  getSigner,
  getTransaction,
  saveTransaction,
  updateBumpedQrClaim,
  updateTransactionStatus,
} from '../db';
import getEnv from '../envs';
import { Poap } from './Poap';
import { Address, Claim, Layer, OperationType, Services, Signer, TokenInfo, TransactionStatus } from '../types';
import { AddressZero } from 'ethers/constants';

const Logger = pino();
const ABI_DIR = join(__dirname, '../../abi');

export function getABI(name: string) {
  return JSON.parse(readFileSync(join(ABI_DIR, `${name}.json`)).toString());
}

const POAP_ABI = getABI('Poap');

const POAP_DELIVERY_ABI = getABI('PoapDelivery');

export function getContract(wallet: Wallet, extraParams?: any): Poap {
  const env = getEnv(extraParams);
  return new Contract(env.poapAddress, POAP_ABI, wallet) as Poap;
}

/**
 * Get an available helper signer in order to sign a new requested transaction
 */
export async function getHelperSigner(requiredBalance: number = 0, extraParams?: any): Promise<null | Wallet> {
  const env = getEnv(extraParams);

  let signers: null | Signer[] = await getAvailableHelperSigners(env.layer);

  let wallet: null | Wallet = null;

  if (signers) {
    signers = await Promise.all(signers.map(signer => getAddressBalance(signer, extraParams)));
    signers = signers.map(signer => {
      return {
        ...signer,
        pending_tx: parseInt(`${signer.pending_tx}`, 10)
      }
    });
    let sorted_signers: Signer[] = signers.sort((a, b) => {
      if (a.pending_tx === b.pending_tx) {
        return parseInt(b.balance, 10) - parseInt(a.balance, 10);
      } else if (a.pending_tx < b.pending_tx) {
        return -1;
      }
      return 1;
    });

    for (let signer of sorted_signers) {
      if (!wallet) {
        if (+signer.balance > requiredBalance) {
          wallet = env.poapHelpers[signer.signer.toLowerCase()];
        }
      }
    }
  }
  return wallet;
}

/**
 * Get an available helper signer in order to sign a new requested transaction
 */
export async function getSignerWallet(address: Address, extraParams?: any): Promise<Wallet> {
  const env = getEnv(extraParams);
  const signer: null | Signer = await getSigner(address, env.layer);
  if (signer) {
    const wallet = env.poapHelpers[signer.signer.toLowerCase()];
    return wallet;
  }
  throw new Error('Signer was not found');
}

/**
 * Estimate gas cost for mintTokenBatch() call.
 * We don't rely on estimateGas() since it fails.
 *
 * The estimated is based on empirical tests and it's
 * also +50% of the actual empirical estimate
 * @param n number of addresses
 */
export function estimateMintingGas(n: number) {
  const delta = 136907;
  const baseCost = 35708;
  return Math.ceil((baseCost + n * delta) * 1.5);
}

/**
 * Get current gas price from Poap Settings singleton
 */
export async function getCurrentGasPrice(address: string, layer?: Layer) {
  // Default gas price (to be used only when no gas-price configuration detected)
  let gasPrice = 5e9;

  // Get defined gasPrice for selected signer
  let signer: Signer | null = await getSigner(address, layer);
  if (signer) {
    if (signer.gas_price) {
      return parseInt(signer.gas_price);
    }
  }

  // If signer was not defined, then get gas-price value from db Poap Setting variable
  let gasPriceSetting = await getPoapSettingByName('gas-price');
  if (gasPriceSetting) {
    gasPrice = parseInt(gasPriceSetting.value);
  }

  return gasPrice;
}

export async function getTxObj(onlyAdminSigner: boolean, extraParams?: any) {
  const env = getEnv(extraParams);
  let estimate_mint_gas = 1;
  let signerWallet: Wallet;
  let gasPrice: number = 0;
  if (extraParams && extraParams.gas_price) {
    gasPrice = extraParams.gas_price
  }

  // Use extraParams signer if it's specified in extraParams
  if (extraParams && extraParams.signer) {
    signerWallet = await getSignerWallet(extraParams.signer.toLowerCase(), extraParams);
  } else if (onlyAdminSigner) {
    signerWallet = env.poapAdmin;
  } else {
    const helperWallet = await getHelperSigner(gasPrice, extraParams);
    signerWallet = helperWallet ? helperWallet : env.poapAdmin;
  }

  const contract = getContract(signerWallet, extraParams);

  if (gasPrice == 0) {
    gasPrice = await getCurrentGasPrice(signerWallet.address, env.layer);
  }

  if (extraParams && extraParams.estimate_mint_gas) {
    estimate_mint_gas = extraParams.estimate_mint_gas
  }

  const transactionParams: any = {
    gasLimit: estimateMintingGas(estimate_mint_gas),
    gasPrice: Number(gasPrice),
  };

  // if (extraParams && extraParams.nonce) {
  if (extraParams && 'nonce' in extraParams && Number.isFinite(extraParams.nonce) && extraParams.nonce >= 0) {
    transactionParams.nonce = extraParams.nonce;
  } else  {
    const lastTransaction = await getLastSignerTransaction(signerWallet.address, env.layer);
    if (lastTransaction && lastTransaction.nonce > 0) {
      console.log(`>> Last tx: ${lastTransaction.tx_hash} (${lastTransaction.nonce})`);
      transactionParams.nonce = lastTransaction.nonce + 1
    }
  }

  return {
    signerWallet: signerWallet,
    contract: contract,
    transactionParams: transactionParams,
  };

}

async function processTransaction(tx: ContractTransaction, txObj: any, operation: string, args: string, awaitTx: boolean, extraParams: any) {
  let saveTx: boolean = true;
  let layer: Layer = Layer.layer1;
  if (!tx.hash) return;
  if (extraParams && 'original_tx' in extraParams) {
    if (extraParams.original_tx.toLowerCase() === tx.hash.toLowerCase()) {
      saveTx = false;
    }
  }

  if (extraParams && extraParams.layer) {
    layer = extraParams.layer;
  }

  if (saveTx) {
    await saveTransaction(
      tx.hash,
      tx.nonce,
      operation,
      args,
      txObj.signerWallet.address,
      TransactionStatus.pending,
      txObj.transactionParams.gasPrice.toString(),
      layer
    );
  }

  console.log(`${operation}: Transaction: ${tx.hash}`);
  // The operation is NOT complete yet; we must wait until it is mined
  if (awaitTx) {
    await tx.wait();
  }
  console.log(`${operation}: Finished: ${tx.hash}`);
}

export async function mintToken(eventId: number, toAddr: Address, awaitTx: boolean = true, extraParams?: any): Promise<null | ContractTransaction> {
  let tx: ContractTransaction
  let txObj: any

  try {
    txObj = await getTxObj(false, extraParams);
    tx = await txObj.contract.functions.mintToken(eventId, toAddr, txObj.transactionParams);
  }
  catch (error) {
    console.error(error);
    return null;
  }

  await processTransaction(tx, txObj, OperationType.mintToken, JSON.stringify([eventId, toAddr]), awaitTx, extraParams);
  return tx
}

export async function mintEventToManyUsers(eventId: number, toAddr: Address[], awaitTx: boolean = true, extraParams?: any) {
  const txObj = await getTxObj(true, extraParams);
  const tx = await txObj.contract.functions.mintEventToManyUsers(eventId, toAddr, txObj.transactionParams);
  await processTransaction(tx, txObj, OperationType.mintEventToManyUsers, JSON.stringify([eventId, toAddr]), awaitTx, extraParams);
}

export async function mintUserToManyEvents(eventIds: number[], toAddr: Address, awaitTx: boolean = true, extraParams?: any): Promise<null | ContractTransaction> {
  const txObj = await getTxObj(true, extraParams);
  const tx = await txObj.contract.functions.mintUserToManyEvents(eventIds, toAddr, txObj.transactionParams);
  await processTransaction(tx, txObj, OperationType.mintUserToManyEvents, JSON.stringify({ eventIds, toAddr }), awaitTx, extraParams);
  return tx;
}

export async function mintDeliveryToken(contract: Address, index: number, recipient: Address, events: number[], proofs: string[], awaitTx: boolean = true, extraParams?: any): Promise<null | ContractTransaction> {
  let tx: ContractTransaction;
  let txObj: any;

  try {
    txObj = await getTxObj(false, {
      ...extraParams,
      estimate_mint_gas: events.length
    });
    // Instantiate the poap delivery contract
    const deliveryContract = new Contract(contract, POAP_DELIVERY_ABI, txObj.signerWallet);

    // const claimed = await deliveryContract.functions.claimed(recipient);
    // if (claimed) return null

    tx = await deliveryContract.functions.claim(index, recipient, events, proofs, txObj.transactionParams);
  }
  catch (error) {
    console.error(error);
    return null;
  }

  await processTransaction(
    tx,
    txObj,
    OperationType.mintDeliveryToken,
    JSON.stringify([contract, index, recipient, events, proofs]),
    awaitTx,
    extraParams
  );

  return tx;
}

export async function burnToken(tokenId: string | number, awaitTx: boolean = true, extraParams?: any): Promise<null | ContractTransaction> {
  const txObj = await getTxObj(true, extraParams);
  const tx = await txObj.contract.functions.burn(tokenId, txObj.transactionParams);
  await processTransaction(tx, txObj, OperationType.burnToken, tokenId.toString(), awaitTx, extraParams);
  return tx;
}

export async function migrateToken(tokenId: string): Promise<string | undefined> {
  const env = getEnv({layer: Layer.layer1});
  // Check if the migration task exists
  let task = await getMigrationTask(tokenId);
  // If exists: Return the signature
  if (task && task.task_data.signature) {
    return task.task_data.signature;
  }

  // Get the owner and the event
  let token: TokenInfo | null = null;
  try{
    // First try with The Graph
    token = await poapGraph.getTokenInfo(tokenId);
  } catch (e) {
    token = await getTokenInfo(tokenId);
  }

  // Check that it doesn't exist in L1 and that the owner is not 0x000
  if(token.layer == Layer.layer1 || token.owner == AddressZero) {
    return;
  }

  // Sign the message
  const params: TypedValue[] = [
    {type: "uint256", value: token.event.id},
    {type: "uint256", value: tokenId},
    {type: "address", value: token.owner}
  ];
  const message = signMessage(env.poapAdmin.privateKey, params);

  // Create a migration task
  await createTask(Services.migrationService, {
    eventId: token.event.id,
    tokenId: tokenId,
    owner: token.owner,
    signature: message,
    signer: env.poapAdmin.address,
  })

  // return the message signed
  return message
}

export async function bumpTransaction(hash: string, gasPrice: string, updateTx: boolean) {
  const transaction = await getTransaction(hash);
  if (!transaction) {
    throw new Error('Transaction was not found');
  }

  if (Number(transaction.gas_price) >= Number(gasPrice) && updateTx) {
    throw new Error('New gas price is not bigger than previous gas price');
  }

  // Parse available arguments saved in the database
  const txJSON = transaction.arguments.substr(0, 1) === '[' ? JSON.parse(transaction.arguments) : transaction.arguments;

  switch (transaction.operation) {
    case OperationType.burnToken: {
      const tokenId = parseInt(txJSON, 10)
      await burnToken(tokenId, false, {
        signer: transaction.signer,
        gas_price: gasPrice,
        nonce: transaction.nonce,
        original_tx: hash,
        layer: transaction.layer
      })
    }
    case OperationType.mintEventToManyUsers: {
      const [eventId, toAddresses] = txJSON
      await mintEventToManyUsers(eventId, toAddresses, false, {
        signer: transaction.signer,
        gas_price: gasPrice,
        nonce: transaction.nonce,
        estimate_mint_gas: toAddresses.length,
        original_tx: hash,
        layer: transaction.layer
      })
      break;
    }
    case OperationType.mintToken: {
      const [eventId, toAddr] = txJSON
      let new_tx = await mintToken(eventId, toAddr, false, {
        signer: transaction.signer,
        gas_price: gasPrice,
        nonce: transaction.nonce,
        original_tx: hash,
        layer: transaction.layer
      })
      if (new_tx && new_tx.hash) {
        await updateBumpedQrClaim(eventId, toAddr, transaction.signer, hash, new_tx.hash);
      }
      break;
    }
    case OperationType.mintUserToManyEvents: {
      const {eventIds, toAddr} = txJSON
      await mintUserToManyEvents(eventIds, toAddr, false, {
        signer: transaction.signer,
        gas_price: gasPrice,
        nonce: transaction.nonce,
        estimate_mint_gas: eventIds.length,
        original_tx: hash,
        layer: transaction.layer
      })
      break;
    }
    case OperationType.mintDeliveryToken: {
      const [contract, index, recipient, events, proofs] = txJSON
      await mintDeliveryToken(contract, index, recipient, events, proofs, false, {
        signer: transaction.signer,
        gas_price: gasPrice,
        nonce: transaction.nonce,
        estimate_mint_gas: events.length,
        original_tx: hash,
        layer: transaction.layer
      });
      break;
    }
    default: {
      throw new Error('Operation not supported');
    }
  }

  if (updateTx) {
    await updateTransactionStatus(hash, TransactionStatus.bumped);
  }
}

export async function getEmailTokens(email: string): Promise<TokenInfo[]> {
  const events = await getEvents();

  const getEvent = (id: number) => {
    const ev = events.find(e => e.id === id);
    if (!ev) {
      throw new Error(`Invalid EventId: ${id}`);
    }
    ev.supply = 1;
    return ev;
  };

  const tokens: TokenInfo[] = [];

  (await getQrByUserInput(email, false)).forEach(claim => {
    tokens.push({
      event: getEvent(claim.event_id),
      tokenId: '',
      owner: email,
    });
  });

  return tokens;
}


export async function getAllTokens(address: Address): Promise<TokenInfo[]> {
  const events = await getEvents();

  const getEvent = (id: number) => {
    const ev = events.find(e => e.id === id);
    if (!ev) {
      throw new Error(`Invalid EventId: ${id}`);
    }
    ev.supply = 1;
    return ev;
  };
  const tokens: TokenInfo[] = [];

  const addLayerTokens = async (layer: Layer, tokens: TokenInfo[]) => {
    const env = getEnv({layer});
    const contract = getContract(env.poapAdmin, {layer});
    const tokensAmount = (await contract.functions.balanceOf(address)).toNumber();
    for (let i = 0; i < tokensAmount; i++) {
      const { tokenId, eventId } = await contract.functions.tokenDetailsOfOwnerByIndex(address, i);
      // Check if the token is already in the array (prevents sending the same token two times)
      const token_in_array = tokens.find(array_token => {
        return array_token.tokenId === tokenId.toString()
      });
      if(!token_in_array){
        tokens.push({
          event: getEvent(eventId.toNumber()),
          tokenId: tokenId.toString(),
          owner: address,
        });
      }
    }
  }

  await addLayerTokens(Layer.layer1, tokens);
  await addLayerTokens(Layer.layer2, tokens);
  return tokens.sort((a:any, b:any) => {
    try{
      return new Date(b.event.start_date) > new Date(a.event.start_date) ? 1 : -1
    } catch (e) {
      return -1
    }
  })
}

export async function getAllEventIds(address: Address): Promise<number[]> {
  const env = getEnv();
  const contract = getContract(env.poapAdmin);
  const tokensAmount = (await contract.functions.balanceOf(address)).toNumber();

  const eventIds: number[] = [];
  for (let i = 0; i < tokensAmount; i++) {
    const tokenDetails = await contract.functions.tokenDetailsOfOwnerByIndex(address, i);
    eventIds.push(tokenDetails.eventId.toNumber());
  }
  return eventIds;
}

export async function getLayerTokenInfo(tokenId: string | number, layer: Layer): Promise<TokenInfo> {
  const env = getEnv({layer});
  const contract = getContract(env.poapAdmin, {layer});
  const eventId = await contract.functions.tokenEvent(tokenId);
  const owner = await contract.functions.ownerOf(tokenId);
  const event = await getEvent(eventId.toNumber());
  if (!event) {
    throw new Error('Invalid Event Id');
  }
  return {
    event,
    tokenId: tokenId.toString(),
    owner,
    layer,
  };
}

export async function getTokenInfo(tokenId: string | number): Promise<TokenInfo> {
  let token: TokenInfo;
  try {
    // First try L1
    token = await getLayerTokenInfo(tokenId, Layer.layer1);
  } catch (e) {
    token = await getLayerTokenInfo(tokenId, Layer.layer2);
  }
  return token
}

export async function isBurned(tokenId: string | number, layer: Layer =Layer.layer1): Promise<boolean> {
  let token: TokenInfo;
  token = await getLayerTokenInfo(tokenId, layer);
  return token.owner === AddressZero;
}

export async function getTokenImg(tokenId: string | number): Promise<null | string> {
  let image_url = 'https://www.poap.xyz/events/badges/POAP.png';
  try {
    const token = await poapGraph.getTokenInfo(tokenId)
    image_url = token.event.image_url
  } catch (e) {
    console.log('The Graph Query error');
  }
  return image_url;
}

export async function verifyClaim(claim: Claim): Promise<string | boolean> {
  const event = await getEvent(claim.eventId);

  if (!event) {
    throw new Error('Invalid Event Id');
  }

  Logger.info({ claim }, 'Claim for event: %d from: %s', claim.eventId, claim.claimer);

  const claimerMessage = JSON.stringify([claim.claimId, claim.eventId, claim.claimer, claim.proof]);

  Logger.info({ claimerMessage }, 'claimerMessage');

  const supposedClaimedAddress = verifyMessage(claimerMessage, claim.claimerSignature);

  if (supposedClaimedAddress !== claim.claimer) {
    console.log('invalid claimer signature');
    return false;
  }

  const proofMessage = JSON.stringify([claim.claimId, claim.eventId, claim.claimer]);
  Logger.info({ proofMessage }, 'proofMessage');

  return true;
}

export async function getAddressBalance(signer: Signer, extraParams?: any): Promise<Signer> {
  const env = getEnv(extraParams);
  let balance = await env.provider.getBalance(signer.signer);

  signer.balance = balance.toString();

  return signer;
}

export async function resolveName(name: string): Promise<string> {
  const mainnetProvider = getDefaultProvider('homestead');
  const resolvedAddress = await mainnetProvider.resolveName(name);
  return resolvedAddress
}

export async function lookupAddress(address: string): Promise<string> {
  const mainnetProvider = getDefaultProvider('homestead');
  const resolved = await mainnetProvider.lookupAddress(address);
  return resolved
}

export function validEmail(email: string) {
  const re = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  return re.test(String(email).toLowerCase());
}

export async function checkAddress(address: string): Promise<string | null> {
  let response: string | null = null;
  try {
    response = await utils.getAddress(address);
  }
  catch (error) {
    try {
      response = await resolveName(address)
    }
    catch (error) {
      return response;
    }
  }
  return response;
}

export async function checkHasToken(event_id: number, address: string): Promise<boolean> {
  const all_tokens = await getAllTokens(address);
  let token = all_tokens.find(token => token.event.id === event_id);
  return !!token;
}

export function signMessage(privateKey: string, params: TypedValue[]): string {
  // params = [ {type: "uint256", value: value}, ];
  const message = hash.keccak256(params);
  return sign(privateKey, message);
}

export function isEventEditable(eventDate: string): boolean {
  try {
    const _eventDate = new Date(eventDate)
    return isFuture(_eventDate) || differenceInDays(new Date(), _eventDate) < 30
  } catch (e) {
    return false
  }
}
