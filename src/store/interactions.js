import Web3 from 'web3';
import {
	web3Loaded,
	web3AccountLoaded,
	tokenLoaded,
	exchangeLoaded
} from './actions';
import Token from '../abis/Token.json';
import Exchange from '../abis/Exchange.json';

export const loadWeb3 = (dispatch) => {
	const web3 = new Web3(Web3.givenProvider || 'http://localhost:7545');
	dispatch(web3Loaded(web3));
	return web3;
}

export const loadAccount = async (web3, dispatch) => {
	const accounts = await web3.eth.getAccounts();
	const account = accounts;
	dispatch(web3AccountLoaded(account));
	return account;
}

export const loadToken = async (web3, networkID, dispatch) => {
	try {
		const tokenJSON = Token.abi;
		const tokenAddress = Token.networks[networkID].address;
		const token = web3.eth.Contract(tokenJSON, tokenAddress);
		dispatch(tokenLoaded(token));
		return token;
		}
	catch (error) 
		{
		window.alert('Token contract not deployed to the current network. Please select another network on Metamask.');
		return null;
		}
}

export const loadExchange = async (web3, networkID, dispatch) => {
	try {
		const exchangeJSON = Exchange.abi;
		const exchangeAddress = Exchange.networks[networkID].address;
		const exchange = web3.eth.Contract(exchangeJSON, exchangeAddress);
		dispatch(exchangeLoaded(exchange));
		return exchange;
		}
	catch (error) 
		{
		window.alert('Exchange contract not deployed to the current network. Please select another network on Metamask.');
		return null;
		}
}