const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer) {

	const accounts = await web3.eth.getAccounts();

	await deployer.deploy(Token);

	const feeReceiver = accounts[2];
	const makerFee = 1;
	const takerFee = 2;

	await deployer.deploy(Exchange, feeReceiver, makerFee, takerFee);
};
