import {get} from 'lodash';
import {createSelector} from 'reselect';

const account = state => get(state, 'web3.account');
export const accountSelector = createSelector(account, (acct) => {return acct});

const tokenLoaded = state => get(state, 'token.loaded', false);
export const tokenLoadedSelector = createSelector(tokenLoaded, (tkn) => {return tkn});

const exchangeLoaded = state => get(state, 'exchange.loaded', false);
export const exchangeLoadedSelector = createSelector(exchangeLoaded, (exc) => {return exc});

export const contractsLoadedSelector = createSelector(
	tokenLoaded,
	exchangeLoaded,
	(tkn, exc) => (tkn && exc)
	)

