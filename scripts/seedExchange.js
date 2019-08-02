// Initialize Contracts
const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

// Helper Utilities
const etherAddressZero = '0x0000000000000000000000000000000000000000';							// ether token deposit address
const etherToWei = (n) => { return new web3.utils.BN(web3.utils.toWei(n.toString(), 'ether'))}	// format standard for ether
const tokensToWei = (n) => etherToWei(n)														// erc20 tokens follow same format as etherToWei
const wait = (seconds) => {
							const milliseconds = seconds*1000;
							return new Promise(resolve => setTimeout(resolve, milliseconds));
							};

module.exports = async function(callback) {
	try{
		console.log("seeding exchange...");

		// Fetch unlocked accounts from wallet 
		const accounts = await web3.eth.getAccounts();

		// Fetch the deployed token
		const token = await Token.deployed();
		console.log('Fetched Token Address: ', token.address);

		// Fetch the deployed exchange
		const exchange = await Exchange.deployed();
		console.log('Fetched Exchange Address: ', exchange.address);
		
		const sender_kin = accounts[0];
		const receiver_srinjoy = accounts[1];

		let amount = web3.utils.toWei('10000', 'ether'); 

		// Give 10,000 tokens from deployed by default on account[0] to account[1]
		await token.transfer(receiver_srinjoy, amount, {from: sender_kin});
		console.log(`Transferred ${amount} tokens from ${sender_kin} to ${receiver_srinjoy}`);

		// sender_kin deposits ether
		const deposit_ether = 2;
		await exchange.depositEther({from: sender_kin, value: etherToWei(deposit_ether)});
		console.log(`Deposited ${deposit_ether} ether from ${sender_kin}`);

		// receiver_srinjoy approves 10,000 tokens to exchange
		const approved_tokens = 10000;
		await token.approve(exchange.address, tokensToWei(approved_tokens), {from: receiver_srinjoy});
		console.log(`Approved ${approved_tokens} tokens by ${receiver_srinjoy} for the exchange`);

		// receiver_srinjoy deposits 10,000 tokens on exchange
		await exchange.depositToken(token.address, tokensToWei(approved_tokens), {from: receiver_srinjoy});
		console.log(`Deposited ${approved_tokens} tokens frmo ${receiver_srinjoy}`);

		// Seed cancelled orders
		console.log("seeding cancelled orders...");

		// sender_kin makes an order to get tokens with great hope
		const result1 = await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(100), etherToWei(0.1), {from: sender_kin});
		const amountBuy_1 = result1.logs[0].args.amountBuy;
		const amountSell_1 = result1.logs[0].args.amountSell;	
		console.log(`Made an order from ${sender_kin} to buy ${amountBuy_1} tokens for ${amountSell_1} ether`);

		// unfortunately sender_kin is whimsical and changes his mind
		const orderID_1 = result1.logs[0].args.id;
		await exchange.cancelOrder(orderID_1, {from: sender_kin});
		console.log(`Cancelled order ${orderID_1} from ${sender_kin} of 100 tokens for 0.1 ether`);

		// Seed filled orders
		console.log("seeding filled orders...");

		// sender_kin makes order 2
		const result2 = await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(90), etherToWei(0.09), {from: sender_kin});
		const amountBuy_2 = result2.logs[0].args.amountBuy;
		const amountSell_2 = result2.logs[0].args.amountSell;	
		console.log(`Made an order from ${sender_kin} to buy ${amountBuy_2} tokens for ${amountSell_2} ether`);

		// receiver_srinjoy fills order 2
		const orderID_2 = result2.logs[0].args.id;
		await exchange.fillOrder(orderID_2, {from: receiver_srinjoy});
		console.log(`${receiver_srinjoy} filled an order to buy ${amountBuy_2} tokens for ${amountSell_2} ether from ${sender_kin}`);

		// wait 1 second
		console.log("waiting 2 seconds to prevent timestamp collisions...");
		await wait(2);

		// sender_kin makes order 3
		const result3 = await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(50), etherToWei(0.05), {from: sender_kin});
		const amountBuy_3 = result3.logs[0].args.amountBuy;
		const amountSell_3 = result3.logs[0].args.amountSell;
		console.log(`Made an order from ${sender_kin} to buy ${amountBuy_3} tokens for ${amountSell_3} ether`);

		// receiver_srinjoy fills order 3
		const orderID_3 = result3.logs[0].args.id;
		await exchange.fillOrder(orderID_3, {from: receiver_srinjoy});
		console.log(`${receiver_srinjoy} filled an order to buy ${amountBuy_3} tokens for ${amountSell_3} ether from ${sender_kin}`);

		// wait 1 second
		console.log("waiting 2 seconds to prevent timestamp collisions...");
		await wait(2);

		// sender_kin makes order 4
		const result4 = await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(20), etherToWei(0.15), {from: sender_kin});
		const amountBuy_4 = result4.logs[0].args.amountBuy;
		const amountSell_4 = result4.logs[0].args.amountSell;
		console.log(`Made an order from ${sender_kin} to buy ${amountBuy_4} tokens for ${amountSell_4} ether`);

		// receiver_srinjoy fills order 4
		const orderID_4 = result4.logs[0].args.id;
		await exchange.fillOrder(orderID_4, {from: receiver_srinjoy});
		console.log(`${receiver_srinjoy} filled an order to buy ${amountBuy_4} tokens for ${amountSell_4} ether from ${sender_kin}`);

		// wait 1 second
		console.log("waiting 2 seconds to prevent timestamp collisions...");
		await wait(2);

		// Seed open orders
		console.log("seeding open orders...");

		// sender_kin makes 10 orders
		console.log("generating 10 orders from sender_kin");

		for (let i = 1; i <= 10; i++) {
			var iter_result = await exchange.makeOrder(token.address, etherAddressZero, tokensToWei(10*i), etherToWei(0.01*i), {from: sender_kin});
			var iter_orderID = iter_result.logs[0].args.id;
			var iter_amountBuy = iter_result.logs[0].args.amountBuy;
			var iter_amountSell = iter_result.logs[0].args.amountSell;
			console.log(`Made order ${iter_orderID} to buy ${iter_amountBuy} tokens for ${iter_amountSell} ether from ${sender_kin}`);
			console.log("waiting 2 seconds to prevent timestamp collisions...");
			await wait(2);
		};

		// receiver_srinjoy makes 10 orders
		console.log("generating 10 orders from receiver_srinjoy");
		
		for (let i = 1; i <= 10; i++) {
			var iter_result = await exchange.makeOrder(etherAddressZero, token.address, etherToWei(0.01*i), tokensToWei(10*i), {from: receiver_srinjoy});
			var iter_orderID = iter_result.logs[0].args.id;
			var iter_amountBuy = iter_result.logs[0].args.amountBuy;
			var iter_amountSell = iter_result.logs[0].args.amountSell;
			console.log(`Made order ${iter_orderID} to buy ${iter_amountBuy} ether for ${iter_amountSell} tokens from ${sender_kin}`);
			console.log("waiting 2 seconds to prevent timestamp collisions...");
			await wait(2);
		};
	}
	catch(error) {
		console.log(error);
	}
	callback()
}