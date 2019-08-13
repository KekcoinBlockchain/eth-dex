import Web3 from 'web3';
import {
	web3Loaded
} from './actions';

export const loadWeb3 = (dispatch) => {
	const web3 = new Web3(Web3.givenProvider || 'http://localhost:7545');
	dispatch(web3Loaded(web3));
	return web3;
}
