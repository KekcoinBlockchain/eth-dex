import {etherAddressZero, etherToWei, tokensToWei, EVM_REVERT, INVALID_ADDRESS, INVALID_EXCHANGE} from './helpers.js'

const Exchange = artifacts.require('./Exchange') 
const Token = artifacts.require('./Token')

require('chai').use(require('chai-as-promised')).should()

contract('Exchange', ([deployer, feeReceiver, kinKendall]) => {

	let exchange
	let token
	const exchangeCut = 4

	beforeEach(async() => {
		//Sets up exchange for all tests
		exchange = await Exchange.new(feeReceiver, exchangeCut)
		//Sets up dexcoin as the sample erc20 token for all tests
		token = await Token.new()
		// Gives kin the user some tokens to trade with on the exchange
		token.transfer(kinKendall, tokensToWei(25), {from: deployer})
	})

	describe('deployment', () => {

		it('tracks the fee receiver account', async() => {
			const feeAddress = await exchange.feeRecevier()
			feeAddress.should.equal(feeReceiver)
		})

		it('tracks the fee percentage', async() => {
			const feePercent = await exchange.feePercent()
			feePercent.toString().should.equal(exchangeCut.toString())
		})
	})

	describe('depositing ether', () => {

		let etherDeposit
		let etherAmount

		beforeEach(async() => {
			etherAmount = etherToWei(1)
			etherDeposit = await exchange.depositEther({from: kinKendall, value: etherAmount})
		})

		it('verifies the ether deposit', async() => {
			const etherBalance = await exchange.tokens(etherAddressZero, kinKendall)
			etherBalance.toString().should.equal(etherAmount.toString())
		})

		it('emits a deposit event', async() => {
			
			const log_object = etherDeposit.logs[0]
			log_object.event.should.equal("Deposit")

			const args = log_object.args
			args.token.should.equal(etherAddressZero, "token addresses don't match")
			args.user.should.equal(kinKendall, "user address logged doesn't match kinKendall address from ganache")
			args.amount.toString().should.equal(etherToWei(1).toString(), "amount logged does not match testAmount")
			args.balance.toString().should.equal(etherToWei(1).toString(), "balance logged does not meet what's expected")	
		})
	})

	describe('withdrawing ether', () => {

		let etherWithdrawal
		let etherQuantity

		beforeEach(async() => {
			// Deposit 3 ether first before test
			etherQuantity = etherToWei(3)
			await exchange.depositEther({from: kinKendall, value: etherQuantity})
		})

		describe('successful withdrawal', async() => {
			
			beforeEach(async() => {
				// Withdraw 3 out 3 ethers
				etherWithdrawal = await exchange.withdrawEther(etherQuantity, {from: kinKendall})
			})

			it('withdraws correct amount of funds in ether', async() => {
				const etherBalance = await exchange.tokens(etherAddressZero, kinKendall)
				etherBalance.toString().should.equal('0')
			})

			it('emits a withdrawal event', async() => {
				
				const log_object = etherWithdrawal.logs[0]
				log_object.event.should.equal("Withdraw")

				const args = log_object.args
				args.token.should.equal(etherAddressZero, "token addresses don't match")
				args.user.should.equal(kinKendall, "user address logged doesn't match kinKendall address from ganache")
				args.amount.toString().should.equal(etherToWei(3).toString(), "amount logged does not match expected value")
				args.balance.toString().should.equal('0', "balance logged does not meet what's expected")	
			})

		})

		describe('failed withdrawal', async() => {			

			it('rejects overdraft withdraws with insufficient balances', async() => {
				await exchange.withdrawEther(etherToWei(4), {from: kinKendall}).should.be.rejectedWith(EVM_REVERT)
			})
		})
	})

	describe('depositing tokens', () => {

		let exchangeDeposit
		let testAmount

		describe('successful deposit', () => {
		
		beforeEach(async() => {
			testAmount = tokensToWei(7)
			await token.approve(exchange.address, testAmount, {from: kinKendall})
			exchangeDeposit = await exchange.depositToken(token.address, testAmount, {from: kinKendall})
		})

			it('verifies the token deposit', async() => {
				// Checks token balance on exchange
				let exchangeBalance
				let userBalance
				
				// verifies token contract has record of exchange owning deposited tokens
				exchangeBalance = await token.balanceOf(exchange.address)
				exchangeBalance.toString().should.equal(testAmount.toString())
				
				// verifies exchange tracks number of a specific token designated to user
				userBalance = await exchange.tokens(token.address, kinKendall)
				userBalance.toString().should.equal(testAmount.toString())

			})

			it('emits a deposit event', async() => {
				
				const log_object = exchangeDeposit.logs[0]
				log_object.event.should.equal("Deposit")

				const args = log_object.args
				args.token.should.equal(token.address, "token addresses don't match")
				args.user.should.equal(kinKendall, "user address logged doesn't match kinKendall address from ganache")
				args.amount.toString().should.equal(tokensToWei(7).toString(), "amount logged does not match testAmount")
				args.balance.toString().should.equal(tokensToWei(7).toString(), "balance logged does not meet what's expected")	
			})
		})

		describe('failed deposit', () => {

			it('when exchange has insufficient tokens approved for transferring', async() => {
				// Exchange not approved for any tokens in this code path
				await exchange.depositToken(token.address, testAmount, {from: kinKendall}).should.be.rejectedWith(EVM_REVERT)
			})

			it('rejects native ether deposits', async() => {
				// Exchange does not allow depositToken function to be used to deposit native ether even when approved
				await exchange.depositToken(etherAddressZero, testAmount, {from: kinKendall}).should.be.rejectedWith(EVM_REVERT)
			})


		})
	})

	describe('withdrawing tokens', () => {

		let exchangeWithdraw
		let trialAmount

		describe('successful withdraw', () => {
		
			beforeEach(async() => {
				
				// approves and deposits tokens to test withdrawal
				trialAmount = tokensToWei(9)
				await token.approve(exchange.address, trialAmount, {from: kinKendall})
				await exchange.depositToken(token.address, trialAmount, {from: kinKendall})

				// test withdrawal function
				exchangeWithdraw = await exchange.withdrawToken(token.address, trialAmount, {from: kinKendall})
			})

			it('withdraws tokens accurately', async() => {

				const accountBalance = await exchange.tokens(token.address, kinKendall)
				accountBalance.toString().should.equal('0')
			})

			it('emits a withdraw event', async() => {
				
				const log_object = exchangeWithdraw.logs[0]
				log_object.event.should.equal("Withdraw")

				const args = log_object.args
				args.token.should.equal(token.address, "token addresses don't match")
				args.user.should.equal(kinKendall, "user address logged doesn't match kinKendall address from ganache")
				args.amount.toString().should.equal(tokensToWei(9).toString(), "amount logged does not match testAmount")
				args.balance.toString().should.equal(('0'), "balance logged does not meet what's expected")	
			})
		})

		describe('failed withdrawal', () => {

			it('rejects inappropriate ether withdrawal attempts', async() => {

				await exchange.withdrawToken(etherAddressZero, tokensToWei(4), {from: kinKendall}).should.be.rejectedWith(EVM_REVERT)
			})

			it('rejects excessive withdrawal amount', async() => {

				await exchange.withdrawToken(token.address, tokensToWei(10), {from: kinKendall}).should.be.rejectedWith(EVM_REVERT)
			})
		})

		describe('checking balances', () => {

			beforeEach(async() => {
				exchange.depositEther({from: kinKendall, value: etherToWei(13)})							// deposit 13 ether from kin to exchange
				await token.approve(exchange.address, tokensToWei(15), {from: kinKendall})					// approve 15 tokens from kin to exchange
				await exchange.depositToken(token.address, tokensToWei(15), {from: kinKendall})				// deposit 15 tokens from kin to exchange
			})

			it('returns user ether balance', async() => {
				const userEther = await exchange.balanceOf(etherAddressZero, kinKendall)
				userEther.toString().should.equal(etherToWei(13).toString())
				const userToken = await exchange.balanceOf(token.address, kinKendall)
				userToken.toString().should.equal(etherToWei(15).toString())
			})
		})			
	})

	describe('making orders', () => {

		let newOrder

		beforeEach(async() => {
			newOrder = await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(17), etherToWei(1), {from: kinKendall})
		})

		it('registers the newly made order', async() => {
			
			const nonce = await exchange.orderNonce()
			nonce.toString().should.equal('1')

			const sampleOrder = await exchange.orders('1')
			sampleOrder.id.toString().should.equal('1', 'id does not match')
			sampleOrder.user.should.equal(kinKendall, 'user does not match')
			sampleOrder.tokenBuy.should.equal(token.address, 'token address does not match')
			sampleOrder.tokenSell.should.equal(etherAddressZero, 'ether address does not match')
			sampleOrder.amountBuy.toString().should.equal(tokensToWei(17).toString(), 'amountBuy does not match expected amount of tokens')
			sampleOrder.amountSell.toString().should.equal(etherToWei(1).toString(), 'amountSell does not match expected amount of ether')
			sampleOrder.timestamp.toString().length.should.be.at.least(1, 'timestamp is not present')
		})

		it('emits an order event', async() => {
			
			const log_object = newOrder.logs[0]
			log_object.event.should.equal("Order")

			const args = log_object.args
			args.id.toString().should.equal('1', 'id does not match')
			args.user.should.equal(kinKendall, 'user does not match')
			args.tokenBuy.should.equal(token.address, 'token address does not match')
			args.tokenSell.should.equal(etherAddressZero, 'ether address does not match')
			args.amountBuy.toString().should.equal(tokensToWei(17).toString(), 'amountBuy does not match expected amount of tokens')
			args.amountSell.toString().should.equal(etherToWei(1).toString(), 'amountSell does not match expected amount of ether')
			args.timestamp.toString().length.should.be.at.least(1, 'timestamp is not present')
		})
	})
})