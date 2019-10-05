const ethers = require('ethers');
const artifact = require('../build/contracts/Poap.json');

const provider = new ethers.providers.InfuraProvider('ropsten', 'cf7a7eed37254ec4b95670607e76a917');
const wallet = new ethers.Wallet('CDF2DF30545E16094B4D62FA1624DE9A44432547CE3F582DE8F066C42ABBC4EE',  provider);

const contract = new ethers.Contract('0xd237716b056d5BF44181c471A7c633583b552D78', artifact.abi, wallet);

const addressList = [
    '0xB53f018321985a854A461C6657b37C42631eeeC3',
    '0xaC1E8dD98976ed63991F702869F0bb277b7f0C88',
    '0x8Eb5E332F747163680A6D2D75FA003a8B85C6339',
    '0xDa21240A7b77F445cBD2d9fD10774D58383e5077',
    '0x8cBF1E60DdaE47746CD386958B26F395dcCF267D',
    '0xCdb80379A0023f3cb6EB56391d44734868Ae175d',
    '0x9fB8feAf56a96E2485e607c625dd5bB9490A01f3',
    '0x85B03B941b6d8E0192Dd238d13A0ed0606077Db1',
    '0xd59353e0eF4e20D08B5c9bc2fe02F89DBb642634'
]

async function addAdmin(addressList) {
    for (let address of addressList) {
        const tx = await contract.functions.addAdmin(address, {gasPrice: 27000000000, gasLimit: 750000});
        await tx.wait();
        console.log(tx);
    }    
}

addAdmin(addressList);
