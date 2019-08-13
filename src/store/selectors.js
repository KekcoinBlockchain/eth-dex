import {get} from 'lodash';
import {createSelector} from 'reselect';

const account = state => state.web3.account;
export const accountSelector = createSelector(account, acct => acct);