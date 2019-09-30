import { Provider, JsonRpcProvider } from 'ethers/providers';
import { Wallet, getDefaultProvider } from 'ethers';
import { Address } from '../types';

export interface EnvVariables {
  provider: Provider;
  poapAdmin: Wallet;
  poapAddress: Address;
  poapVoteAddress: Address;
  poapHelpers: PoapHelpers,
  secretKey: string
}

export interface PoapHelpers {
  [address: string]: Wallet
}

function getHelperWallets(provider: Provider) {
  let helpers: any = {}
  const helpersPK = ensureEnvVariable('POAP_HELPERS_PK')

  var jsonObj = JSON.parse(helpersPK)
  for (let item of jsonObj) {
    let wallet = new Wallet(item, provider);
    helpers[wallet.address.toLowerCase()] = new Wallet(item, provider);
  }
  return helpers
}

function getDevelopmentVariables(): EnvVariables {
  const provider: Provider = new JsonRpcProvider('http://localhost:9545');

  return {
    provider,
    poapAddress: '0xCfEB869F69431e42cdB54A4F4f105C19C080A601',
    poapVoteAddress: '0x9eeDe127d72fe7851CdB3182b0b21E883408EB46',
    poapAdmin: new Wallet(
      '4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
      provider
    ),
    poapHelpers: {
      '0xAa82FdE1a5266971b27f135d16d282fA20b84C94': new Wallet(
        '4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
        provider
      )
    },
    secretKey: '___poap_secret_key___'
  };
}

function ensureEnvVariable(name: string): string {
  if (!process.env[name]) {
    console.error(`ENV variable ${name} is required`);
    process.exit(1);
  }
  return process.env[name]!;
}

function getVariables(): EnvVariables {
  const network = ensureEnvVariable('ETH_NETWORK');
  // const ownerAddress = ensureEnvVariable('POAP_OWNER_ADDR')
  const ownerPK = ensureEnvVariable('POAP_OWNER_PK');

  const provider: Provider = getDefaultProvider(network);

  return {
    provider,
    poapAddress: ensureEnvVariable('POAP_CONTRACT_ADDR'),
    poapVoteAddress: ensureEnvVariable('POAP_VOTE_CONTRACT_ADDR'),
    poapAdmin: new Wallet(ownerPK, provider),
    poapHelpers: getHelperWallets(provider),
    secretKey: ensureEnvVariable('SECRET_KEY')
  };
}

const variables =
  process.env.NODE_ENV === 'development' ? getDevelopmentVariables() : getVariables();

export default function getEnv(): EnvVariables {
  return variables;
}
