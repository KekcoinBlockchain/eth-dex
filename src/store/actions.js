// action to load 'WEB3'
export function web3Loaded(connection) {
	return {
		type: 'WEB3_LOADED',
		connection: connection
	}
}

// action to load 'WEB3_ACCOUNT'
export function web3AccountLoaded(account) {
  return {
    type: 'WEB3_ACCOUNT_LOADED',
    account: account
  }
}

// action to load 'TOKEN'
export function tokenLoaded(contract) {
  return {
    type: 'TOKEN_LOADED',
    contract: contract
  }
}

// action to load 'EXCHANGE'
export function exchangeLoaded(contract) {
  return {
    type: 'EXCHANGE_LOADED',
    contract: contract
  }
}