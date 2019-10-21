import { Provider, InfuraProvider } from 'ethers/providers';
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

function getDevelopmentVariables(): EnvVariables {
  // const provider: Provider = new JsonRpcProvider('http://localhost:7545');
  const provider: Provider = new InfuraProvider('ropsten', 'cf7a7eed37254ec4b95670607e76a917');

  return {
    provider,
    poapAddress: '0xd237716b056d5BF44181c471A7c633583b552D78',
    poapVoteAddress: '0x9eeDe127d72fe7851CdB3182b0b21E883408EB46',
    poapAdmin: new Wallet(
      'CDF2DF30545E16094B4D62FA1624DE9A44432547CE3F582DE8F066C42ABBC4EE',
      provider
    ),
    poapHelpers: {
      '0xaa82fde1a5266971b27f135d16d282fa20b84c94':  new Wallet(
        'CDF2DF30545E16094B4D62FA1624DE9A44432547CE3F582DE8F066C42ABBC4EE',
        provider
      ),
      '0xb53f018321985a854a461c6657b37c42631eeec3': new Wallet(
        'A097135481DBEFF47A059E61F52996278601AFDD02DF128846974BD4F3BC9196',
        provider
      ),
      '0xac1e8dd98976ed63991f702869f0bb277b7f0c88': new Wallet(
        '4DB7E3CCB29E2603A7851279074E18B3F81C7F6A7E89AFEEF4D6875A9684A5CB',
        provider
      ),
      '0x8eb5e332f747163680a6d2d75fa003a8b85c6339': new Wallet(
        '91a300f7c58a482e267fbfb6f7d667211b2efc8d24b416744266242c928a60c1',
        provider
      ),
      '0xda21240a7b77f445cbd2d9fd10774d58383e5077': new Wallet(
        '5471646c1a2601c7fb2a3f1995cfe777b89959c1ed1e8aad1f892380f5e678c9',
        provider
      ),
      '0x8cbf1e60ddae47746cd386958b26f395dccf267d': new Wallet(
        '17554d8a4cd2bc2445fd41199c9af2a34918f4255ff9a189cdf7e15db33fa45b',
        provider
      ),
      '0xcdb80379a0023f3cb6eb56391d44734868ae175d': new Wallet(
        'F5E9D5B5C0FA30B2C3F3AFCCBEDD17330B7326ECEC8E4C103F59610BD8B1CBAC',
        provider
      ),
      '0x9fb8feaf56a96e2485e607c625dd5bb9490a01f3': new Wallet(
        '165c511b6e56691382c8f9092607e10158373234e17d95779fc8cb13dca5b54a',
        provider
      ),
      '0x85b03b941b6d8e0192dd238d13a0ed0606077db1': new Wallet(
        '31f626beea8955c71f58a58153611bba3eb4cd965a942ed9c87a8ffdf7920cc3',
        provider
      ),
      '0xd59353e0ef4e20d08b5c9bc2fe02f89dbb642634': new Wallet(
        'd8ce4ab70ca1a09a4af7f128e20d2de4d4b971ebb7eb1f1d770f7dd8be77b584',
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
