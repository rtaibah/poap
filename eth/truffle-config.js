const HDWalletProvider = require('truffle-hdwallet-provider');

module.exports = {
  networks: {
    local: {
      host: 'localhost',
      port: 9545,
      gas: 5000000,
      gasPrice: 5e9,
      network_id: '*',
    },
    ropsten: {
      // address: 0x79A560De1CD436d1D69896DDd8DcCb226f9Fa2fD
      provider: function() {
        if (!process.env.POAP_ROPSTEN_PK) {
          console.error('POAP_ROPSTEN_PK env variable is needed');
          process.abort();
        }
        return new HDWalletProvider(
          process.env.POAP_ROPSTEN_PK,
          'https://ropsten.infura.io/v3/cf7a7eed37254ec4b95670607e76a917'
        );
      },
      gas: 5000000,
      gasPrice: 5e9,
      network_id: 3,
    },
    kovan: {
      // address: 0xd237716b056d5BF44181c471A7c633583b552D78
      provider: function() {
        if (!process.env.POAP_KOVAN_PK) {
          console.error('POAP_KOVAN_PK env variable is needed');
          process.abort();
        }
        return new HDWalletProvider(
          process.env.POAP_ROPSTEN_PK,
          'https://kovan.infura.io/v3/cf7a7eed37254ec4b95670607e76a917'
        );
      },
      gas: 5000000,
      gasPrice: 5e9,
      network_id: 3,
    },
    sokol: {
      // address: 0xe583f95bF95d0883F94EfE844442C8bfc9dd7A7F
      provider: function() {
        if (!process.env.POAP_SOKOL_PK) {
          console.error('POAP_SOKOL_PK env variable is needed');
          process.abort();
        }
        return new HDWalletProvider(
          process.env.POAP_SOKOL_PK,
          "https://sokol.poa.network"
        );
      },
      gas: 5000000,
      gasPrice: 5e9,
      network_id: 77,
    },
    xdai: {
      // address: 0xe583f95bF95d0883F94EfE844442C8bfc9dd7A7F
      provider: function() {
        if (!process.env.POAP_XDAI_PK) {
          console.error('POAP_XDAI_PK env variable is needed');
          process.abort();
        }
        return new HDWalletProvider(
          process.env.POAP_XDAI_PK,
          "https://dai.poa.network"
        );
      },
      gas: 5000000,
      gasPrice: 5e9,
      network_id: 100,
    },
    mainnet: {
      // address: 0xe583f95bF95d0883F94EfE844442C8bfc9dd7A7F
      provider: function() {
        if (!process.env.POAP_MAIN_PK) {
          console.error('POAP_MAIN_PK env variable is needed');
          process.abort();
        }
        return new HDWalletProvider(
          process.env.POAP_MAIN_PK,
          'https://mainnet.infura.io/v3/cf7a7eed37254ec4b95670607e76a917'
        );
      },
      gas: 5000000,
      gasPrice: 5e9, // 5 gwei (check https://ethgasstation.info/)
      network_id: 1,
    },
  },
};
