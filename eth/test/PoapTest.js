const { TestHelper } = require('zos');
const { Contracts, ZWeb3 } = require('zos-lib');
const expect = require('chai').expect;
const assert = require('chai').assert;

ZWeb3.initialize(web3.currentProvider);

const Poap = Contracts.getFromLocal('Poap');

// TODO Optimization: should specify that type of error is expected (revert, out of gas, etc.)
async function expectError(f) {
  let fail = true;
  try {
    await f();
  } catch (err) {
    fail = false;
  }
  if (fail) {
    expect.fail('Expecting async function to throw');
  }
}

contract('Poap', function() {
  let accounts;
  let owner;
  let admin;
  let proxy;
  let project;

  before(async function() {
    accounts = await web3.eth.getAccounts();
    owner = accounts[0];
    admin = accounts[9];
  });

  beforeEach(async function() {
    project = await TestHelper();
    proxy = await project.createProxy(Poap, {
      initMethod: 'initialize',
      initArgs: ['Poap', 'POAP', 'https://poap.xyz/', [admin]],
    });
  });

  describe('pause', function() {
    it('should start unpaused', async function() {
      expect(await proxy.methods.paused().call()).to.be.false;
    });

    it('should allow admin to pause it', async function() {
      await proxy.methods.pause().send({ from: admin });
      expect(await proxy.methods.paused().call()).to.be.true;
    });

    it('should NOT allow other users to pause it', async function() {
      await expectError(() => proxy.methods.pause().send({ from: accounts[1] }));
    });
  });

  describe('unpause', function() {
    beforeEach(async function() {
      await proxy.methods.pause().send({ from: admin });
    });

    it('should allow admin to unpause it', async function() {
      await proxy.methods.unpause().send({ from: admin });
      expect(await proxy.methods.paused().call()).to.be.false;
    });

    it('should NOT allow other users to unpause it', async function() {
      await expectError(() => proxy.methods.unpause().send({ from: accounts[1] }));
    });
  });

  describe('Roles', function() {
    it('should allow admin to add another admin', async function() {
      await proxy.methods.addAdmin(accounts[1]).send({ from: admin });
      expect(await proxy.methods.isAdmin(accounts[1]).call()).to.be.true;
    });

    it('should NOT allow other users to add another admin', async function() {
      await expectError(() => proxy.methods.addAdmin(accounts[2]).send({ from: accounts[1] }));
    });

    it('should allow admin to add an eventMinter', async function() {
      await proxy.methods.addEventMinter(55, accounts[1]).send({ from: admin });
      expect(await proxy.methods.isEventMinter(55, accounts[1]).call()).to.be.true;
      expect(await proxy.methods.isEventMinter(1, accounts[1]).call()).to.be.false;
    });

    it('should allow an eventMinter to add an eventMinter', async function() {
      await proxy.methods.addEventMinter(55, accounts[1]).send({ from: admin });
      await proxy.methods.addEventMinter(55, accounts[2]).send({ from: accounts[1] });

      expect(await proxy.methods.isEventMinter(55, accounts[2]).call()).to.be.true;
    });

    it('should NOT allow other users to add an eventMinter', async function() {
      await expectError(() =>
        proxy.methods.addEventMinter(55, accounts[2]).send({ from: accounts[1] })
      );
    });

    it("should allow an eventMinter to renounce it's role", async function() {
      await proxy.methods.addEventMinter(55, accounts[1]).send({ from: admin });
      await proxy.methods.renounceEventMinter(55).send({ from: accounts[1] });
      expect(await proxy.methods.isEventMinter(55, accounts[1]).call()).to.be.false;
    });

    it("should allow an admin to renounce it's role", async function() {
      await proxy.methods.renounceAdmin().send({ from: admin });
      expect(await proxy.methods.isAdmin(admin).call()).to.be.false;
    });

    describe('removeEventMinter', function() {
      beforeEach(async function() {
        await proxy.methods.addEventMinter(55, accounts[1]).send({ from: admin });
      });

      it('should allow admin to remove an eventMinter', async function() {
        await proxy.methods.removeEventMinter(55, accounts[1]).send({ from: admin });
        expect(await proxy.methods.isEventMinter(55, accounts[1]).call()).to.be.false;
      });

      it('should NOT allow other users to remove an eventMinter', async function() {
        await expectError(() =>
          proxy.methods.removeEventMinter(55, accounts[1]).send({ from: accounts[2] })
        );
      });

      it('should NOT allow other eventMinter to remove an eventMinter', async function() {
        await expectError(() =>
          proxy.methods.removeEventMinter(55, accounts[1]).send({ from: accounts[1] })
        );
      });
    });
  });

  // TODO Add test to setBaseURI function

  // TODO Add test to setApprovalForAll tokens

  // TODO Add test to transferFrom tokens

  describe('Token Minting', function() {

    describe('mintToken', function() {
      it('should NOT allow admin to mint token for address 0', async function() {
        try{
          const emptyAddress = '0x0000000000000000000000000000000000000000';
          await proxy.methods.mintToken(1, emptyAddress).send({from: owner, gas: 1000000});
        } catch (err) {
          return;
        }
        assert(false, 'token was minted for address 0');
      });

      it('should allow admin to mint token for a single user', async function() {
        let tokenOwner = accounts[1];
        let initialBalance = parseInt(await proxy.methods.balanceOf(tokenOwner).call());
        await proxy.methods.mintToken(1, tokenOwner).send({from: owner, gas: 1000000});
        let finalBalance = parseInt(await proxy.methods.balanceOf(tokenOwner).call());
        expect(finalBalance - initialBalance).to.eq(1);
      });
    });

    describe('mintUserToManyEvents', function() {
      it('should allow admin to mint multiple tokens for a single user', async function() {
        let tokenOwner = accounts[1];
        let eventIds = [100, 101, 102];
        let initialBalance = parseInt(await proxy.methods.balanceOf(tokenOwner).call());
        await proxy.methods.mintUserToManyEvents(eventIds, tokenOwner).send({from: owner, gas: 1000000});
        let finalBalance = parseInt(await proxy.methods.balanceOf(tokenOwner).call());
        expect(finalBalance - initialBalance).to.eq(eventIds.length);
      });
    });

    describe('mintEventToManyUsers', function() {
      it('should allow admin to mint same event token for multiple users', async function() {
        let tokenOwners = [accounts[1], accounts[2], accounts[3]];
        let eventId = 1;

        let initialBalances = await Promise.all(tokenOwners.map(async account => {
          return await proxy.methods.balanceOf(account).call()
        }));

        await proxy.methods.mintEventToManyUsers(eventId, tokenOwners).send({from: owner, gas: 1000000});

        let finalBalances = await Promise.all(tokenOwners.map(async account => {
          return await proxy.methods.balanceOf(account).call()
        }));

        tokenOwners.forEach((account, i) => {
          expect(parseInt(finalBalances[i]) - parseInt(initialBalances[i])).to.eq(1);
        });

      });
    });

    // TODO Test if EventMinter can mint token

    // TODO Test if can't mint when contract is paused

    describe('Integration tests', function() {
      it('should mint valid tokens using all minting methods consecutively', async function() {
        let tokenOwners = [accounts[1], accounts[2]];
        let eventIds = [100, 101, 102, 103, 104, 105];
        let tokensMinted = [];

        await proxy.methods.mintToken(eventIds[0], tokenOwners[0]).send({from: owner, gas: 1000000});
        tokensMinted.push(eventIds[0]);

        let eventGroup = [eventIds[1], eventIds[2]];
        await proxy.methods.mintUserToManyEvents(eventGroup, tokenOwners[0]).send({from: owner, gas: 1000000});
        eventGroup.forEach(event => tokensMinted.push(event));

        await proxy.methods.mintToken(eventIds[3], tokenOwners[0]).send({from: owner, gas: 1000000});
        tokensMinted.push(eventIds[3]);

        await proxy.methods.mintEventToManyUsers(eventIds[4], tokenOwners).send({from: owner, gas: 1000000});
        tokenOwners.forEach(() => tokensMinted.push(eventIds[4]));

        await proxy.methods.mintToken(eventIds[5], tokenOwners[0]).send({from: owner, gas: 1000000});
        tokensMinted.push(eventIds[5]);

        for (let i = 0; i < tokensMinted.length; i++) {
          let tokenEvent = await proxy.methods.tokenEvent(i+1).call();
          expect(tokenEvent).to.eq(tokensMinted[i].toString());
        }

        expect(await proxy.methods.tokenEvent(tokensMinted.length+1).call()).to.eq('0');

      });
    });
  });

  describe('Token Burning', function() {

    describe('burn', function() {
      it('should allow users to burn their own tokens', async function() {
        let alice = accounts[1];
        let eventId = 1;

        // Save initial token balance of Alice
        let initialBalance = parseInt(await proxy.methods.balanceOf(alice).call());

        // Mint one new token for the Alice
        let txInfo = await proxy.methods.mintToken(eventId, alice).send({from: admin, gas: 1000000});

        // Get new minted token id
        let mintedTokenId = txInfo.events.EventToken.returnValues.tokenId;

        // Burn minted token as Alice
        await proxy.methods.burn(mintedTokenId).send({from: alice, gas: 1000000});

        // Check that Alice has the same amount of tokens as started
        let finalBalance = parseInt(await proxy.methods.balanceOf(alice).call());
        expect(finalBalance).to.eq(initialBalance);
      });

      it('should NOT allow users to burn not owned or approved tokens', async function() {
        let alice = accounts[1];
        let bob = accounts[2];
        let eventId = 1;

        // Mint one new token for the Alice
        let txInfo = await proxy.methods.mintToken(eventId, alice).send({from: admin, gas: 1000000});

        // Get new minted token id
        let mintedTokenId = txInfo.events.EventToken.returnValues.tokenId;

        // Burn minted token as Bob
        try {
          await proxy.methods.burn(mintedTokenId).send({from: bob, gas: 1000000});
        } catch (err) {
          return;
        }
        assert(false, 'token was burned for a non owner or approved user');
      });

      it('should allow users to burn approved tokens', async function() {
        let alice = accounts[1];
        let charly = accounts[3];
        let eventId = 1;

        // Mint one new token for the Alice
        let txInfo = await proxy.methods.mintToken(eventId, alice).send({from: admin, gas: 1000000});

        // Get new minted token id
        let mintedTokenId = txInfo.events.EventToken.returnValues.tokenId;

        // Approve Charly to handle Alice minted token
        await proxy.methods.approve(charly, mintedTokenId).send({from: alice, gas: 1000000});

        // Burn Alice token as Charly (approved account)
        await proxy.methods.burn(mintedTokenId).send({from: charly, gas: 1000000});

        assert(true, 'token was burned from a approved user');
      });

      it('should allow admins to burn any tokens', async function() {
        let alice = accounts[1];
        let eventId = 1;

        // Save initial token balance of Alice
        let initialBalance = parseInt(await proxy.methods.balanceOf(alice).call());

        // Mint one new token for the Alice
        let txInfo = await proxy.methods.mintToken(eventId, alice).send({from: admin, gas: 1000000});

        // Get new minted token id
        let mintedTokenId = txInfo.events.EventToken.returnValues.tokenId;

        // Burn minted token as Admin
        await proxy.methods.burn(mintedTokenId).send({from: admin, gas: 1000000});

        // Check that Alice has the same amount of tokens as started
        let finalBalance = parseInt(await proxy.methods.balanceOf(alice).call());
        expect(finalBalance).to.eq(initialBalance);
      });

      it('should NOT allow event minters to burn any tokens', async function() {
        let alice = accounts[1];
        let dave = accounts[4];
        let eventId = 1;

        // Add Dave as event minter of token event
        await proxy.methods.addEventMinter(eventId, dave).send({ from: admin });

        // Mint one new token for the Alice
        let txInfo = await proxy.methods.mintToken(eventId, alice).send({from: admin, gas: 1000000});

        // Get new minted token id
        let mintedTokenId = txInfo.events.EventToken.returnValues.tokenId;

        // Burn minted token as Dave (event minter)
        try {
          await proxy.methods.burn(mintedTokenId).send({from: dave, gas: 1000000});
        } catch (err) {
          return;
        }
        assert(false, 'token was burned for a non owner or approved user');
      });
    });

    // TODO Test if can't burn when contract is paused
  });
});
