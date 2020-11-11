import { GraphQLClient, gql } from 'graphql-request'
import { getEvent, getEvents } from '../db';
import { Address, Layer, TokenInfo } from '../types';
import getEnv from '../envs';


async function getTokenInfo(tokenId: string | number): Promise<TokenInfo> {
  const env = getEnv();
  const l1Subgraph = new GraphQLClient(env.l1_subgraph_url);
  const l2Subgraph = new GraphQLClient(env.l2_subgraph_url);

  const query = gql`
    {
      token (id: ${tokenId}) {
        id
        owner {
          id
        }
        event {
          id
        }
      }
    }
  `;
  let layer: Layer = Layer.layer1;
  let data = await l1Subgraph.request(query);
  if (data.token === null) {
      data = await l2Subgraph.request(query);
      layer = Layer.layer2;
  }
  const token = data.token;

  if(!token){
    throw new Error('Invalid Token');
  }

  const event = await getEvent(token.event.id);
  const owner = token.owner.id;
  if (!event) {
    throw new Error('Invalid Event Id');
  }
  return {
    event,
    tokenId: tokenId.toString(),
    owner,
    layer
  };
}


async function getAllTokens(address: Address): Promise<TokenInfo[]> {
  const env = getEnv()
  const l1Subgraph = new GraphQLClient(env.l1_subgraph_url)
  const l2Subgraph = new GraphQLClient(env.l2_subgraph_url)
  const events = await getEvents();
  const tokens: TokenInfo[] = []

  const getEvent = (id: number) => {
    const ev = events.find(e => e.id === id);
    if (!ev) {
      throw new Error(`Invalid EventId: ${id}`);
    }
    return ev;
  };

  const mapTokens = (query_tokens: []) => {
    query_tokens.forEach((token: {id: string, event: {id: string, token_count: number}}) => {
        const event = getEvent(Number.parseInt(token.event.id))
        event.supply = token.event.token_count
        // Check if the token is already in the array (prevents sending the same token two times)
        const token_in_array = tokens.find(array_token => {
          return array_token.tokenId === token.id.toString()
        });
        if(!token_in_array){
          tokens.push({
            event: event,
            tokenId: token.id.toString(),
            owner: address,
          });
        }
    });
  }

  const query = gql`
    {
      account (id: "${address.toLowerCase()}") {
        tokens {
          id
          event {
            id
            token_count
          }
        }
      }
    }
  `
  // Get the data from both subgraphs
  let l1Data = await l1Subgraph.request(query);
  let l2Data = await l2Subgraph.request(query);

  // Add the data to the tokens array
  if (l1Data.account) {
    mapTokens(l1Data.account.tokens);
  }
  if (l2Data.account) {
    mapTokens(l2Data.account.tokens);
  }

  return tokens.sort((a:any, b:any) => {
    try{
      return new Date(b.event.start_date) > new Date(a.event.start_date) ? 1 : -1
    } catch (e) {
      return -1
    }
  })
}

export default {
    getTokenInfo: getTokenInfo,
    getAllTokens: getAllTokens
}
