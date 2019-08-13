import {combineReducers} from 'redux';

function web3(state = {}, action) {
	switch (action.type) {
		case 'WEB3_LOADED':
			return {...state, connection: action.connection};
		default:
			return state;
	}
};

const rootReducer = combineReducers({
	web3: web3	// just 'web3' = es6 syntax
});

export default rootReducer;