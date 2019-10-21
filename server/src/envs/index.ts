import { Provider, InfuraProvider, JsonRpcProvider } from 'ethers/providers';
import { Wallet, getDefaultProvider } from 'ethers';
import { Address } from '../types';

export interface EnvVariables {
  provider: Provider;
  poapAdmin: Wallet;
  poapAddress: Address;
  poapVoteAddress: Address;
  poapHelpers: PoapHelpers,
  secretKey: string;
}

export interface PoapHelpers {
  [address: string]: Wallet;
}

function getHelperWallets(provider: Provider) {
  let helpers: any = {}
  const helpersPK = ensureEnvVariable('POAP_HELPERS_PK')
  const ownerPK = ensureEnvVariable('POAP_OWNER_PK');

  // Add admin wallet as helper
  let admin_wallet = new Wallet(ownerPK, provider)
  helpers[admin_wallet.address.toLowerCase()] = new Wallet(ownerPK, provider);

  var jsonObj = JSON.parse(helpersPK);
  for (let item of jsonObj) {
    let wallet = new Wallet(item, provider);
    helpers[wallet.address.toLowerCase()] = new Wallet(item, provider);
  }
  return helpers;
}

function ensureEnvVariable(name: string): string {
  if (!process.env[name]) {
    console.error(`ENV variable ${name} is required`);
    process.exit(1);
  }
  return process.env[name]!;
}

export default function getEnv(): EnvVariables {
  let provider: Provider;
  let envProvider = ensureEnvVariable('PROVIDER');

  if(envProvider == 'infura') {
    const infuraNet = ensureEnvVariable('ETH_NETWORK');
    const infuraPK = ensureEnvVariable('INFURA_PK');
    provider = new InfuraProvider(infuraNet, infuraPK);

  } else if(envProvider == 'local') {
    provider = new JsonRpcProvider('http://localhost:7545');

  } else {
    const network = ensureEnvVariable('ETH_NETWORK');
    provider = getDefaultProvider(network);

  }

  const ownerPK = ensureEnvVariable('POAP_OWNER_PK');
  return {
    provider,
    poapAddress: ensureEnvVariable('POAP_CONTRACT_ADDR'),
    poapVoteAddress: ensureEnvVariable('POAP_VOTE_CONTRACT_ADDR'),
    poapAdmin: new Wallet(ownerPK, provider),
    poapHelpers: getHelperWallets(provider),
    secretKey: ensureEnvVariable('SECRET_KEY')
  };
}
