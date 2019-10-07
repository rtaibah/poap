/*

npx zos session --network local --from 0xAa82FdE1a5266971b27f135d16d282fA20b84C94 --expires 3600
zos push
zos create Poap --init initialize --args '"Poap","POAP","https://poap.xyz",[]'

 */
const Web3 = require('web3');
const abi = require('./build/contracts/Poap.json');

const web3 = new Web3('http://localhost:7545');
const contractAddress = '0xd237716b056d5BF44181c471A7c633583b552D78';

const contract = new web3.eth.Contract(abi.abi, contractAddress);
const events = [1, 2, 3, 4, 5, 6];
const addresses = [
  '0xAa82FdE1a5266971b27f135d16d282fA20b84C94',
  '0x903243D37d983796E1cEa26984568f60Bccf60Bc',
  '0x027B4E6d5F5603287fC7eD8759F83C494895b1Ff',
  '0xDc45d2A77028b714530E3D96E0F5b52bEB8d4Fe3',
  '0x10AA492A9C3CDeC6d910cCE9E52063838dd0630c',

  '0xC55E5DADfA858cA2048D5bB0b536F84913cF4f19', // Metamask
  '0xEeD5867f99f5F4e1888bA796c9Af12F401f671F1' // Metamask
];

web3.eth.getAccounts()
  .then(accounts => {
    const owner = accounts[0];
    // contract.methods.mintEventToManyUsers(events[0], addresses).send({from: owner, gas: 1000000});
    // contract.methods.mintUserToManyEvents(events, addresses[2]).send({from: owner, gas: 1000000});
    // contract.methods.mintUserToManyEvents(events, addresses[2]).send({from: owner, gas: 1000000});

    // contract.methods.mintUserToManyEvents(events, addresses[6]).send({from: owner, gas: 1000000});
  });

for (let address of addresses) {
  contract.methods.balanceOf(address).call().then(balance => {
    console.log(address, ' - ', balance);
  });
}