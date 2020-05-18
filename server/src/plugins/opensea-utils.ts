import fetch from 'node-fetch';
import getEnv from '../envs';





export async function getAssets(ownerAddress: string): Promise<any[]> {
    const env = getEnv();
    const url = `https://api.opensea.io/api/v1/assets/?owner=${ownerAddress}&asset_contract_address=${env.poapAddress}`
    const response = await fetch(url);
    // console.log(response);
    const json = await response.json();
    const assets = json.assets;
    return assets;
}
