import {etherAddressZero, etherToWei, tokensToWei, EVM_REVERT, INVALID_ADDRESS, INVALID_EXCHANGE} from './helpers.js'

const Exchange = artifacts.require('./Exchange') 
const Token = artifacts.require('./Token')

require('chai').use(require('chai-as-promised')).should()

contract('Exchange', ([deployer, feeReceiver, kinKendall, srinjoyChakravarty]) => {

	let exchange
	let token
	const makerFee = 1
	const takerFee = 2

	beforeEach(async() => {
		//Sets up exchange for all tests
		exchange = await Exchange.new(feeReceiver, makerFee, takerFee)
		//Sets up dexcoin as the sample erc20 token for all tests
		token = await Token.new()
		// Gives kin the maker some tokens to trade with on the exchange
		token.transfer(kinKendall, tokensToWei(25), {from: deployer})
	})

	describe('deployment', () => {

		it('tracks the fee receiver account', async() => {
			const feeAddress = await exchange.feeReceiver()
			feeAddress.should.equal(feeReceiver)
		})

		it('tracks the maker fee', async() => {
			const makerFee = await exchange.makerFee()
			makerFee.toString().should.equal('1')
		})

		it('tracks the taker fee', async() => {
			const takerFee = await exchange.takerFee()
			takerFee.toString().should.equal('2')
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
			args.maker.should.equal(kinKendall, "maker address logged doesn't match kinKendall address from ganache")
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
				args.maker.should.equal(kinKendall, "maker address logged doesn't match kinKendall address from ganache")
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
				let makerBalance
				
				// verifies token contract has record of exchange owning deposited tokens
				exchangeBalance = await token.balanceOf(exchange.address)
				exchangeBalance.toString().should.equal(testAmount.toString())
				
				// verifies exchange tracks number of a specific token designated to maker
				makerBalance = await exchange.tokens(token.address, kinKendall)
				makerBalance.toString().should.equal(testAmount.toString())

			})

			it('emits a deposit event', async() => {
				
				const log_object = exchangeDeposit.logs[0]
				log_object.event.should.equal("Deposit")

				const args = log_object.args
				args.token.should.equal(token.address, "token addresses don't match")
				args.maker.should.equal(kinKendall, "maker address logged doesn't match kinKendall address from ganache")
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
				args.maker.should.equal(kinKendall, "maker address logged doesn't match kinKendall address from ganache")
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

			it('returns maker ether balance', async() => {
				const makerEther = await exchange.balanceOf(etherAddressZero, kinKendall)
				makerEther.toString().should.equal(etherToWei(13).toString())
				const makerToken = await exchange.balanceOf(token.address, kinKendall)
				makerToken.toString().should.equal(etherToWei(15).toString())
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
			sampleOrder.maker.should.equal(kinKendall, 'maker does not match')
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
			args.maker.should.equal(kinKendall, 'maker does not match')
			args.tokenBuy.should.equal(token.address, 'token address does not match')
			args.tokenSell.should.equal(etherAddressZero, 'ether address does not match')
			args.amountBuy.toString().should.equal(tokensToWei(17).toString(), 'amountBuy does not match expected amount of tokens')
			args.amountSell.toString().should.equal(etherToWei(1).toString(), 'amountSell does not match expected amount of ether')
			args.timestamp.toString().length.should.be.at.least(1, 'timestamp is not present')
		})
	})

	describe('various order features', () => {

		beforeEach(async() => {

			// maker kinKendall deposits only ether on the exchange
			await exchange.depositEther({from: kinKendall, value: etherToWei(3)})

			// taker srinjoyChakravarty given some tokens to start with from dexcoin fund
			await token.transfer(srinjoyChakravarty, tokensToWei(33), {from: deployer})

			// taker srinjoyChakravarty approves only some tokens to the exchange
			await token.approve(exchange.address, tokensToWei(30), {from: srinjoyChakravarty})

			// taker srinjoyChakravarty deposits only some tokens on the exchange
			await exchange.depositToken(token.address, tokensToWei(27), {from: srinjoyChakravarty})

			// maker kinKendall makes an order to buy tokens using his ether previously deposited on the exchange
			await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(20), etherToWei(2), {from: kinKendall})
		})

		describe('filling orders', async() => {

			let filledOrder

			describe('successfully filled order', async() => {

				beforeEach(async() => {

					// taker srinjoyChakravarty fills order by accepting the ether price bid by maker kinKendall to buy some tokens
					filledOrder = await exchange.fillOrder('1', {from: srinjoyChakravarty})
				})

				it('executes the trade and charges taker fees successfully', async() => {
					
					let makerTokenBalance
					let takerEtherBalance
					let makerEtherBalance
					let takerTokenBalance
					let feesReceived
					let feesReceived2

					makerTokenBalance = await exchange.balanceOf(token.address, kinKendall)
					makerTokenBalance.toString().should.equal(tokensToWei(20).toString(), 'maker did not receive their tokens correctly')

					takerEtherBalance = await exchange.balanceOf(etherAddressZero, srinjoyChakravarty)
					takerEtherBalance.toString().should.equal(etherToWei(2).toString(), 'taker did not receive their ether correctly')

					// makerEtherBalance = await exchange.balanceOf(etherAddressZero, kinKendall)
					// makerEtherBalance.toString().should.equal(etherToWei(1), 'maker did not have their ether deducted accurately')

					takerTokenBalance = await exchange.balanceOf(token.address, srinjoyChakravarty)
					takerTokenBalance.toString().should.equal(tokensToWei(6.96).toString(), 'taker did not have their tokens deducted accurately with the fee applied')

					const feeReceiver = await exchange.feeReceiver()
					feesReceived = await exchange.balanceOf(token.address, feeReceiver)
					feesReceived.toString().should.equal(tokensToWei(0.04).toString(), 'taker fees accurately received by exchange for maintenance')
					feesReceived2 = await exchange.balanceOf(etherAddressZero, feeReceiver)
					feesReceived2.toString().should.equal(etherToWei(0.2).toString(), 'maker fees accurately received by exchange for maintenance')
				})

				it('updates state with all filled orders', async() => {
					
					const orderFilled = await exchange.ordersFilled(1)
					orderFilled.should.equal(true)
				})

				it('emits a trade event', async() => {
					
					const log_object = filledOrder.logs[0]
					log_object.event.should.equal("Trade")

					const args = log_object.args
					args.id.toString().should.equal('1', 'id does not match')
					args.maker.should.equal(kinKendall, 'maker does not match')
					args.taker.should.equal(srinjoyChakravarty, 'taker does not match')
					args.tokenBuy.should.equal(token.address, 'token address does not match')
					args.tokenSell.should.equal(etherAddressZero, 'ether address does not match')
					args.amountBuy.toString().should.equal(tokensToWei(20).toString(), 'amountBuy does not match expected amount of tokens')
					args.amountSell.toString().should.equal(etherToWei(2).toString(), 'amountSell does not match expected amount of ether')
					args.timestamp.toString().length.should.be.at.least(1, 'timestamp is not present')
				})
			})

			describe('failed filled order', async() => {

				it('rejects invalid order ids', async() => {
					
					const inappropriateOrderID = 3
					await exchange.fillOrder(inappropriateOrderID, {from: srinjoyChakravarty}).should.be.rejectedWith(EVM_REVERT) 
				})

				it('rejects already filled orders', async() => {
					
					await exchange.fillOrder('1', {from: srinjoyChakravarty}).should.be.fulfilled					// legitimately fills the order first time round
					await exchange.fillOrder('1', {from: srinjoyChakravarty}).should.be.rejectedWith(EVM_REVERT)	// rejects attempt to refill the same order
				})

				it('rejects previously cancelled orders', async() => {
					
					await exchange.cancelOrder('1', {from: kinKendall}).should.be.fulfilled							// maker changes their mind and cancels their initial order	
					await exchange.fillOrder('1', {from: srinjoyChakravarty}).should.be.rejectedWith(EVM_REVERT)	// rejects attempts to fill a cancelled order				
				})
			})
		})

		describe('cancelling orders', async() => {

			let cancelledOrder

			describe('successfully cancelled order', async() => {

				beforeEach(async() => {

					cancelledOrder = await exchange.cancelOrder('1', {from: kinKendall})
				})

				it('updates state with all cancelled orders', async() => {
					
					const cancellationSuccess = await exchange.ordersCancelled(1)
					cancellationSuccess.should.equal(true)
				})

				it('emits a cancellation event', async() => {
					
					const log_object = cancelledOrder.logs[0]
					log_object.event.should.equal("Cancelled")

					const args = log_object.args
					args.id.toString().should.equal('1', 'id does not match')
					args.maker.should.equal(kinKendall, 'maker does not match')
					args.tokenBuy.should.equal(token.address, 'token address does not match')
					args.tokenSell.should.equal(etherAddressZero, 'ether address does not match')
					args.amountBuy.toString().should.equal(tokensToWei(20).toString(), 'amountBuy does not match expected amount of tokens')
					args.amountSell.toString().should.equal(etherToWei(2).toString(), 'amountSell does not match expected amount of ether')
					args.timestamp.toString().length.should.be.at.least(1, 'timestamp is not present')
				})
			})

			describe('failed cancelled order', async() => {

				it('rejects invalid order ids', async() => {
					
					const invalidOrderID = 2
					await exchange.cancelOrder(invalidOrderID, {from: kinKendall}).should.be.rejectedWith(EVM_REVERT) 
				})

				it('rejects cancellation attemps of unauthorized orders', async() => {
					
					//valid order attempted to be cancelled by unauthorized maker
					await exchange.cancelOrder('1', {from: srinjoyChakravarty}).should.be.rejectedWith(EVM_REVERT)
				})
			})
		})
	})
})