import fetch from 'node-fetch';

export async function getEventTokenSupply(event: number): Promise<number> {
    const graphUrl = 'https://api.thegraph.com/subgraphs/name/amxx/poap'
    const query = `{"query":"{event(id: \\"${event}\\") {tokens(first: 1000, skip: 0) {owner {id}}}}","variables":null}`
    const response = await fetch(graphUrl, {
        method: 'post',
        body: query,
        headers: { 'Content-Type': 'application/json' },
    })
    const json = await response.json();
    if (json['data'] && json['data']['event'] && json['data']['event']['tokens']) {
        return json['data']['event']['tokens'].length
    }
    return 1
}
