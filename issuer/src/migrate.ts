import { Contract, getDefaultProvider } from 'ethers';
import * as csv from 'fast-csv';
import { join } from 'path';
import { concurrentMap } from './utils';
import { writeFileSync, readFileSync } from 'fs';
import { Addresss } from './types';
// import fetch from 'node-fetch';

function getOldContract() {
  const provider = getDefaultProvider('homestead');
  const ABI = ['function tokenURI(uint256 tokenId) view returns (string memory)'];
  const OldContractAddress = '0xa1eb40c284c5b44419425c4202fa8dabff31006b';
  const contract = new Contract(OldContractAddress, ABI, provider);
  return contract;
}

type TokenStruct = {
  id: string;
  owner: Addresss;
  eventId: string;
};

const URIPrefix = 'https://www.poap.xyz/events/jsons/'.length;
const URISuffix = '.json'.length;

const extractEventId = (tokenURI: string) => tokenURI.slice(URIPrefix, tokenURI.length - URISuffix);

function writeTokensJson(filepath: string, tokens: TokenStruct[]) {
  const content = JSON.stringify(tokens, null, 2);
  writeFileSync(filepath, content);
}

// @ts-ignore
function readTokensJson(filepath: string): TokenStruct[] {
  return JSON.parse(readFileSync(filepath).toString());
}

function readEherscanTXDump(txcsvPath: string): Promise<TokenStruct[]> {
  return new Promise<TokenStruct[]>((resolve, reject) => {
    const tokens = new Map<string, TokenStruct>();

    csv
      .fromPath(txcsvPath, { headers: true })
      .on('data', data => {
        tokens.set(data['Token_ID'], {
          id: data['Token_ID'],
          owner: data['To'],
          eventId: '',
        });
      })
      .on('end', () => {
        resolve(Array.from(tokens.values()));
      });
  });
}

function populateEventId(tokens: TokenStruct[]) {
  const contract = getOldContract();
  return concurrentMap(
    tokens,
    async (token: TokenStruct) => {
      const uri = await contract.functions.tokenURI(token.id);
      token.eventId = extractEventId(uri);
      return token;
    },
    { workers: 10 }
  );
}

// @ts-ignore
function groupByEvent(tokens: TokenStruct[]): Map<string, TokenStruct[]> {
  const eventTokens = new Map();
  for (const token of tokens) {
    if (!eventTokens.has(token.eventId)) {
      eventTokens.set(token.eventId, [token]);
    } else {
      eventTokens.get(token.eventId).push(token);
    }
  }
  return eventTokens;
}

export async function generateTokenJson(txcsvPath: string, tokenJsonPath: string) {
  let tokens = await readEherscanTXDump(txcsvPath);
  tokens = await populateEventId(tokens);

  console.log(`Found ${tokens.length} tokens`);
  writeTokensJson(tokenJsonPath, tokens);
}

export async function writeContract(tokenJsonPath: string, startIdx = 0) {
  const tokens = readTokensJson(tokenJsonPath).slice(startIdx);

  console.log('writing to bla bla', tokens.length);
}

function printHelpAndExit() {
  console.log('Bad Usage! Missing Command');
  console.log(`Usage: ${process.argv[0]} ${process.argv[1]} (tokenjson|writecontract)`);
  process.exit(1);
}

async function main() {
  const DumpsPath = join(__dirname, '../dumps/');

  if (process.argv.length < 3) {
    printHelpAndExit();
  }

  const command = process.argv[2];
  if (command == 'tokenjson') {
    await generateTokenJson(
      join(DumpsPath, 'etherscan-export.csv'),
      join(DumpsPath, 'tokens.json')
    );
  } else if (command == 'writecontract') {
    await writeContract(join(DumpsPath, 'tokens.json'));
  } else {
    printHelpAndExit();
  }
}

main().catch(err => {
  console.error('Failed', err);
  //   console.error(err);
});